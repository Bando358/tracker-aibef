import { NextResponse } from "next/server";
import { executeRelances } from "@/lib/actions/relance.actions";
import { detectLateActivites } from "@/lib/actions/activite.actions";

export async function GET(request: Request) {
  // Verification par cle API
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const [relances, lateResult] = await Promise.all([
      executeRelances(),
      detectLateActivites(),
    ]);

    return NextResponse.json({
      success: true,
      relances,
      lateActivites: lateResult.success ? lateResult.data : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}
