import type {
  IFingerprintService,
  FingerprintServiceStatus,
  FingerprintCaptureResult,
  FingerprintMatchResult,
} from "./types";

const SERVICE_URL =
  process.env.NEXT_PUBLIC_FINGERPRINT_SERVICE_URL ?? "https://localhost:8443";

const SECUGEN_ERRORS: Record<number, string> = {
  0: "Succes",
  51: "Peripherique non trouve",
  52: "Peripherique deja ouvert",
  53: "Peripherique non ouvert",
  54: "Peripherique IO erreur",
  55: "Timeout capture",
  56: "Image non disponible",
  57: "Pilote invalide",
  58: "Image trop claire",
  59: "Image trop sombre",
};

export class SecuGenService implements IFingerprintService {
  private licenseKey: string;

  constructor() {
    this.licenseKey = process.env.NEXT_PUBLIC_SECUGEN_LICENSE ?? "";
  }

  async verifierDisponibilite(): Promise<FingerprintServiceStatus> {
    try {
      const response = await fetch(`${SERVICE_URL}/SGIFPCapture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Ession: "default",
          Timeout: 1000,
          Quality: 10,
          licstr: this.licenseKey,
          templateFormat: "ISO",
        }),
      });

      if (!response.ok) {
        return {
          available: true,
          deviceConnected: false,
          errorMessage: "Service disponible mais lecteur non connecte",
        };
      }

      const data = await response.json();

      if (data.ErrorCode === 0) {
        return { available: true, deviceConnected: true };
      }

      return {
        available: true,
        deviceConnected: data.ErrorCode !== 51,
        errorMessage: SECUGEN_ERRORS[data.ErrorCode] ?? `Erreur ${data.ErrorCode}`,
      };
    } catch {
      return {
        available: false,
        deviceConnected: false,
        errorMessage: "Service SecuGen WebAPI non disponible",
      };
    }
  }

  async capturer(): Promise<FingerprintCaptureResult> {
    try {
      const response = await fetch(`${SERVICE_URL}/SGIFPCapture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Session: "default",
          Timeout: 10000,
          Quality: 40,
          licstr: this.licenseKey,
          templateFormat: "ISO",
          imageWSQRate: 0.75,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          errorMessage: `Erreur HTTP ${response.status}`,
        };
      }

      const data = await response.json();

      if (data.ErrorCode !== 0) {
        return {
          success: false,
          errorCode: data.ErrorCode,
          errorMessage:
            SECUGEN_ERRORS[data.ErrorCode] ?? `Erreur SecuGen ${data.ErrorCode}`,
        };
      }

      return {
        success: true,
        templateBase64: data.TemplateBase64,
        imageDataUrl: data.BMPBase64
          ? `data:image/bmp;base64,${data.BMPBase64}`
          : undefined,
        quality: data.MatchingScore ?? data.Quality ?? 0,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Erreur de communication avec le lecteur",
      };
    }
  }

  async comparer(
    template1: string,
    template2: string
  ): Promise<FingerprintMatchResult> {
    try {
      const response = await fetch(`${SERVICE_URL}/SGIMatchScore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template1: template1,
          template2: template2,
          licstr: this.licenseKey,
          templateFormat: "ISO",
        }),
      });

      if (!response.ok) {
        return {
          isMatch: false,
          score: 0,
          errorMessage: `Erreur HTTP ${response.status}`,
        };
      }

      const data = await response.json();

      if (data.ErrorCode !== undefined && data.ErrorCode !== 0) {
        return {
          isMatch: false,
          score: 0,
          errorMessage:
            SECUGEN_ERRORS[data.ErrorCode] ?? `Erreur SecuGen ${data.ErrorCode}`,
        };
      }

      const score = data.MatchingScore ?? 0;
      return {
        isMatch: score >= 100,
        score,
      };
    } catch (error) {
      return {
        isMatch: false,
        score: 0,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Erreur lors de la comparaison",
      };
    }
  }
}
