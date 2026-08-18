import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, desc } from "drizzle-orm";
import pg from "pg";
import {
  users,
  conversations,
  messages,
  watchlistItems,
  leads,
  pendingOrders,
  type User,
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type WatchlistItem,
  type InsertWatchlistItem,
  type Lead,
  type PendingOrder,
  type InsertPendingOrder,
} from "@shared/schema";
import type { IStorage } from "./storage";

import { randomUUID } from "crypto";

const { Pool } = pg;

/**
 * PostgreSQL-backed storage. Used when DATABASE_URL is set (e.g. Railway).
 * Everything the app persists — users, plans, conversations, watchlists,
 * leads — survives restarts and redeploys. Falls back to MemStorage (see
 * storage.ts selection) when no DATABASE_URL is configured.
 */
export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor(connectionString: string) {
    const pool = new Pool({ connectionString });
    this.db = drizzle(pool);
  }

  // ── users ────────────────────────────────────────────────────────────

  async getUser(id: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async createUser(insert: InsertUser): Promise<User> {
    const rows = await this.db
      .insert(users)
      .values({ ...insert, id: randomUUID(), plan: "free" })
      .returning();
    return rows[0];
  }

  async setUserPlan(userId: string, plan: "free" | "pro"): Promise<User | undefined> {
    const rows = await this.db
      .update(users)
      .set({ plan })
      .where(eq(users.id, userId))
      .returning();
    return rows[0];
  }

  // ── email leads ──────────────────────────────────────────────────────

  async addLead(email: string, source: string): Promise<Lead | "duplicate"> {
    const key = email.toLowerCase();
    try {
      const rows = await this.db
        .insert(leads)
        .values({ email: key, source })
        .onConflictDoNothing()
        .returning();
      if (rows.length === 0) return "duplicate";
      return rows[0];
    } catch (error: any) {
      // Unique-violation race: another request inserted the same email first
      if (error?.code === "23505") return "duplicate";
      throw error;
    }
  }

  async listLeads(): Promise<Lead[]> {
    return this.db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  // ── conversations ────────────────────────────────────────────────────

  async createConversation(insert: InsertConversation, userId: string | null): Promise<Conversation> {
    const rows = await this.db
      .insert(conversations)
      .values({ ...insert, userId })
      .returning();
    return rows[0];
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    return this.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const rows = await this.db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return rows[0];
  }

  async addMessage(insert: InsertMessage): Promise<Message> {
    const rows = await this.db.insert(messages).values(insert).returning();
    return rows[0];
  }

  async listMessages(conversationId: number): Promise<Message[]> {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  // ── watchlist ────────────────────────────────────────────────────────

  async getWatchlist(token: string): Promise<string[]> {
    const rows = await this.db
      .select({ poolId: watchlistItems.poolId })
      .from(watchlistItems)
      .where(eq(watchlistItems.token, token))
      .orderBy(watchlistItems.createdAt);
    return rows.map((r) => r.poolId);
  }

  async addWatchlistItem(insert: InsertWatchlistItem): Promise<WatchlistItem> {
    // Unique (token, pool) constraint makes this race-safe: concurrent adds
    // of the same pair can only insert once.
    try {
      const rows = await this.db
        .insert(watchlistItems)
        .values(insert)
        .onConflictDoNothing()
        .returning();
      if (rows.length === 0) {
        // Already present — return the existing row for a stable shape
        const existing = await this.db
          .select()
          .from(watchlistItems)
          .where(and(eq(watchlistItems.token, insert.token), eq(watchlistItems.poolId, insert.poolId)))
          .limit(1);
        return existing[0];
      }
      return rows[0];
    } catch (error: any) {
      if (error?.code === "23505") {
        const existing = await this.db
          .select()
          .from(watchlistItems)
          .where(and(eq(watchlistItems.token, insert.token), eq(watchlistItems.poolId, insert.poolId)))
          .limit(1);
        return existing[0];
      }
      throw error;
    }
  }

  async removeWatchlistItem(token: string, poolId: string): Promise<boolean> {
    const rows = await this.db
      .delete(watchlistItems)
      .where(and(eq(watchlistItems.token, token), eq(watchlistItems.poolId, poolId)))
      .returning({ id: watchlistItems.id });
    return rows.length > 0;
  }

  // ── pending CoinGate orders ──────────────────────────────────────────

  async savePendingOrder(insert: InsertPendingOrder): Promise<PendingOrder> {
    const rows = await this.db
      .insert(pendingOrders)
      .values({ ...insert, plan: insert.plan || "pro" })
      .onConflictDoUpdate({
        target: pendingOrders.orderId,
        set: {
          userId: insert.userId,
          orderToken: insert.orderToken,
          plan: insert.plan || "pro",
        },
      })
      .returning();
    return rows[0];
  }

  async getPendingOrder(orderId: string): Promise<PendingOrder | undefined> {
    const rows = await this.db
      .select()
      .from(pendingOrders)
      .where(eq(pendingOrders.orderId, orderId))
      .limit(1);
    return rows[0];
  }

  async listPendingOrders(): Promise<PendingOrder[]> {
    return this.db.select().from(pendingOrders);
  }

  async deletePendingOrder(orderId: string): Promise<boolean> {
    const rows = await this.db
      .delete(pendingOrders)
      .where(eq(pendingOrders.orderId, orderId))
      .returning({ orderId: pendingOrders.orderId });
    return rows.length > 0;
  }
}
