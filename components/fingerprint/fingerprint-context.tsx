"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getFingerprintService } from "@/lib/fingerprint";
import type {
  IFingerprintService,
  FingerprintServiceStatus,
} from "@/lib/fingerprint/types";

interface FingerprintContextValue {
  service: IFingerprintService;
  status: FingerprintServiceStatus;
  isLoading: boolean;
  refreshStatus: () => Promise<void>;
}

const FingerprintContext = createContext<FingerprintContextValue | null>(null);

const STATUS_REFRESH_INTERVAL = 30_000; // 30 secondes

export function FingerprintProvider({ children }: { children: ReactNode }) {
  const [service] = useState(() => getFingerprintService());
  const [status, setStatus] = useState<FingerprintServiceStatus>({
    available: false,
    deviceConnected: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await service.verifierDisponibilite();
      setStatus(result);
    } catch {
      setStatus({
        available: false,
        deviceConnected: false,
        errorMessage: "Erreur lors de la verification du lecteur",
      });
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, STATUS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <FingerprintContext.Provider
      value={{ service, status, isLoading, refreshStatus }}
    >
      {children}
    </FingerprintContext.Provider>
  );
}

export function useFingerprintService(): FingerprintContextValue {
  const ctx = useContext(FingerprintContext);
  if (!ctx) {
    throw new Error(
      "useFingerprintService doit etre utilise dans un FingerprintProvider"
    );
  }
  return ctx;
}
