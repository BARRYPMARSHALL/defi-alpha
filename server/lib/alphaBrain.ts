import OpenAI from "openai";
import type { PoolWithScore, PoolsResponse } from "@shared/schema";
import { getCachedData } from "./defillama";
import { filterAndSortPools, formatPoolForResponse, type RecommendedPool } from "./filters";
import { storage } from "../storage";

/**
 * Alpha Brain — the AI DeFi advisor.
 *
 * Two modes:
 *  1. LLM mode (default when OPENAI_API_KEY is set): streams the live pool
 *     dataset into a system prompt and lets the model reason over it.
 *     OpenAI-compatible endpoints are supported — set OPENAI_BASE_URL to
 *     point at DeepSeek (https://api.deepseek.com) or any compatible host.
 *  2. Fallback mode (no key): a rule-based local advisor that answers with
 *     real, current data from the cache so the feature never dead-ends.
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL || "deepseek-chat";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.deepseek.com";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: OPENAI_BASE_URL });
}

export function isLlmConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function buildContext(allPools: PoolWithScore[]): string {
  const topPools = [...allPools]
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .slice(0, 25);

  const lines = topPools.map((p, i) => {
    const ac = p.isBeefy ? "Beefy" : (p.autoCompoundProject || "no");
    return `${i + 1}. ${p.symbol} | ${p.project} | ${p.chain} | APY ${p.apy.toFixed(2)}% | TVL $${Math.round(p.tvlUsd).toLocaleString()} | IL ${p.ilRisk} | autoCompound: ${ac} | score ${p.riskAdjustedScore.toFixed(1)}`;
  });

  const stats = allPools.length
    ? `We currently track ${allPools.length} yield pools.`
    : "Pool data is still loading.";

  return [
    stats,
    "Top opportunities by risk-adjusted score right now:",
    ...lines,
  ].join("\n");
}

function buildSystemPrompt(): string {
  return [
    "You are Alpha Brain, the AI yield advisor for DeFi Alpha — a real-time risk-adjusted DeFi yield optimizer.",
    "You give concise, concrete, actionable answers about yield farming, liquidity provision, impermanent loss, and the live opportunities in the dataset below.",
    "Rules:",
    "- Base every recommendation on the LIVE data provided. Never invent pools, APYs, or TVL figures.",
    "- If the user asks about stablecoins, mention stablecoin pools and their IL characteristics.",
    "- Flag high APYs (>100%) as risky and recommend verifying reward token sustainability.",
    "- Mention auto-compounding (Beefy etc.) when relevant.",
    "- Keep answers under ~150 words unless the user asks for detail.",
    "- This is educational, not financial advice. One-line disclaimer at the end when giving specific picks.",
    "",
    "LIVE DATA:",
    buildContext(getCachedData()?.pools || []),
  ].join("\n");
}

export interface ChatResult {
  mode: "llm" | "local";
  reply: string;
}

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * LLM-as-explainer: the deterministic engine has already computed the picks
 * from LIVE data. The model's only job is to explain those exact picks in
 * natural language — it is explicitly forbidden from inventing alternatives.
 */
async function llmExplain(userMessage: string, engineAnswer: string, history: HistoryMessage[]): Promise<string> {
  const client = getClient()!;
  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content: [
          "You are Alpha Brain's explanation layer in DeFi Alpha.",
          "Below is the DETERMINISTIC answer computed from live DeFiLlama data. It is 100% factual — every pool, APY and TVL in it is real and current.",
          "Your ONLY job: restate/explain it in clear, natural, concise language (under ~180 words).",
          "STRICT RULES:",
          "- Do NOT add, remove or invent pools, APYs, TVL figures, chains or risks.",
          "- Do NOT claim a pool is 'good' or 'bad' — describe what the data shows and note risks already flagged.",
          "- If the engine answer says no matches, say so plainly and suggest how to broaden the search.",
          "- End with one line: 'Data from live DeFiLlama feeds — not financial advice.'",
        ].join("\n"),
      },
      ...history.slice(-8),
      { role: "user", content: `QUESTION: ${userMessage}\n\nENGINE ANSWER (ground truth):\n${engineAnswer}` },
    ],
    temperature: 0.3,
    max_tokens: 500,
  });
  return completion.choices[0]?.message?.content || engineAnswer;
}

function pickPoolsForQuery(allPools: PoolWithScore[], query: string): PoolWithScore[] {
  const q = query.toLowerCase();

  // Cheap, deterministic local reasoning over the live dataset.
  let candidates = [...allPools];

  const CHAIN_PATTERNS: { chain: string; rx: RegExp }[] = [
    { chain: "ethereum", rx: /eth|ethereum/ },
    { chain: "arbitrum", rx: /arbitrum|arb/ },
    { chain: "bsc", rx: /bsc|binance/ },
    { chain: "optimism", rx: /optimism|op\b/ },
    { chain: "base", rx: /\bbase\b/ },
    { chain: "polygon", rx: /polygon|matic/ },
    { chain: "avalanche", rx: /avax|avalanche/ },
    { chain: "solana", rx: /solana|sol/ },
  ];

  const chainMatch = CHAIN_PATTERNS.find(({ rx }) => rx.test(q))?.chain;
  if (chainMatch) {
    candidates = candidates.filter(p => p.chain.toLowerCase().includes(chainMatch));
  }

  if (q.includes("stable") || q.includes("stablecoin")) {
    candidates = candidates.filter(p => p.stablecoin);
  }

  if (q.includes("auto") || q.includes("compound")) {
    candidates = candidates.filter(p => p.autoCompound);
  }

  if (q.includes("beefy")) {
    candidates = candidates.filter(p => p.isBeefy || p.beefyAvailable);
  }

  if (q.includes("low il") || q.includes("low risk") || q.includes("safe")) {
    candidates = candidates.filter(p => p.ilRisk === "none" || p.ilRisk === "low");
  }

  if (q.includes("high apy") || q.includes("best yield")) {
    candidates = candidates.filter(p => p.apy >= 20);
  }

  // Specific pool/project search: exact-ish token or protocol match wins
  // (e.g. "USDC on Aave", "Beefy vault", "Pendle"). This is how users find a
  // known pool fast — deterministic, data-first.
  const symbolTokens = q.match(/[a-z0-9-]{2,}/g) || [];
  const meaningful = symbolTokens.filter(t =>
    !["the", "pool", "find", "show", "what", "best", "top", "apy", "for", "with", "and", "on", "in", "yield", "pools", "vault", "vaults"].includes(t)
  );
  if (meaningful.length > 0 && (q.includes("pool") || q.includes("find") || q.includes("show") || q.includes("search"))) {
    const tokenMatch = candidates.filter(p => {
      const text = `${p.symbol} ${p.project} ${p.chain}`.toLowerCase();
      return meaningful.every(t => text.includes(t));
    });
    if (tokenMatch.length > 0) {
      return tokenMatch.sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore).slice(0, 3);
    }
  }

  return candidates
    .sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore)
    .slice(0, 3);
}

function formatPicks(picks: RecommendedPool[]): string {
  return picks.map((p, i) =>
    `${i + 1}. **${p.pool}** — ${p.apy} APY (base ${p.apyBase}, reward ${p.apyReward}) · TVL ${p.tvl} · ${p.risk}\n   ${p.proTip}${p.cefiComparison ? ` · ${p.cefiComparison}` : ""}${p.apyWarning ? ` ⚠️ ${p.apyWarning}` : ""}`
  ).join("\n\n");
}

function localReply(userMessage: string, allPools: PoolWithScore[]): string {
  const q = userMessage.toLowerCase().trim();

  if (!allPools.length) {
    return "Pool data is still loading — ask me again in a moment and I'll have live opportunities for you.";
  }

  const stats = getCachedData()?.stats;
  const summary = stats
    ? `Right now I'm tracking **${stats.totalPools.toLocaleString()} pools** across **${getCachedData()?.chains.length || 0} chains** (top chain: ${stats.topChain}, ${stats.avgApy.toFixed(1)}% average APY).`
    : "";

  if (q.includes("hello") || q.includes("hi ") || q === "hi" || q === "hey" || q.includes("who are you")) {
    return `${summary}\n\nI'm **Alpha Brain** — your real-time DeFi yield advisor. Ask me things like:\n- "best stablecoin yields"\n- "top pools on Arbitrum"\n- "safe pools with auto-compounding"\n- "high APY opportunities"`;
  }

  if (q.includes("market") || q.includes("overview") || q.includes("summary") || q.includes("top")) {
    const picks = pickPoolsForQuery(allPools, "top");
    return `${summary}\n\n**Top 3 opportunities right now:**\n\n${formatPicks(picks.map(p => formatPoolForResponse(p, true)))}\n\n*Not financial advice — always verify APY sustainability and check TVL liquidity before depositing.*`;
  }

  if (q.includes("stable")) {
    const picks = pickPoolsForQuery(allPools, "stable");
    return `${summary}\n\n**Best stablecoin opportunities:**\n\n${formatPicks(picks.map(p => formatPoolForResponse(p)))}\n\nStablecoin pools carry minimal impermanent loss, but reward APY can be temporary — check the reward component before committing.`;
  }

  const CHAIN_PATTERNS: { chain: string; rx: RegExp }[] = [
    { chain: "ethereum", rx: /eth|ethereum/ },
    { chain: "arbitrum", rx: /arbitrum|arb/ },
    { chain: "bsc", rx: /bsc|binance/ },
    { chain: "optimism", rx: /optimism/ },
    { chain: "base", rx: /\bbase\b/ },
    { chain: "polygon", rx: /polygon|matic/ },
    { chain: "avalanche", rx: /avax|avalanche/ },
    { chain: "solana", rx: /solana/ },
  ];

  const chainMatch = CHAIN_PATTERNS.find(({ rx }) => rx.test(q))?.chain;
  if (chainMatch) {
    const picks = pickPoolsForQuery(allPools, chainMatch);
    return `${summary}\n\n**Top picks on ${chainMatch[0].toUpperCase() + chainMatch.slice(1)}:**\n\n${formatPicks(picks.map(p => formatPoolForResponse(p)))}\n\n*Not financial advice.*`;
  }

  // Default: best risk-adjusted picks overall.
  const picks = pickPoolsForQuery(allPools, q);
  if (picks.length === 0) {
    return `${summary}\n\nNo pools match that exactly. Try a chain (Arbitrum, Base, Solana…), "stablecoins", "auto-compound", or "high apy" — or search the pool list on the main page.`;
  }
  return `${summary}\n\n**Best risk-adjusted opportunities:**\n\n${formatPicks(picks.map(p => formatPoolForResponse(p, true)))}\n\nTry asking for a specific chain (Arbitrum, Base, Solana…), stablecoins, or auto-compounding vaults to narrow it down.`;
}

export async function chat(userMessage: string, conversationId?: number): Promise<ChatResult> {
  const allPools = getCachedData()?.pools || [];

  let history: HistoryMessage[] = [];
  if (conversationId) {
    const msgs = await storage.listMessages(conversationId);
    history = msgs.map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
  }

  // ENGINE-FIRST: compute the deterministic answer from live data. This is the
  // source of truth — it cannot hallucinate. The LLM (when configured) only
  // explains these exact picks; if it fails, the engine answer stands.
  const engineAnswer = localReply(userMessage, allPools);

  if (isLlmConfigured()) {
    try {
      const reply = await llmExplain(userMessage, engineAnswer, history);
      return { mode: "llm", reply };
    } catch (error) {
      console.error("[AlphaBrain] LLM explanation failed, returning engine answer:", error);
      return { mode: "local", reply: engineAnswer };
    }
  }

  return { mode: "local", reply: engineAnswer };
}
