"use client";

import { useState } from "react";
import {
  Clock,
  Users,
  Fingerprint,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { PointageSaisieGrid } from "@/components/pointages/pointage-saisie-grid";
import { formatTimeFr } from "@/lib/date-utils";
import { ROLE_LABELS } from "@/lib/constants";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface EmployeePointage {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  antenne?: { nom: string } | null;
  pointage: {
    id: string;
    heureArrivee: Date | string | null;
    pauseDebut: Date | string | null;
    pauseFin: Date | string | null;
    heureDepart: Date | string | null;
    totalHeures: number;
    statut: string;
    retardMinutes: number;
  } | null;
}

interface PointageManagerClientProps {
  employees: EmployeePointage[];
  currentUserId: string;
  antenneName: string;
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export function PointageManagerClient({
  employees,
  currentUserId,
  antenneName,
}: PointageManagerClientProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePointage | null>(null);

  // Stats du jour
  const total = employees.length;
  const presents = employees.filter(
    (e) => e.pointage?.statut === "PRESENT" || e.pointage?.statut === "RETARD"
  ).length;
  const absents = employees.filter((e) =>
    e.pointage && ["ABSENT", "ABSENCE_AUTORISEE", "ABSENCE_NON_AUTORISEE"].includes(e.pointage.statut)
  ).length;
  const nonPointes = employees.filter((e) => !e.pointage).length;

  return (
    <div className="space-y-6">
      {/* Stats rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">{presents}</p>
          <p className="text-xs text-green-600 dark:text-green-500">Presents</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">{absents}</p>
          <p className="text-xs text-red-600 dark:text-red-500">Absents</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-950/20 p-3 text-center">
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-400">{nonPointes}</p>
          <p className="text-xs text-slate-600 dark:text-slate-500">Non pointes</p>
        </div>
      </div>

      {/* Layout 2 colonnes : liste employes + grille saisie */}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Colonne gauche : liste des employes */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Personnel ({total})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full text-left px-4 py-3 border-b border-border/40 transition-colors hover:bg-muted/50 ${
                    selectedEmployee?.id === emp.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {emp.prenom} {emp.nom}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[emp.role] ?? emp.role}
                        {emp.antenne?.nom ? ` · ${emp.antenne.nom}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {emp.pointage ? (
                        <StatusBadge status={emp.pointage.statut} />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          -
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {employees.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Aucun employe
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colonne droite : grille de saisie ou message d'accueil */}
        <div>
          {!selectedEmployee ? (
            <Card className="border-border/60 shadow-sm">
              <CardContent className="py-16 text-center text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium">Saisie du cahier de pointage</p>
                <p className="text-sm mt-1">
                  Selectionnez un employe pour saisir ses heures de presence
                </p>
              </CardContent>
            </Card>
          ) : (
            <PointageSaisieGrid
              userId={selectedEmployee.id}
              userName={`${selectedEmployee.prenom} ${selectedEmployee.nom}`}
              userFonction={ROLE_LABELS[selectedEmployee.role] ?? selectedEmployee.role}
              antenneName={antenneName}
            />
          )}
        </div>
      </div>
    </div>
  );
}
