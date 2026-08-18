import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Chat tables for Alpha Brain AI advisor
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Watchlist items keyed by an anonymous client token (no auth required).
// Survives across devices when the user carries their token.
export const watchlistItems = pgTable("watchlist_items", {
  id: serial("id").primaryKey(),
  token: text("token").notNull(),
  poolId: text("pool_id").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({
  id: true,
  createdAt: true,
});

export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistItemSchema>;

// DeFi Pool types from DeFiLlama API
export interface Pool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number | null;
  apyReward: number | null;
  apy: number;
  rewardTokens: string[] | null;
  il7d: number | null;
  ilRisk: "none" | "low" | "medium" | "high";
  exposure: "single" | "multi";
  stablecoin: boolean;
  volumeUsd7d: number | null;
  apyPct1D: number | null;
  apyPct7D: number | null;
  apyPct30D: number | null;
  poolMeta: string | null;
  underlyingTokens: string[] | null;
  url: string | null;
}

export interface PoolWithScore extends Pool {
  riskAdjustedScore: number;
  isHot: boolean;
  apyDeclining: boolean;
  lowLiquidityRewards: boolean;
  ilPctActual: number | null;
  autoCompound: boolean;
  autoCompoundProject: string | null;
  isBeefy: boolean;
  beefyAvailable: boolean;
}

export interface FilterState {
  minTvl: number;
  chains: string[];
  projectTypes: ("lp" | "lending" | "stable" | "volatile")[];
  minApy: number;
  lowIlOnly: boolean;
  searchQuery: string;
}

export interface SortState {
  field: "riskAdjustedScore" | "tvlUsd" | "apy" | "apyPct7D";
  direction: "asc" | "desc";
}

export interface PoolsResponse {
  pools: PoolWithScore[];
  stats: {
    totalPools: number;
    avgApy: number;
    topChain: string;
    topChainTvl: number;
  };
  chains: string[];
  chainDistribution: { chain: string; tvl: number; count: number }[];
  lastUpdated: string;
}

export const filterStateSchema = z.object({
  minTvl: z.number().min(0),
  chains: z.array(z.string()),
  projectTypes: z.array(z.enum(["lp", "lending", "stable", "volatile"])),
  minApy: z.number().min(0),
  lowIlOnly: z.boolean(),
  searchQuery: z.string(),
});

export type FilterStateInput = z.infer<typeof filterStateSchema>;
