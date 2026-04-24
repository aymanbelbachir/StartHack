import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIGURED, db } from '@/lib/firebase';

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

    if (!FIREBASE_CONFIGURED || !db) {
      // Load from local storage (offline/demo mode)
      AsyncStorage.getItem('wallet_data').then((raw) => {
        if (raw) setWallet(JSON.parse(raw));
        setLoading(false);
      });
      return;
    }

    // Live Firebase listener
    const { doc, onSnapshot } = require('firebase/firestore');
    const unsub = onSnapshot(doc(db, 'users', userId), (snap: any) => {
      if (snap.exists()) setWallet(snap.data() as WalletData);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  return { wallet, loading };
}
