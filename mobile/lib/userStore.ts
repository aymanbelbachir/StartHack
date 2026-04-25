import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIGURED, db } from './firebase';

const REGISTRY_KEY = 'local_users_registry';

export interface UserSnapshot {
  userId: string;
  wallet_data: string;
  transactions: string;
  registered_activities: string;
  discovered_quests: string;
  redeemed_benefits: string;
  partner_balances: string;
}

type Registry = Record<string, UserSnapshot>;

// Save the current user's full state into the local registry (keyed by email)
export async function saveUserSnapshot(): Promise<void> {
  const walletRaw = await AsyncStorage.getItem('wallet_data');
  if (!walletRaw) return;
  const wallet = JSON.parse(walletRaw);
  const email: string | undefined = wallet.email;
  if (!email) return;

  const userId = (await AsyncStorage.getItem('userId')) ?? '';
  const results = await AsyncStorage.multiGet([
    'transactions',
    'registered_activities',
    'discovered_quests',
    'redeemed_benefits',
    'partner_balances',
  ]);

  const registryRaw = await AsyncStorage.getItem(REGISTRY_KEY);
  const registry: Registry = registryRaw ? JSON.parse(registryRaw) : {};

  registry[email.toLowerCase()] = {
    userId,
    wallet_data: walletRaw,
    transactions:           results[0][1] ?? '[]',
    registered_activities:  results[1][1] ?? '[]',
    discovered_quests:      results[2][1] ?? '[]',
    redeemed_benefits:      results[3][1] ?? '[]',
    partner_balances:       results[4][1] ?? '{}',
  };

  await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

// Find a user in the local registry by email
export async function findLocalUserByEmail(email: string): Promise<UserSnapshot | null> {
  const registryRaw = await AsyncStorage.getItem(REGISTRY_KEY);
  if (!registryRaw) return null;
  const registry: Registry = JSON.parse(registryRaw);
  return registry[email.toLowerCase()] ?? null;
}

// Restore a snapshot back into AsyncStorage (used on re-login)
export async function restoreUserSnapshot(snapshot: UserSnapshot): Promise<void> {
  await AsyncStorage.multiSet([
    ['userId',               snapshot.userId],
    ['role',                 'guest'],
    ['wallet_data',          snapshot.wallet_data],
    ['transactions',         snapshot.transactions],
    ['registered_activities',snapshot.registered_activities],
    ['discovered_quests',    snapshot.discovered_quests],
    ['redeemed_benefits',    snapshot.redeemed_benefits],
    ['partner_balances',     snapshot.partner_balances],
  ]);
}

// Firebase: find user document by email
export async function findFirebaseUserByEmail(email: string): Promise<{ userId: string; data: any } | null> {
  if (!FIREBASE_CONFIGURED || !db) return null;
  try {
    const { collection, query, where, getDocs, limit } = await import('firebase/firestore');
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { userId: doc.id, data: doc.data() };
  } catch {
    return null;
  }
}
