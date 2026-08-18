import {
  type User,
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type WatchlistItem,
  type InsertWatchlistItem,
  type PendingOrder,
  type InsertPendingOrder,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { DbStorage } from "./db-storage";

export interface Lead {
  id: string;
  email: string;
  source: string;
  createdAt: Date;
}

export interface IStorage {
  // users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  setUserPlan(userId: string, plan: "free" | "pro"): Promise<User | undefined>;

  // email leads (course funnel)
  addLead(email: string, source: string): Promise<Lead | "duplicate">;
  listLeads(): Promise<Lead[]>;

  // alpha brain conversations (userId scopes history to the owner; null = anonymous)
  createConversation(conversation: InsertConversation, userId: string | null): Promise<Conversation>;
  listConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  addMessage(message: InsertMessage): Promise<Message>;
  listMessages(conversationId: number): Promise<Message[]>;

  // watchlist (keyed by anonymous client token)
  getWatchlist(token: string): Promise<string[]>;
  addWatchlistItem(item: InsertWatchlistItem): Promise<WatchlistItem>;
  removeWatchlistItem(token: string, poolId: string): Promise<boolean>;

  // pending CoinGate orders (persisted so callbacks survive redeploys)
  savePendingOrder(order: InsertPendingOrder): Promise<PendingOrder>;
  getPendingOrder(orderId: string): Promise<PendingOrder | undefined>;
  listPendingOrders(): Promise<PendingOrder[]>;
  deletePendingOrder(orderId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<number, Conversation>;
  private leads: Map<string, Lead>;
  private messages: Map<number, Message>;
  private watchlist: Map<string, string[]>;
  private pendingOrders: Map<string, PendingOrder>;
  private nextConversationId: number;
  private nextMessageId: number;
  private nextWatchlistId: number;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.watchlist = new Map();
    this.leads = new Map();
    this.pendingOrders = new Map();
    this.nextConversationId = 1;
    this.nextMessageId = 1;
    this.nextWatchlistId = 1;
  }

  async addLead(email: string, source: string): Promise<Lead | "duplicate"> {
    const key = email.toLowerCase();
    if (this.leads.has(key)) return "duplicate";
    const lead: Lead = { id: randomUUID(), email: key, source, createdAt: new Date() };
    this.leads.set(key, lead);
    return lead;
  }

  async listLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id, plan: "free", createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async setUserPlan(userId: string, plan: "free" | "pro"): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = { ...user, plan };
    this.users.set(userId, updated);
    return updated;
  }

  async createConversation(insert: InsertConversation, userId: string | null): Promise<Conversation> {
    const conversation: Conversation = {
      id: this.nextConversationId++,
      userId: userId ?? null,
      title: insert.title,
      createdAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async listConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async addMessage(insert: InsertMessage): Promise<Message> {
    const message: Message = {
      id: this.nextMessageId++,
      conversationId: insert.conversationId,
      role: insert.role,
      content: insert.content,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  async listMessages(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getWatchlist(token: string): Promise<string[]> {
    return this.watchlist.get(token) || [];
  }

  async addWatchlistItem(insert: InsertWatchlistItem): Promise<WatchlistItem> {
    const existing = this.watchlist.get(insert.token) || [];
    if (!existing.includes(insert.poolId)) {
      existing.push(insert.poolId);
      this.watchlist.set(insert.token, existing);
    }
    return {
      id: this.nextWatchlistId++,
      token: insert.token,
      poolId: insert.poolId,
      createdAt: new Date(),
    };
  }

  async removeWatchlistItem(token: string, poolId: string): Promise<boolean> {
    const existing = this.watchlist.get(token);
    if (!existing) return false;
    const idx = existing.indexOf(poolId);
    if (idx === -1) return false;
    existing.splice(idx, 1);
    if (existing.length === 0) {
      this.watchlist.delete(token);
    } else {
      this.watchlist.set(token, existing);
    }
    return true;
  }

  // ── pending CoinGate orders ──────────────────────────────────────────

  async savePendingOrder(insert: InsertPendingOrder): Promise<PendingOrder> {
    const order: PendingOrder = {
      orderId: insert.orderId,
      userId: insert.userId,
      plan: insert.plan || "pro",
      orderToken: insert.orderToken,
      createdAt: insert.createdAt || new Date(),
    };
    this.pendingOrders.set(order.orderId, order);
    return order;
  }

  async getPendingOrder(orderId: string): Promise<PendingOrder | undefined> {
    return this.pendingOrders.get(orderId);
  }

  async listPendingOrders(): Promise<PendingOrder[]> {
    return Array.from(this.pendingOrders.values());
  }

  async deletePendingOrder(orderId: string): Promise<boolean> {
    return this.pendingOrders.delete(orderId);
  }
}

/**
 * Storage selection: Postgres when DATABASE_URL is set (production/Railway),
 * otherwise in-memory (local dev, tests). Static import (this file is ESM —
 * "type":"module" — so require() would be undefined). No DB connection is
 * opened until the first query, so the pg/drizzle code is inert without a
 * DATABASE_URL.
 */
export function getStorage(): IStorage {
  const url = process.env.DATABASE_URL;
  if (url) {
    // Static import: bundled into dist by esbuild; the pg/drizzle code is
    // included in the server bundle (acceptable — it's used only when the
    // app has a database, and the cost is a few hundred KB in the bundle).
    return new DbStorage(url);
  }
  return new MemStorage();
}

export const storage: IStorage = getStorage();
