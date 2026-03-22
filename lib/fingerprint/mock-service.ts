import type {
  IFingerprintService,
  FingerprintServiceStatus,
  FingerprintCaptureResult,
  FingerprintMatchResult,
} from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let captureCounter = 0;

/**
 * Service mock pour developper/tester sans lecteur d'empreinte physique.
 * Genere des templates deterministes bases sur un compteur interne.
 */
export class MockFingerprintService implements IFingerprintService {
  async verifierDisponibilite(): Promise<FingerprintServiceStatus> {
    await delay(200);
    return {
      available: true,
      deviceConnected: true,
    };
  }

  async capturer(): Promise<FingerprintCaptureResult> {
    await delay(800);
    captureCounter++;

    // Generer un template deterministe (base64 fictif)
    const mockData = `MOCK_TEMPLATE_${captureCounter}_${Date.now()}`;
    const templateBase64 = Buffer.from(mockData).toString("base64");

    // Qualite aleatoire entre 60 et 100
    const quality = 60 + Math.floor(Math.random() * 41);

    return {
      success: true,
      templateBase64,
      quality,
      // Pas d'image pour le mock
      imageDataUrl: undefined,
    };
  }

  async comparer(
    template1: string,
    template2: string
  ): Promise<FingerprintMatchResult> {
    await delay(300);

    // En mode mock : considerer que les templates avec le meme prefixe "matchent"
    // Cela permet de tester le flux enrollment → identification
    const decoded1 = Buffer.from(template1, "base64").toString("utf-8");
    const decoded2 = Buffer.from(template2, "base64").toString("utf-8");

    // Extraire l'origine (tout sauf le timestamp)
    const origin1 = decoded1.replace(/_\d+$/, "");
    const origin2 = decoded2.replace(/_\d+$/, "");

    if (origin1 === origin2) {
      return { isMatch: true, score: 200 };
    }

    // Score faible pour non-match
    return { isMatch: false, score: Math.floor(Math.random() * 30) };
  }
}
