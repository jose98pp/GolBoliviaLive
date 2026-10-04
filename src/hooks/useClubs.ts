import { useState, useEffect, useCallback } from 'react';
import { Club } from '../types/football';
import { BOLIVIAN_CLUBS, setGlobalClubs } from '../data/bolivianFootballData';
import { apiClient } from '../services/apiClient';

export function useClubs() {
  const [clubs, setClubs] = useState<Record<string, Club>>(BOLIVIAN_CLUBS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch from Firebase/Backend
    apiClient.getClubs().then((fetched) => {
      if (isMounted && fetched && Object.keys(fetched).length > 0) {
        setClubs(fetched);
        setGlobalClubs(fetched);
      }
    });

    // 2. Real-time subscription to Firebase Firestore & Server events
    const unsubscribe = apiClient.subscribeClubs((updated) => {
      if (isMounted && updated && Object.keys(updated).length > 0) {
        setClubs(updated);
        setGlobalClubs(updated);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const saveClub = useCallback(async (club: Club) => {
    setIsLoading(true);
    try {
      const res = await apiClient.saveClub(club);
      if (res.clubs) {
        setClubs(res.clubs);
        setGlobalClubs(res.clubs);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteClub = useCallback(async (clubId: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.deleteClub(clubId);
      if (res.clubs) {
        setClubs(res.clubs);
        setGlobalClubs(res.clubs);
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    clubs,
    saveClub,
    deleteClub,
    isLoading,
  };
}
