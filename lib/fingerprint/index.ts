import type { IFingerprintService } from "./types";
import { SecuGenService } from "./secugen-service";
import { MockFingerprintService } from "./mock-service";

let serviceInstance: IFingerprintService | null = null;

/**
 * Factory: retourne le service d'empreinte adapte.
 * - En mode mock (NEXT_PUBLIC_FINGERPRINT_MOCK=true) : service simule
 * - Sinon : service SecuGen WebAPI reel
 */
export function getFingerprintService(): IFingerprintService {
  if (serviceInstance) return serviceInstance;

  const isMock = process.env.NEXT_PUBLIC_FINGERPRINT_MOCK === "true";

  serviceInstance = isMock
    ? new MockFingerprintService()
    : new SecuGenService();

  return serviceInstance;
}

export { type IFingerprintService } from "./types";
