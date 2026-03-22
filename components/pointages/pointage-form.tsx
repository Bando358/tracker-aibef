"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { checkIn, checkOut, startPause, endPause } from "@/lib/actions/pointage.actions";
import { formatTimeFr } from "@/lib/date-utils";
import { LogIn, LogOut, Clock, Loader2, Coffee } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

interface PointageFormProps {
  userId: string;
  todayPointage?: TodayPointage | null;
}

export function PointageForm({ userId, todayPointage }: PointageFormProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Mise a jour de l'heure toutes les secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasCheckedIn = !!todayPointage?.heureArrivee;
  const hasCheckedOut = !!todayPointage?.heureDepart;
  const hasPauseStarted = !!todayPointage?.pauseDebut;
  const hasPauseEnded = !!todayPointage?.pauseFin;
  const isOnPause = hasPauseStarted && !hasPauseEnded;

  function handleAction(action: () => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pointage du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Heure actuelle */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Heure actuelle</p>
          <p className="text-4xl font-bold tabular-nums" suppressHydrationWarning>
            {currentTime.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          <p className="text-sm text-muted-foreground mt-1" suppressHydrationWarning>
            {currentTime.toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Statut actuel */}
        {todayPointage && (
          <div className="rounded-xl border border-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Statut</span>
              <StatusBadge status={todayPointage.statut} />
            </div>
            {todayPointage.heureArrivee && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <LogIn className="h-3.5 w-3.5" /> Arrivee
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatTimeFr(todayPointage.heureArrivee)}
                </span>
              </div>
            )}
            {todayPointage.pauseDebut && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5" /> Pause
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatTimeFr(todayPointage.pauseDebut)}
                  {todayPointage.pauseFin
                    ? ` - ${formatTimeFr(todayPointage.pauseFin)}`
                    : " (en cours)"}
                </span>
              </div>
            )}
            {todayPointage.heureDepart && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <LogOut className="h-3.5 w-3.5" /> Depart
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatTimeFr(todayPointage.heureDepart)}
                </span>
              </div>
            )}
            {todayPointage.retardMinutes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Retard</span>
                <span className="text-sm font-medium text-amber-600">
                  {todayPointage.retardMinutes} min
                </span>
              </div>
            )}
            {todayPointage.totalHeures > 0 && (
              <div className="flex items-center justify-between border-t border-border/40 pt-2">
                <span className="text-sm font-medium">Total heures</span>
                <span className="text-sm font-bold tabular-nums">
                  {todayPointage.totalHeures.toFixed(1)}h
                </span>
              </div>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3">
          {!hasCheckedIn && (
            <Button
              size="lg"
              className="h-14 text-base"
              onClick={() => handleAction(() => checkIn(userId), "Arrivee enregistree")}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-5 w-5" />
              )}
              Pointer l&apos;arrivee
            </Button>
          )}

          {hasCheckedIn && !hasCheckedOut && (
            <div className="grid grid-cols-2 gap-2">
              {/* Bouton Pause */}
              {!hasPauseStarted && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-14 text-base"
                  onClick={() => handleAction(() => startPause(userId), "Pause commencee")}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Coffee className="mr-2 h-4 w-4" />
                  )}
                  Pause
                </Button>
              )}
              {isOnPause && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-14 text-base border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  onClick={() => handleAction(() => endPause(userId), "Pause terminee")}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Coffee className="mr-2 h-4 w-4" />
                  )}
                  Fin pause
                </Button>
              )}
              {hasPauseEnded && (
                <div className="flex items-center justify-center rounded-xl bg-muted/50 text-sm text-muted-foreground">
                  Pause terminee
                </div>
              )}

              {/* Bouton Depart */}
              <Button
                size="lg"
                variant="outline"
                className="h-14 text-base"
                onClick={() => handleAction(() => checkOut(userId), "Depart enregistre")}
                disabled={isPending || isOnPause}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                Depart
              </Button>
            </div>
          )}

          {hasCheckedIn && hasCheckedOut && (
            <div className="text-center p-4 rounded-xl bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <p className="text-green-700 dark:text-green-400 font-medium">
                Journee terminee — {todayPointage?.totalHeures?.toFixed(1) ?? "0"}h travaillees
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
