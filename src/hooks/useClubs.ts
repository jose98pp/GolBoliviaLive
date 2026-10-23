import { useState, useEffect, useCallback } from 'react';
import { Club } from '../types/football';
import { BOLIVIAN_CLUBS, DEFAULT_CLUB_CATALOG, setGlobalClubs } from '../data/bolivianFootballData';
import { resolveClubCrests } from '../services/clubCrests';
import { getClubCrestUrl } from '../utils/clubCrests';
import { apiClient } from '../services/apiClient';

export function useClubs() {
  const [clubs, setClubs] = useState<Record<string, Club>>(BOLIVIAN_CLUBS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial fetch from Firebase/Backend
    apiClient.getClubs().then((fetched) => {
      if (isMounted && fetched && Object.keys(fetched).length > 0) {
        const merged = { ...DEFAULT_CLUB_CATALOG, ...fetched };
        setClubs(merged);
        setGlobalClubs(merged);
      }
    });

    // 2. Real-time subscription to Firebase Firestore & Server events
    const unsubscribe = apiClient.subscribeClubs((updated) => {
      if (isMounted && updated && Object.keys(updated).length > 0) {
        const merged = { ...DEFAULT_CLUB_CATALOG, ...updated };
        setClubs(merged);
        setGlobalClubs(merged);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const missingCrestsKey = JSON.stringify(Object.values(clubs).filter(club => !getClubCrestUrl(club)).map(club => [club.id, club.name, club.shortName, club.country, club.league]));
  useEffect(() => {
    let cancelled = false;
    const requested = clubs;
    resolveClubCrests(Object.values(requested)).then(logos => {
      if (cancelled || Object.keys(logos).length === 0) return;
      setClubs(current => {
        const updated = { ...current };
        let changed = false;
        for (const [id, url] of Object.entries(logos)) {
          if (current[id] && current[id].name === requested[id]?.name && !getClubCrestUrl(current[id])) {
            updated[id] = { ...current[id], logoUrl: url }; changed = true;
          }
        }
        if (!changed) return current;
        setGlobalClubs(updated);
        return updated;
      });
    });
    return () => { cancelled = true; };
  }, [missingCrestsKey]);

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
