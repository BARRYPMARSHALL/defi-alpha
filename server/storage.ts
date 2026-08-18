import {
  type User,
  type InsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type WatchlistItem,
  type InsertWatchlistItem,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  setUserPlan(userId: string, plan: "free" | "pro"): Promise<User | undefined>;

  // alpha brain conversations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  listConversations(): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  addMessage(message: InsertMessage): Promise<Message>;
  listMessages(conversationId: number): Promise<Message[]>;

  // watchlist (keyed by anonymous client token)
  getWatchlist(token: string): Promise<string[]>;
  addWatchlistItem(item: InsertWatchlistItem): Promise<WatchlistItem>;
  removeWatchlistItem(token: string, poolId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private watchlist: Map<string, string[]>;
  private nextConversationId: number;
  private nextMessageId: number;
  private nextWatchlistId: number;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.watchlist = new Map();
    this.nextConversationId = 1;
    this.nextMessageId = 1;
    this.nextWatchlistId = 1;
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

  async createConversation(insert: InsertConversation): Promise<Conversation> {
    const conversation: Conversation = {
      id: this.nextConversationId++,
      title: insert.title,
      createdAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  async listConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
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
}

export const storage = new MemStorage();
