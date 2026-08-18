# Monetization Research: DeFi Yield-Tracking + AI-Advisor SaaS (2025–2026)

## 1. Pricing bands (real numbers)

**(a) On-chain data dashboards**
- **Nansen**: free tier; paid plans from ~$69–79/mo (monthly), discounted to ~$49/mo on annual; VIP/enterprise runs $150–1,500+/mo ([cost breakdown](https://blockchain.news/flashnews/nansen-discount-69-monthly-or-49-on-annual-plan-10-off-cost-breakdown-for-crypto-traders), [Nansen Pro docs](https://academy.nansen.ai/en/help/articles/articles/9412804-about-nansen-pro-plan)).
- **Glassnode**: Free plan; Advanced ~$39/mo; Professional ~$799/mo; Enterprise custom — i.e., the old $29–99 band has moved upmarket ([CostBench](https://costbench.com/software/onchain-analytics/glassnode/), [2026 analytics guide](https://www.youngju.dev/blog/culture/2026-05-16-ai-crypto-onchain-analytics-2026-nansen-dune-glassnode-arkham-chainalysis-cryptoquant-messari-tokenterminal-intotheblock-xangle-deep-dive.en)).
- **Dune**: Free (community dashboards, limited query credits); paid starts at $399/mo (Plus), top tier cut ~65% to $349/mo in April 2026 — even after cuts it stays enterprise-priced ([CostBench pricing](https://costbench.com/software/onchain-analytics/dune-analytics/), [price-change log](https://costbench.com/changelog/dune-analytics-price-decrease-2026-04/)).
- **Token Terminal**: Free tier; Pro from ~$350/mo ([ComparEdge](https://comparedge.com/tools/token-terminal/pricing#tier-free)).
- **Arkham**: free tier plus paid plans ([ToolChase](https://toolchase.com/tool/arkham/)); **Santiment** tiers paid plans similarly ([ComparEdge](https://comparedge.com/tools/santiment)).
- **CoinGecko**: API from Free to $399.20/mo across 5 plans ([CostBench](https://costbench.com/software/blockchain-data-api/coingecko-api/)); CoinGecko Premium is a paid app membership (ad-free, portfolio, extras) ([support guide](https://support.coingecko.com/hc/en-us/articles/4538151655833-How-to-Subscribe-to-CoinGecko-Premium)).
- **TradingView**: Essential/Plus/Premium ≈ $13–25–60/mo — the only mainstream tool with a consumer-friendly band near yours ([Pineify plan guide](https://pineify.app/resources/blog/tradingview-subscription-offers-complete-guide-to-plans-pricing-and-discounts), [plan comparison](https://www.mindmathmoney.com/articles/tradingview-plans-compared-free-vs-essential-vs-plus-vs-premium-vs-ultimate-2025-guide)).
- **DefiLlama**: free, funded by donations/grants — proof that basic yield/TVL data can't be paywalled ([Octant discussion](https://discuss.octant.app/t/defillama-defi-data/267/1)).

**(b) AI crypto assistants**
- Almost none publish flat SaaS pricing; AI is bundled into data plans (e.g., Nansen's Claude-powered AI inside paid tiers, [Yahoo Finance](https://finance.yahoo.com/news/ai-chatbot-trained-top-crypto-171712039.html)).
- **Kaito** gates Yapper through token/attention mechanics ("InfoFi"), not a subscription ([Blockworks](https://blockworks.co/news/infofi-sector-crypto-kaito-data-attention)).
- **Wayfinder Cloud Agents** (onchain AI agents) charge $13.99/mo — the closest concrete anchor in-band ([BingX](https://bingx.com/en/news/post/wayfinder-cloud-agents-bring-openclaw-ai-onchain-across-eight-evm-networks-at-monthly)).
- **Almanak** sells treasury-management to protocols, not per-seat SaaS ([MEXC guide](https://blog.mexc.com/crypto-knowledge/what-is-almanak-a-2025-guide-to-the-project/)).
- Anchor: consumer AI (ChatGPT/Claude class) standardizes ~$20/mo, so $9–19 is the "cheaper than ChatGPT" niche slot.

**(c) Yield-tracking tools**
- **Zapper / DeBank / Zerion**: wallet tracking is free; they monetize swap fees instead (Zapper volume-based trading fees, "from $89/mo" at scale) ([ComparEdge Zapper](https://comparedge.com/tools/zapper/pricing#tier-pay-as-you-go), [tracker roundup](https://chainglance.com/blog/7-best-defi-portfolio-trackers-in-2026/)).
- **APY.vision** ran a freemium PRO model ([RugDoc intro](https://rugdoc.io/wiki/docs/introduction-to-apy-vision/)).
- **vaults.fyi**: dashboards free; paid API is pay-as-you-go ([vaults.fyi blog](https://blog.vaults.fyi/developer-portal-open/)).
- Takeaway: nobody charges for basic yield tracking. The tracker is the free funnel; money is in analytics depth, AI, and alerts.

## 2. Free-tier limits that work
- **Usage gates beat feature-freeze**: Dune's query credits, Glassnode's limited free metrics, CoinGecko's API rate limits all meter compute, not rows.
- **AI messages/day**: ~5–10 free messages/day is the standard cap; hitting the daily cap is the upgrade trigger (billing-trigger cases moved freemium→paid from 0.8% to 3.1% ([Zade Space](https://zade.space/resources/how-we-increased-freemium-to-paid-conversion-from-0-8-to-3-1-in-a-b2b-ai-saas-product/), [Kinde](https://www.kinde.com/learn/billing/conversions/freemium-to-premium-converting-free-ai-tool-users-with-smart-billing-triggers/)).
- Wallet count (3–5 free), chain count (1–2 free), alert count (3 free), data delay (15-min vs real-time) all work as free-tier dials.

## 3. What to gate vs keep free
- **Keep free** (trust/SEO/funnel): portfolio tracking, base APY/yield data, historical snapshots, community dashboards — DefiLlama and Dune prove this builds the moat.
- **Gate** (highest value/COGS): AI advisor, real-time data + smart-money signals (Nansen/Glassnode charge for exactly this), alerts at volume (email/Telegram), API/export credits, multi-chain depth, ad-free (CoinGecko Premium), wallet-profiling.

## 4. Payments & onboarding reality
- ~39% of US merchants now accept crypto ([Fungies.io](https://fungies.io/crypto-payments-saas-digital-products-2026/)); for crypto-native users, USDC/ETH alongside card is expected ([Dodo Payments](https://dodopayments.com/blogs/crypto-saas-payments-2026)).
- Wallet-only auth kills conversion; email/social login with optional wallet-connect scales adoption ([Reown](https://reown.com/blog/what-is-social-login-and-why-it-s-finally-scaling-defi-adoption), [Privy](https://www.privy.io/learn/crypto-onboarding), ["failing at the 1-yard line"](https://peerlist.io/ssofkin7/articles/why-web3-projects-are-failing-at-the-1yard-line)).
- Recommendation: email login → Stripe (cards) + USDC/ETH option; wallet connect is the auto-import convenience, not the auth gate.

## 5. CAC/LTV for a niche crypto tool
- Healthy LTV:CAC ≈ 3:1, payback <12 months ([getaleph](https://www.getaleph.com/answers/cltv-cac-ratio-saas-2026), [Optifai benchmarks](https://optif.ai/learn/questions/b2b-saas-ltv-benchmark/)); consumer apps churn ~5–7%/mo, B2B SaaS less ([RetentionCheck](https://retentioncheck.com/learn/b2b-vs-b2c-churn)).
- Crypto-specific: paid acquisition is expensive (affiliate promos, e.g., Nansen 10–30% discount codes); free dashboards + SEO/content are the cheap channel; DeFi users churn with market cycles, so annual discounts and Telegram/email retention loops matter.

## 6. Recommendation at $9–19/mo
- **Free**: 3 wallets, 2 chains, daily yield data, 15-min delay, 5 AI questions/day, 3 alerts, community dashboards.
- **Pro — $12–15/mo** (anchor $9/mo annual): unlimited wallets/chains, real-time data, 100 AI messages/day with memory, unlimited alerts (email+Telegram), API export, ad-free.
- **Pro+ — $19/mo** optional: team/multi-sig, higher alert volume, priority model, vault-risk scoring.
- Rationale: undercuts consumer AI ($20) while pricing like a tool (TradingView Plus ~$25, Wayfinder $13.99); keeps tracking free so you don't fight Zapper/DeBank; monetizes AI + alerts where data tools actually charge; a genuinely useful free tier plus cap-triggered upgrade fits the 2–5% freemium conversion benchmark ([Optifai glossary](https://optif.ai/glossary/free-to-paid-conversion/), [Lago](https://getlago.com/blog/freemium-pricing)).
