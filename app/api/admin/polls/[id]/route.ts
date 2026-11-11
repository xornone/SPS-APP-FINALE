import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { togglePollStatus, deletePoll, updatePoll } from "@/lib/pollsStorage";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const pollId = params.id;
    const body = await request.json().catch(() => ({}));
    const { question, description, allow_multiple, options } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ error: "La question ne peut pas être vide." }, { status: 400 });
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: "Au moins 2 options sont requises." }, { status: 400 });
    }

    const success = await updatePoll({
      poll_id: pollId,
      question,
      description,
      allow_multiple: Boolean(allow_multiple),
      options,
    });

    if (!success) {
      return NextResponse.json({ error: "Sondage introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, message: "Sondage modifié avec succès." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const pollId = params.id;
    const body = await request.json().catch(() => ({}));

    // Si mise à jour complète passée en PATCH
    if (body.question !== undefined) {
      const { question, description, allow_multiple, options } = body;
      const success = await updatePoll({
        poll_id: pollId,
        question,
        description,
        allow_multiple: Boolean(allow_multiple),
        options: options || [],
      });
      if (!success) {
        return NextResponse.json({ error: "Sondage introuvable." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    // Sinon bascule d'état clôturé / ouvert
    const isClosed = Boolean(body.is_closed);
    const success = await togglePollStatus(pollId, isClosed);
    if (!success) {
      return NextResponse.json({ error: "Sondage introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, is_closed: isClosed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error }, { status: guard.status });
    }

    const pollId = params.id;
    const success = await deletePoll(pollId);
    if (!success) {
      return NextResponse.json({ error: "Sondage introuvable." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
