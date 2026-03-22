import { NextRequest, NextResponse } from "next/server";
import { checkIn, checkOut } from "@/lib/actions/pointage.actions";
import prisma from "@/lib/prisma";

function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-fingerprint-api-key");
  const expected = process.env.FINGERPRINT_API_KEY;
  return !!apiKey && !!expected && apiKey === expected;
}

/**
 * POST /api/fingerprint/pointage
 * Effectue un pointage biometrique (arrivee ou depart).
 * Body: { userId, action: "arrivee"|"depart", score }
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
    const { userId, action, score } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "userId et action requis" },
        { status: 400 }
      );
    }

    if (action !== "arrivee" && action !== "depart") {
      return NextResponse.json(
        { error: "action doit etre 'arrivee' ou 'depart'" },
        { status: 400 }
      );
    }

    // Effectuer le pointage
    const result =
      action === "arrivee" ? await checkIn(userId) : await checkOut(userId);

    // Log biometrique
    const evenement =
      action === "arrivee"
        ? "POINTAGE_ARRIVEE_BIOMETRIQUE"
        : "POINTAGE_DEPART_BIOMETRIQUE";

    await prisma.empreinteLog.create({
      data: {
        evenement: evenement as "POINTAGE_ARRIVEE_BIOMETRIQUE" | "POINTAGE_DEPART_BIOMETRIQUE",
        score: score ?? null,
        details: result.success
          ? `Pointage ${action} reussi`
          : `Pointage ${action} echoue: ${result.error}`,
        user: { connect: { id: userId } },
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      pointage: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors du pointage biometrique",
      },
      { status: 500 }
    );
  }
}
