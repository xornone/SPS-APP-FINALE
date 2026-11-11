import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { createPoll } from "@/lib/pollsStorage";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const body = await request.json().catch(() => ({}));
    const question = String(body.question || "").trim();
    const description = body.description ? String(body.description).trim() : undefined;
    const allowMultiple = Boolean(body.allow_multiple);
    const options = Array.isArray(body.options)
      ? body.options.map((o: unknown) => String(o || "").trim()).filter(Boolean)
      : [];

    if (!question) {
      return NextResponse.json({ error: "La question du sondage est obligatoire." }, { status: 400 });
    }

    if (options.length < 2) {
      return NextResponse.json({ error: "Indiquez au moins 2 options de réponse." }, { status: 400 });
    }

    const poll = await createPoll({
      question,
      description,
      allow_multiple: allowMultiple,
      options,
      created_by: guard.user.email,
    });

    return NextResponse.json({ ok: true, poll }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/admin/polls] Erreur création sondage :", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
