"use client";

import { useState, useEffect } from "react";
import { FingerprintProvider, useFingerprintService } from "@/components/fingerprint/fingerprint-context";
import { FingerprintStatus } from "@/components/fingerprint/fingerprint-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Fingerprint,
  Loader2,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Hand,
} from "lucide-react";
import { toast } from "sonner";
import { MATCH_THRESHOLD } from "@/lib/fingerprint/types";
import type { IdentificationCandidate } from "@/lib/fingerprint/types";

type PointageStep =
  | "idle"
  | "capturing"
  | "identifying"
  | "identified"
  | "pointage"
  | "success"
  | "error";

interface PointageFingerprintProps {
  antenneId?: string | null;
  apiKey: string;
  onFallback: () => void;
}

export function PointageFingerprint(props: PointageFingerprintProps) {
  return (
    <FingerprintProvider>
      <PointageFingerprintInner {...props} />
    </FingerprintProvider>
  );
}

function PointageFingerprintInner({
  antenneId,
  apiKey,
  onFallback,
}: PointageFingerprintProps) {
  const { service, status } = useFingerprintService();
  const [step, setStep] = useState<PointageStep>("idle");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [identifiedUser, setIdentifiedUser] = useState<{
    userId: string;
    nom: string;
    prenom: string;
    score: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Horloge temps reel
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset automatique apres succes
  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        setStep("idle");
        setIdentifiedUser(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  async function handleScan() {
    setStep("capturing");
    setErrorMessage("");
    setIdentifiedUser(null);

    try {
      // 1. Capture
      const captureResult = await service.capturer();
      if (!captureResult.success || !captureResult.templateBase64) {
        setErrorMessage(captureResult.errorMessage ?? "Echec de la capture");
        setStep("error");
        return;
      }

      // 2. Recuperer les templates depuis le serveur
      setStep("identifying");
      const response = await fetch("/api/fingerprint/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint-api-key": apiKey,
        },
        body: JSON.stringify({ antenneId }),
      });

      if (!response.ok) {
        setErrorMessage("Erreur lors de la recuperation des empreintes");
        setStep("error");
        return;
      }

      const { templates } = (await response.json()) as {
        templates: IdentificationCandidate[];
      };

      if (templates.length === 0) {
        setErrorMessage("Aucune empreinte enrolee dans le systeme");
        setStep("error");
        return;
      }

      // 3. Comparaison 1:N (cote client via le service)
      let bestMatch: {
        userId: string;
        nom: string;
        prenom: string;
        score: number;
      } | null = null;

      for (const candidate of templates) {
        const matchResult = await service.comparer(
          captureResult.templateBase64,
          candidate.templateBase64
        );
        if (
          matchResult.isMatch &&
          matchResult.score >= MATCH_THRESHOLD &&
          matchResult.score > (bestMatch?.score ?? 0)
        ) {
          bestMatch = {
            userId: candidate.userId,
            nom: candidate.nom,
            prenom: candidate.prenom,
            score: matchResult.score,
          };
        }
      }

      if (!bestMatch) {
        setErrorMessage("Empreinte non reconnue. Veuillez reessayer.");
        setStep("error");
        return;
      }

      setIdentifiedUser(bestMatch);
      setStep("identified");
    } catch {
      setErrorMessage("Erreur inattendue lors du scan");
      setStep("error");
    }
  }

  async function handlePointage(action: "arrivee" | "depart") {
    if (!identifiedUser) return;

    setStep("pointage");
    try {
      const response = await fetch("/api/fingerprint/pointage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fingerprint-api-key": apiKey,
        },
        body: JSON.stringify({
          userId: identifiedUser.userId,
          action,
          score: identifiedUser.score,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Erreur lors du pointage");
        setStep("identified");
        return;
      }

      toast.success(
        `${action === "arrivee" ? "Arrivee" : "Depart"} enregistre(e) pour ${identifiedUser.prenom} ${identifiedUser.nom}`
      );
      setStep("success");
    } catch {
      toast.error("Erreur de communication avec le serveur");
      setStep("identified");
    }
  }

  const isReady = status.available && status.deviceConnected;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Pointage biometrique
          </CardTitle>
          <FingerprintStatus />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horloge */}
        <div className="text-center">
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

        {/* Etape : Attente */}
        {step === "idle" && (
          <Button
            onClick={handleScan}
            disabled={!isReady}
            className="w-full h-20 text-lg"
          >
            <Fingerprint className="mr-3 h-6 w-6" />
            Scannez votre empreinte
          </Button>
        )}

        {/* Etape : Capture en cours */}
        {step === "capturing" && (
          <div className="text-center space-y-4 py-6">
            <div className="relative mx-auto w-20 h-20">
              <Fingerprint className="w-20 h-20 text-primary animate-pulse" />
            </div>
            <p className="text-lg font-medium">Posez votre doigt sur le lecteur...</p>
          </div>
        )}

        {/* Etape : Identification en cours */}
        {step === "identifying" && (
          <div className="text-center space-y-4 py-6">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="text-lg font-medium">Identification en cours...</p>
          </div>
        )}

        {/* Etape : Identifie — choix arrivee/depart */}
        {step === "identified" && identifiedUser && (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-lg font-bold text-green-800">
                {identifiedUser.prenom} {identifiedUser.nom}
              </p>
              <p className="text-sm text-green-600">
                Identifie(e) avec un score de {identifiedUser.score}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => handlePointage("arrivee")}
                className="h-16 text-base"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Arrivee
              </Button>
              <Button
                onClick={() => handlePointage("depart")}
                variant="outline"
                className="h-16 text-base"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Depart
              </Button>
            </div>
          </div>
        )}

        {/* Etape : Pointage en cours */}
        {step === "pointage" && (
          <div className="text-center space-y-4 py-6">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="text-lg font-medium">Enregistrement du pointage...</p>
          </div>
        )}

        {/* Etape : Succes */}
        {step === "success" && (
          <div className="text-center space-y-4 py-6">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
            <p className="text-lg font-bold text-green-700">
              Pointage enregistre !
            </p>
            <p className="text-sm text-muted-foreground">
              Retour a l&apos;ecran d&apos;accueil dans quelques secondes...
            </p>
          </div>
        )}

        {/* Etape : Erreur */}
        {step === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
            <Button onClick={handleScan} className="w-full h-14">
              <Fingerprint className="mr-2 h-5 w-5" />
              Reessayer
            </Button>
          </div>
        )}

        {/* Lien fallback manuel */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onFallback}
          >
            <Hand className="mr-2 h-4 w-4" />
            Pointage manuel (sans lecteur)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
