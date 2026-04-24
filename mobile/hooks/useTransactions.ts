import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Transaction {
  id: string;
  fromUserId: string;
  toPartnerId: string;
  amount: number;
  pointsAwarded: number;
  type: 'payment' | 'benefit_redemption';
  benefitId: string | null;
  timestamp: Date;
  status: 'pending' | 'confirmed';
  partnerName?: string;
  benefitTitle?: string;
}

export function useTransactions(userId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'transactions'),
      where('fromUserId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { transactions, loading };
}

export function usePartnerTransactions(partnerId: string | null) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'transactions'),
      where('toPartnerId', '==', partnerId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
    });
    return unsub;
  }, [partnerId]);

  return { transactions, loading };
}
