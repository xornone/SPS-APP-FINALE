import { NextResponse } from "next/server";
import { submitPollVote } from "@/lib/pollsStorage";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const pollId = params.id;
    const body = await request.json().catch(() => ({}));

    const voterName = String(body.voter_name || "").trim();
    const voterToken = String(body.voter_token || "").trim();
    const selectedOptionIds = Array.isArray(body.selected_option_ids)
      ? (body.selected_option_ids as string[])
      : [];

    if (!pollId) {
      return NextResponse.json({ error: "Sondage manquant." }, { status: 400 });
    }

    if (!voterName) {
      return NextResponse.json({ error: "Merci d'indiquer ton prénom et ton nom." }, { status: 400 });
    }

    if (!voterToken) {
      return NextResponse.json({ error: "Jeton de vote manquant." }, { status: 400 });
    }

    const result = await submitPollVote({
      poll_id: pollId,
      voter_name: voterName,
      voter_token: voterToken,
      selected_option_ids: selectedOptionIds,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
