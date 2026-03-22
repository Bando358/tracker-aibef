"use client";

import { useState } from "react";
import { PointageFingerprint } from "./pointage-fingerprint";
import { PointageForm } from "./pointage-form";
import { PointageList } from "./pointage-list";

interface TodayPointage {
  id: string;
  heureArrivee: Date | string | null;
  pauseDebut: Date | string | null;
  pauseFin: Date | string | null;
  heureDepart: Date | string | null;
  totalHeures: number;
  statut: string;
  retardMinutes: number;
}

interface PointageWrapperProps {
  userId: string;
  todayPointage: TodayPointage | null;
  antenneId?: string | null;
  apiKey: string;
}

export function PointageWrapper({
  userId,
  todayPointage,
  antenneId,
  apiKey,
}: PointageWrapperProps) {
  const [mode, setMode] = useState<"fingerprint" | "manual">("fingerprint");

  if (mode === "manual") {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div className="space-y-3">
            <PointageForm userId={userId} todayPointage={todayPointage} />
            <button
              onClick={() => setMode("fingerprint")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Revenir au pointage biometrique
            </button>
          </div>
          <div>
            <PointageList userId={userId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[500px_1fr]">
        <PointageFingerprint
          antenneId={antenneId}
          apiKey={apiKey}
          onFallback={() => setMode("manual")}
        />
        <div>
          <PointageList userId={userId} />
        </div>
      </div>
    </div>
  );
}
