import { describe, it, expect } from "vitest";
import {
  createPoll,
  getAllPolls,
  submitPollVote,
  deletePollVote,
  togglePollStatus,
  deletePoll,
  updatePoll,
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

  it("strictly enforces 1 vote per voter with inversions, accents, and aliases, and allows deleting vote", async () => {
    const poll = await createPoll({
      question: "Test Unicité — Choix du maillot",
      allow_multiple: false,
      options: ["Manches courtes", "Manches longues"],
    });

    const optCourt = poll.options[0].id;
    const optLong = poll.options[1].id;

    // Premier vote : Thomas Trégaro avec accents et ordre prénom nom
    await submitPollVote({
      poll_id: poll.id,
      voter_name: "Thomas Trégaro",
      voter_token: "token_browser_1",
      selected_option_ids: [optCourt],
    });

    let currentPolls = await getAllPolls(true);
    let p = currentPolls.find((item) => item.id === poll.id)!;
    expect(p.total_voters).toBe(1);
    expect(p.options[0].votes_count).toBe(1);

    // Deuxième vote : "Trégaro Thomas" (inversion nom prénom) avec un autre token
    await submitPollVote({
      poll_id: poll.id,
      voter_name: "Trégaro Thomas",
      voter_token: "token_browser_2",
      selected_option_ids: [optLong],
    });

    currentPolls = await getAllPolls(true);
    p = currentPolls.find((item) => item.id === poll.id)!;
    // Doit TOUJOURS avoir 1 seul votant unique !
    expect(p.total_voters).toBe(1);
    expect(p.options[0].votes_count).toBe(0);
    expect(p.options[1].votes_count).toBe(1);
    // Le nom affiché côté admin doit être normalisé sans doublon
    expect(p.options[1].voters).toHaveLength(1);
    expect(p.options[1].voters![0].name).toBe("Thomas Trégaro");

    // Troisième vote : "Thomas Tregaro" (sans accent)
    await submitPollVote({
      poll_id: poll.id,
      voter_name: "Thomas Tregaro",
      voter_token: "token_browser_3",
      selected_option_ids: [optCourt],
    });

    currentPolls = await getAllPolls(true);
    p = currentPolls.find((item) => item.id === poll.id)!;
    expect(p.total_voters).toBe(1);
    expect(p.options[0].votes_count).toBe(1);
    expect(p.options[1].votes_count).toBe(0);

    // Suppression du vote par le votant avec son nom inversé
    const delRes = await deletePollVote({
      poll_id: poll.id,
      voter_name: "Trégaro Thomas",
    });
    expect(delRes.ok).toBe(true);

    currentPolls = await getAllPolls(true);
    p = currentPolls.find((item) => item.id === poll.id)!;
    expect(p.total_voters).toBe(0);
    expect(p.total_votes).toBe(0);
    expect(p.options[0].votes_count).toBe(0);
    expect(p.options[1].votes_count).toBe(0);

    // Nettoyage
    await deletePoll(poll.id);
  });

  it("allows admins to update a poll, preserving existing votes on modified options", async () => {
    // 1. Création initiale
    const poll = await createPoll({
      question: "Question initiale",
      description: "Description initiale",
      allow_multiple: false,
      options: ["Option A", "Option B"],
      created_by: "admin@sps.cc",
    });

    const optAId = poll.options[0].id;
    const optBId = poll.options[1].id;

    // 2. Un vote sur l'option A
    await submitPollVote({
      poll_id: poll.id,
      voter_name: "Florian Sicard-Baux",
      voter_token: "token_florian",
      selected_option_ids: [optAId],
    });

    // 3. Modification du sondage par l'admin
    const updateSuccess = await updatePoll({
      poll_id: poll.id,
      question: "Question mise à jour par l'admin",
      description: "Description enrichie avec plus de détails",
      allow_multiple: true,
      options: [
        { id: optAId, title: "Option A (renommée)" },
        { title: "Nouvelle Option C" },
      ],
    });
    expect(updateSuccess).toBe(true);

    // 4. Vérification
    const polls = await getAllPolls(true);
    const updated = polls.find((p) => p.id === poll.id)!;
    expect(updated).toBeDefined();
    expect(updated.question).toBe("Question mise à jour par l'admin");
    expect(updated.description).toBe("Description enrichie avec plus de détails");
    expect(updated.allow_multiple).toBe(true);
    expect(updated.options).toHaveLength(2);

    // Option A renommée a conservé son ID et son vote !
    const updatedOptA = updated.options.find((o) => o.id === optAId);
    expect(updatedOptA).toBeDefined();
    expect(updatedOptA?.title).toBe("Option A (renommée)");
    expect(updatedOptA?.votes_count).toBe(1);

    // Option C ajoutée a 0 vote
    const optC = updated.options.find((o) => o.title === "Nouvelle Option C");
    expect(optC).toBeDefined();
    expect(optC?.votes_count).toBe(0);

    // Option B retirée
    const optB = updated.options.find((o) => o.id === optBId);
    expect(optB).toBeUndefined();

    // 5. Nettoyage
    await deletePoll(poll.id);
  });

  it("supports attaching and updating an image_url on polls", async () => {
    const testImage = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    // 1. Création avec photo
    const poll = await createPoll({
      question: "Sondage avec photo de parcours",
      description: "Voici le parcours pour ce dimanche",
      image_url: testImage,
      allow_multiple: false,
      options: ["Oui je viens", "Non pas dispo"],
      created_by: "admin@sps.cc",
    });

    expect(poll.id).toBeDefined();
    expect(poll.image_url).toBe(testImage);

    // 2. Vérification dans getAllPolls
    let polls = await getAllPolls(false);
    let found = polls.find((p) => p.id === poll.id);
    expect(found).toBeDefined();
    expect(found?.image_url).toBe(testImage);

    // 3. Mise à jour de la photo
    const newImage = "data:image/jpeg;base64,UPDATED_IMAGE_DATA";
    await updatePoll({
      poll_id: poll.id,
      question: poll.question,
      image_url: newImage,
      allow_multiple: false,
      options: poll.options.map((o) => ({ id: o.id, title: o.title })),
    });

    polls = await getAllPolls(false);
    found = polls.find((p) => p.id === poll.id);
    expect(found?.image_url).toBe(newImage);

    // 4. Suppression de la photo
    await updatePoll({
      poll_id: poll.id,
      question: poll.question,
      image_url: null,
      allow_multiple: false,
      options: poll.options.map((o) => ({ id: o.id, title: o.title })),
    });

    polls = await getAllPolls(false);
    found = polls.find((p) => p.id === poll.id);
    expect(found?.image_url).toBeNull();

    // 5. Nettoyage
    await deletePoll(poll.id);
  });

  it("allows creating and voting on a poll with only 1 option (e.g. RSVP / Présence)", async () => {
    // 1. Création d'un sondage avec 1 seule option
    const poll = await createPoll({
      question: "Qui sera présent au repas de fin de saison ?",
      description: "Confirmez votre présence ci-dessous",
      allow_multiple: false,
      options: ["Je serai présent ✋"],
      created_by: "admin@sps.cc",
    });

    expect(poll.id).toBeDefined();
    expect(poll.options).toHaveLength(1);
    const optId = poll.options[0].id;
    expect(poll.options[0].title).toBe("Je serai présent ✋");

    // 2. Vote de l'adhérent
    const voteRes = await submitPollVote({
      poll_id: poll.id,
      voter_name: "Marc Antoine",
      voter_token: "token_marc",
      selected_option_ids: [optId],
    });
    expect(voteRes.ok).toBe(true);

    // 3. Vérification des résultats
    const polls = await getAllPolls(true);
    const found = polls.find((p) => p.id === poll.id)!;
    expect(found).toBeDefined();
    expect(found.total_voters).toBe(1);
    expect(found.total_votes).toBe(1);
    expect(found.options[0].votes_count).toBe(1);
    expect(found.options[0].voters?.[0].name).toBe("Marc Antoine");

    // 4. Nettoyage
    await deletePoll(poll.id);
  });
});
