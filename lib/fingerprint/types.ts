// ======================== Service Status ========================

export interface FingerprintServiceStatus {
  available: boolean;
  deviceConnected: boolean;
  errorMessage?: string;
}

// ======================== Capture ========================

export interface FingerprintCaptureResult {
  success: boolean;
  templateBase64?: string;
  imageDataUrl?: string;
  quality?: number;
  errorCode?: number;
  errorMessage?: string;
}

// ======================== Match ========================

export interface FingerprintMatchResult {
  isMatch: boolean;
  score: number;
  errorMessage?: string;
}

// ======================== Service Interface ========================

export interface IFingerprintService {
  /** Verifie si le lecteur est disponible et connecte */
  verifierDisponibilite(): Promise<FingerprintServiceStatus>;

  /** Capture une empreinte et retourne le template + image */
  capturer(): Promise<FingerprintCaptureResult>;

  /** Compare deux templates et retourne le score de correspondance */
  comparer(
    template1: string,
    template2: string
  ): Promise<FingerprintMatchResult>;
}

// ======================== Enrollment ========================

export interface EnrollmentPayload {
  userId: string;
  doigt: number;
  templateBase64: string;
  qualite: number;
}

// ======================== Identification ========================

export interface IdentificationCandidate {
  userId: string;
  nom: string;
  prenom: string;
  doigt: number;
  templateBase64: string;
}

export interface IdentificationResult {
  success: boolean;
  userId?: string;
  nom?: string;
  prenom?: string;
  score?: number;
  errorMessage?: string;
}

// ======================== Doigts ========================

export const DOIGT_LABELS: Record<number, string> = {
  1: "Pouce droit",
  2: "Index droit",
  3: "Majeur droit",
  4: "Annulaire droit",
  5: "Auriculaire droit",
  6: "Pouce gauche",
  7: "Index gauche",
  8: "Majeur gauche",
  9: "Annulaire gauche",
  10: "Auriculaire gauche",
};

export const MATCH_THRESHOLD = 100;
export const MIN_QUALITY = 40;
export const ENROLLMENT_CAPTURES = 3;
