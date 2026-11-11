import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { togglePollStatus, deletePoll } from "@/lib/pollsStorage";

export const dynamic = "force-dynamic";

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
