import { describe, it, expect } from "vitest";
import {
  createPoll,
  getAllPolls,
  submitPollVote,
  togglePollStatus,
  deletePoll,
} from "../lib/pollsStorage";

describe("Polls storage & privacy", () => {
  it("creates a poll, accepts votes, and preserves privacy for non-admins", async () => {
    // 1. Création d'un sondage de test
    const poll = await createPoll({
      question: "Test — Quelle couleur pour le bidon SPS ?",
      description: "Test unitaire temporaire",
      allow_multiple: false,
      options: ["Violet SPS", "Noir Mat", "Blanc Nacré"],
      created_by: "test@sps.cc",
    });

    expect(poll.id).toBeDefined();
    expect(poll.options).toHaveLength(3);

    const optViolet = poll.options[0].id;
    const optNoir = poll.options[1].id;

    // 2. Vote de Florian
    const vote1 = await submitPollVote({
      poll_id: poll.id,
      voter_name: "Florian Sicard-Baux",
      voter_token: "test_token_florian",
      selected_option_ids: [optViolet],
    });
    expect(vote1.ok).toBe(true);

    // 3. Vote de Marina
    const vote2 = await submitPollVote({
      poll_id: poll.id,
      voter_name: "Marina Trégaro",
      voter_token: "test_token_marina",
      selected_option_ids: [optViolet],
    });
    expect(vote2.ok).toBe(true);

    // 4. Vote de Thomas
    const vote3 = await submitPollVote({
      poll_id: poll.id,
      voter_name: "Thomas Trégaro",
      voter_token: "test_token_thomas",
      selected_option_ids: [optNoir],
    });
    expect(vote3.ok).toBe(true);

    // 5. Test de confidentialité : Non-admin (public)
    const publicPolls = await getAllPolls(false, "test_token_thomas", "Thomas Trégaro");
    const testPollPublic = publicPolls.find((p) => p.id === poll.id);
    expect(testPollPublic).toBeDefined();
    expect(testPollPublic?.total_votes).toBe(3);
    expect(testPollPublic?.total_voters).toBe(3);
    // Vérifier que le votant voit son propre vote
    expect(testPollPublic?.user_voted_options).toContain(optNoir);
    // Vérifier que les noms des votants NE SONT PAS exposés au public
    for (const opt of testPollPublic!.options) {
      expect(opt.voters).toBeUndefined();
    }

    // 6. Test vue Admin : les noms doivent être visibles
    const adminPolls = await getAllPolls(true);
    const testPollAdmin = adminPolls.find((p) => p.id === poll.id);
    expect(testPollAdmin).toBeDefined();
    const optVioletAdmin = testPollAdmin?.options.find((o) => o.id === optViolet);
    expect(optVioletAdmin?.votes_count).toBe(2);
    expect(optVioletAdmin?.voters).toBeDefined();
    expect(optVioletAdmin?.voters?.map((v) => v.name)).toContain("Florian Sicard-Baux");
    expect(optVioletAdmin?.voters?.map((v) => v.name)).toContain("Marina Trégaro");

    // 7. Clôture du sondage
    await togglePollStatus(poll.id, true);
    const closedPolls = await getAllPolls(false);
    const closedTestPoll = closedPolls.find((p) => p.id === poll.id);
    expect(closedTestPoll?.is_closed).toBe(true);

    // 8. Nettoyage
    await deletePoll(poll.id);
    const remainingPolls = await getAllPolls(false);
    expect(remainingPolls.find((p) => p.id === poll.id)).toBeUndefined();
  });
});
