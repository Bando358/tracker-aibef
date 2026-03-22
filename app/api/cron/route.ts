import { NextResponse } from "next/server";
import { executeRelances } from "@/lib/actions/relance.actions";
import { detectLateActivites } from "@/lib/actions/activite.actions";
import { resetRecommandationsPeriodiques } from "@/lib/actions/recommandation.actions";

export async function GET(request: Request) {
  // Verification par cle API
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  try {
    const [relances, lateResult, resetResult] = await Promise.all([
      executeRelances(),
      detectLateActivites(),
      resetRecommandationsPeriodiques(),
    ]);

    return NextResponse.json({
      success: true,
      relances,
      lateActivites: lateResult.success ? lateResult.data : null,
      recommandationsReset: resetResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur" },
      { status: 500 }
    );
  }
}
