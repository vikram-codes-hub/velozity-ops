
// frontend/src/hooks/useDeveloperStats.ts
//
// Fetches developer project association metrics for the Admin dashboard.

import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import type { DeveloperStat } from "../types/domain";

export interface UseDeveloperStatsResult {
  developers: DeveloperStat[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDeveloperStats(): UseDeveloperStatsResult {
  const [developers, setDevelopers] = useState<DeveloperStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const refetch = () => setReloadTrigger((prev) => prev + 1);

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ developers: DeveloperStat[] }>("/api/users/developer-stats");
        if (!cancelled) {
          setDevelopers(response.data.developers ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load developer stats.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, [reloadTrigger]);

  return { developers, isLoading, error, refetch };
}
