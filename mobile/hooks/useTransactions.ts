import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

export interface Transaction {
  id: string;
  fromUserId: string;
  toPartnerId: string;
  amount: number;
  pointsAwarded: number;
  type: 'payment' | 'benefit_redemption';
  benefitId: string | null;
  timestamp: Date | string;
  status: 'pending' | 'confirmed';
  partnerName?: string;
  benefitTitle?: string;
}

export function useTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFromStorage = useCallback(async () => {
    const raw = await AsyncStorage.getItem('transactions');
    if (raw) {
      const all: Transaction[] = JSON.parse(raw);
      setTransactions(all.filter((tx) => tx.fromUserId === userId));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (!FIREBASE_CONFIGURED || !db) {
      loadFromStorage();
      return;
    }

    const { collection, query, where, onSnapshot, limit } = require('firebase/firestore');
    const q = query(
      collection(db, 'transactions'),
      where('fromUserId', '==', userId),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      const txs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction));
      txs.sort((a: any, b: any) => {
        const ta = a.timestamp?.toMillis?.() ?? new Date(a.timestamp).getTime();
        const tb = b.timestamp?.toMillis?.() ?? new Date(b.timestamp).getTime();
        return tb - ta;
      });
      setTransactions(txs);
      setLoading(false);
    });
    return unsub;
  }, [userId, loadFromStorage]);

  const refresh = useCallback(async () => {
    if (!FIREBASE_CONFIGURED || !db) {
      await loadFromStorage();
    }
    // Firebase mode: onSnapshot listener stays active, no manual refresh needed
  }, [loadFromStorage]);

  return { transactions, loading, refresh };
}

export function usePartnerTransactions(partnerId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) { setLoading(false); return; }

    if (!FIREBASE_CONFIGURED || !db) {
      // Local fallback: read from shared transactions storage
      AsyncStorage.getItem('transactions').then((raw) => {
        if (raw) {
          const all: Transaction[] = JSON.parse(raw);
          const filtered = all
            .filter((tx) => tx.toPartnerId === partnerId)
            .sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
          setTransactions(filtered);
        }
        setLoading(false);
      });
      return;
    }

    const { collection, query, where, onSnapshot, limit } = require('firebase/firestore');
    const q = query(
      collection(db, 'transactions'),
      where('toPartnerId', '==', partnerId),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      const txs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction));
      txs.sort((a: any, b: any) => {
        const ta = a.timestamp?.toMillis?.() ?? new Date(a.timestamp).getTime();
        const tb = b.timestamp?.toMillis?.() ?? new Date(b.timestamp).getTime();
        return tb - ta;
      });
      setTransactions(txs);
      setLoading(false);
    });
    return unsub;
  }, [partnerId]);

  return { transactions, loading };
}
