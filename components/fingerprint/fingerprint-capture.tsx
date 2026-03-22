"use client";

import { useState } from "react";
import { useFingerprintService } from "./fingerprint-context";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { MIN_QUALITY } from "@/lib/fingerprint/types";
import type { FingerprintCaptureResult } from "@/lib/fingerprint/types";

interface FingerprintCaptureProps {
  onCapture: (result: FingerprintCaptureResult) => void;
  label?: string;
  disabled?: boolean;
  showImage?: boolean;
}

export function FingerprintCapture({
  onCapture,
  label = "Scanner l'empreinte",
  disabled = false,
  showImage = true,
}: FingerprintCaptureProps) {
  const { service, status } = useFingerprintService();
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastResult, setLastResult] = useState<FingerprintCaptureResult | null>(
    null
  );

  async function handleCapture() {
    setIsCapturing(true);
    setLastResult(null);

    try {
      const result = await service.capturer();
      setLastResult(result);
      onCapture(result);
    } catch {
      const errorResult: FingerprintCaptureResult = {
        success: false,
        errorMessage: "Erreur inattendue lors de la capture",
      };
      setLastResult(errorResult);
      onCapture(errorResult);
    } finally {
      setIsCapturing(false);
    }
  }

  const isReady = status.available && status.deviceConnected;

  return (
    <div className="space-y-3">
      <Button
        onClick={handleCapture}
        disabled={disabled || isCapturing || !isReady}
        className="w-full h-14 text-base"
        variant={lastResult?.success ? "outline" : "default"}
      >
        {isCapturing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Posez votre doigt...
          </>
        ) : (
          <>
            <Fingerprint className="mr-2 h-5 w-5" />
            {label}
          </>
        )}
      </Button>

      {/* Resultat de la capture */}
      {lastResult && !isCapturing && (
        <div
          className={`rounded-lg border p-3 ${
            lastResult.success
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          {lastResult.success ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Capture reussie</span>
              </div>
              {lastResult.quality !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Qualite</span>
                  <span
                    className={`font-medium ${
                      lastResult.quality >= MIN_QUALITY
                        ? "text-green-700"
                        : "text-amber-600"
                    }`}
                  >
                    {lastResult.quality}%
                  </span>
                </div>
              )}
              {showImage && lastResult.imageDataUrl && (
                <div className="flex justify-center">
                  <img
                    src={lastResult.imageDataUrl}
                    alt="Empreinte capturee"
                    className="h-32 w-24 rounded border object-contain bg-white"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {lastResult.errorMessage ?? "Echec de la capture"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
