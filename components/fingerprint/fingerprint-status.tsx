"use client";

import { useFingerprintService } from "./fingerprint-context";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Loader2 } from "lucide-react";

export function FingerprintStatus() {
  const { status, isLoading } = useFingerprintService();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Verification...
      </Badge>
    );
  }

  if (!status.available) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Fingerprint className="h-3 w-3" />
        Service indisponible
      </Badge>
    );
  }

  if (!status.deviceConnected) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Fingerprint className="h-3 w-3" />
        Lecteur deconnecte
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-green-500 text-green-700 bg-green-50"
    >
      <Fingerprint className="h-3 w-3" />
      Lecteur pret
    </Badge>
  );
}
