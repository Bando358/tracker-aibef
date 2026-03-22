import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { enrollerEmpreinte } from "@/lib/actions/empreinte.actions";

/**
 * POST /api/fingerprint/enroll
 * Enrole une empreinte. Requiert une session admin authentifiee.
 * Body: { userId, doigt, templateBase64, qualite }
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (role !== "SUPER_ADMIN" && role !== "RESPONSABLE_ANTENNE") {
    return NextResponse.json({ error: "Acces non autorise" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { userId, doigt, templateBase64, qualite } = body;

    if (!userId || !doigt || !templateBase64 || qualite === undefined) {
      return NextResponse.json(
        { error: "Tous les champs sont requis: userId, doigt, templateBase64, qualite" },
        { status: 400 }
      );
    }

    const result = await enrollerEmpreinte({
      userId,
      doigt: Number(doigt),
      templateBase64,
      qualite: Number(qualite),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'enrolement",
      },
      { status: 500 }
    );
  }
}
