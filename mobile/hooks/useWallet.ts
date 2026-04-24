import { useState, useEffect, useCallback } from 'react';
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

  const loadFromStorage = useCallback(async () => {
    const raw = await AsyncStorage.getItem('wallet_data');
    if (raw) setWallet(JSON.parse(raw));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (!FIREBASE_CONFIGURED || !db) {
      loadFromStorage();
      return;
    }

    const { doc, onSnapshot } = require('firebase/firestore');
    const unsub = onSnapshot(doc(db, 'users', userId), (snap: any) => {
      if (snap.exists()) {
        const data = snap.data() as WalletData;
        setWallet(data);
        AsyncStorage.setItem('wallet_data', JSON.stringify(data));
      }
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

  return { wallet, loading, refresh };
}
