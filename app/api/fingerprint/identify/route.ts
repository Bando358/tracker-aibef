import { NextRequest, NextResponse } from "next/server";
import { getTemplatesPourIdentification } from "@/lib/actions/empreinte.actions";

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-fingerprint-api-key");
  const expected = process.env.FINGERPRINT_API_KEY;
  return !!apiKey && !!expected && apiKey === expected;
}

/**
 * POST /api/fingerprint/identify
 * Retourne tous les templates dechiffres pour identification 1:N cote client.
 * Protege par cle API (kiosque sans session utilisateur).
 */
export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Cle API invalide" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const antenneId = body.antenneId ?? null;

    const templates = await getTemplatesPourIdentification(antenneId);

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la recuperation des templates",
      },
      { status: 500 }
    );
  }
}
