"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { checkIn, checkOut } from "@/lib/actions/pointage.actions";
import { formatTimeFr } from "@/lib/date-utils";
import { LogIn, LogOut, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TodayPointage {
  id: string;
  heureArrivee: Date | string | null;
  heureDepart: Date | string | null;
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

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkIn(userId);
      if (result.success) {
        toast.success("Check-in effectue avec succes");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleCheckOut() {
    startTransition(async () => {
      const result = await checkOut(userId);
      if (result.success) {
        toast.success("Check-out effectue avec succes");
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
          <p className="text-4xl font-bold tabular-nums">
            {currentTime.toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
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
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Statut</span>
              <StatusBadge status={todayPointage.statut} />
            </div>
            {todayPointage.heureArrivee && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Arrivee</span>
                <span className="text-sm font-medium">
                  {formatTimeFr(todayPointage.heureArrivee)}
                </span>
              </div>
            )}
            {todayPointage.heureDepart && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Depart</span>
                <span className="text-sm font-medium">
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
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col gap-3">
          {!hasCheckedIn && (
            <Button
              size="lg"
              className="h-16 text-lg"
              onClick={handleCheckIn}
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
            <Button
              size="lg"
              variant="outline"
              className="h-16 text-lg"
              onClick={handleCheckOut}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-5 w-5" />
              )}
              Pointer le depart
            </Button>
          )}

          {hasCheckedIn && hasCheckedOut && (
            <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-green-700 font-medium">
                Pointage du jour termine
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
