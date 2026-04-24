import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface WalletData {
  name: string;
  email: string;
  hotelCode: string;
  tokenBalance: number;
  pointsBalance: number;
  checkInLocation: string;
}

export function useWallet(userId: string | null) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        setWallet(snap.data() as WalletData);
      }
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { wallet, loading };
}
