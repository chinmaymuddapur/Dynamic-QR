import { Client, Batch, Card, ActivityLog } from '../types';
import { INITIAL_CLIENTS, INITIAL_BATCHES, INITIAL_CARDS, INITIAL_ACTIVITY } from './mockData';

const STORAGE_KEYS = {
  CLIENTS: 'cardsync_clients',
  BATCHES: 'cardsync_batches',
  CARDS: 'cardsync_cards',
  ACTIVITY: 'cardsync_activity',
  AUTH: 'cardsync_auth_user',
  SETTINGS: 'cardsync_settings',
};

// In-memory fallback if localStorage is unavailable
const memoryStore: Record<string, string> = {};

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : memoryStore[key];
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Error reading ${key} from storage:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, serialized);
    }
    memoryStore[key] = serialized;
  } catch (err) {
    console.warn(`Error saving ${key} to storage:`, err);
  }
}

export const db = {
  getClients(): Client[] {
    const clients = getItem<Client[]>(STORAGE_KEYS.CLIENTS, []);
    if (clients.length === 0) {
      setItem(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
      return INITIAL_CLIENTS;
    }
    return clients;
  },

  saveClients(clients: Client[]): void {
    setItem(STORAGE_KEYS.CLIENTS, clients);
  },

  getBatches(): Batch[] {
    const batches = getItem<Batch[]>(STORAGE_KEYS.BATCHES, []);
    if (batches.length === 0) {
      setItem(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
      return INITIAL_BATCHES;
    }
    return batches;
  },

  saveBatches(batches: Batch[]): void {
    setItem(STORAGE_KEYS.BATCHES, batches);
  },

  getCards(): Card[] {
    const cards = getItem<Card[]>(STORAGE_KEYS.CARDS, []);
    if (cards.length === 0) {
      setItem(STORAGE_KEYS.CARDS, INITIAL_CARDS);
      return INITIAL_CARDS;
    }
    return cards;
  },

  saveCards(cards: Card[]): void {
    setItem(STORAGE_KEYS.CARDS, cards);
  },

  getActivity(): ActivityLog[] {
    const logs = getItem<ActivityLog[]>(STORAGE_KEYS.ACTIVITY, []);
    if (logs.length === 0) {
      setItem(STORAGE_KEYS.ACTIVITY, INITIAL_ACTIVITY);
      return INITIAL_ACTIVITY;
    }
    return logs;
  },

  logActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>): void {
    const logs = this.getActivity();
    const newLog: ActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ...activity,
    };
    this.saveActivity([newLog, ...logs].slice(0, 50)); // keep last 50
  },

  saveActivity(logs: ActivityLog[]): void {
    setItem(STORAGE_KEYS.ACTIVITY, logs);
  },

  resetToDefaults(): void {
    setItem(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    setItem(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
    setItem(STORAGE_KEYS.CARDS, INITIAL_CARDS);
    setItem(STORAGE_KEYS.ACTIVITY, INITIAL_ACTIVITY);
  },
};
