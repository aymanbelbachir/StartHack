import { useState, useEffect } from 'react';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

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
    if (!userId || !FIREBASE_CONFIGURED || !db) {
      setLoading(false);
      return;
    }
    const { collection, query, where, orderBy, onSnapshot, limit } = require('firebase/firestore');
    const q = query(
      collection(db, 'transactions'),
      where('fromUserId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      setTransactions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction)));
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
    if (!partnerId || !FIREBASE_CONFIGURED || !db) {
      setLoading(false);
      return;
    }
    const { collection, query, where, orderBy, onSnapshot, limit } = require('firebase/firestore');
    const q = query(
      collection(db, 'transactions'),
      where('toPartnerId', '==', partnerId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap: any) => {
      setTransactions(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Transaction)));
      setLoading(false);
    });
    return unsub;
  }, [partnerId]);

  return { transactions, loading };
}
