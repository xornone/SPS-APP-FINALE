import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createPublicClient } from "./supabase/publicClient";
import { createAdminClient } from "./supabase/admin";
import { sendPushToAll } from "./webpush";

export interface VoterDetail {
  name: string;
  voted_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  title: string;
  position: number;
  votes_count: number;
  voters?: VoterDetail[]; // Présent UNIQUEMENT pour les admins connectés
}

export interface Poll {
  id: string;
  question: string;
  description: string | null;
  allow_multiple: boolean;
  is_closed: boolean;
  created_at: string;
  created_by?: string | null;
  options: PollOption[];
  total_votes: number;
  total_voters: number;
  user_voted_options?: string[]; // IDs des options cochées par le visiteur actuel
  user_voter_name?: string | null;
}

export interface RawPollVote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_name: string;
  voter_token: string;
  created_at: string;
}

interface LocalStoreData {
  polls: Array<{
    id: string;
    question: string;
    description: string | null;
    allow_multiple: boolean;
    is_closed: boolean;
    created_at: string;
    created_by?: string | null;
  }>;
  options: Array<{
    id: string;
    poll_id: string;
    title: string;
    position: number;
  }>;
  votes: RawPollVote[];
}

function getFilePath(): string {
  try {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, "polls.json");
  } catch {
    return path.join("/tmp", "sps-polls.json");
  }
}

function readLocalStore(): LocalStoreData {
  try {
    const filePath = getFilePath();
    if (!fs.existsSync(filePath)) {
      return { polls: [], options: [], votes: [] };
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return {
      polls: Array.isArray(data.polls) ? data.polls : [],
      options: Array.isArray(data.options) ? data.options : [],
      votes: Array.isArray(data.votes) ? data.votes : [],
    };
  } catch {
    return { polls: [], options: [], votes: [] };
  }
}

function writeLocalStore(data: LocalStoreData): void {
  try {
    const filePath = getFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Erreur écriture fichier polls :", err);
  }
}

/**
 * Récupère tous les sondages avec leurs options et compteurs.
 * Filtre de confidentialité strict : la liste détaillée des votants n'est transmise
 * QUE si `isAdmin` est à true.
 */
export async function getAllPolls(
  isAdmin: boolean = false,
  voterToken?: string,
  voterName?: string
): Promise<Poll[]> {
  // 1. Essayer via Supabase
  try {
    const supabase = createPublicClient();
    const { data: dbPolls, error: pollError } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (!pollError && dbPolls && dbPolls.length > 0) {
      const pollIds = dbPolls.map((p) => p.id);
      const { data: dbOptions } = await supabase
        .from("poll_options")
        .select("*")
        .in("poll_id", pollIds)
        .order("position", { ascending: true });

      const { data: dbVotes } = await supabase
        .from("poll_votes")
        .select("*")
        .in("poll_id", pollIds);

      const allVotes = (dbVotes || []) as RawPollVote[];
      const allOptions = dbOptions || [];

      return assemblePolls(dbPolls, allOptions, allVotes, isAdmin, voterToken, voterName);
    }
  } catch {
    // Failover silencieux sur le fichier local
  }

  // 2. Fallback sur le fichier JSON local
  const store = readLocalStore();
  return assemblePolls(store.polls, store.options, store.votes, isAdmin, voterToken, voterName);
}

function assemblePolls(
  polls: LocalStoreData["polls"],
  options: LocalStoreData["options"],
  votes: RawPollVote[],
  isAdmin: boolean,
  voterToken?: string,
  voterName?: string
): Poll[] {
  const normVoterName = voterName ? voterName.trim().toLowerCase() : null;

  return polls.map((p) => {
    const pollOptions = options
      .filter((o) => o.poll_id === p.id)
      .sort((a, b) => a.position - b.position);

    const pollVotes = votes.filter((v) => v.poll_id === p.id);
    const uniqueVoterTokens = new Set(pollVotes.map((v) => v.voter_token || v.voter_name.toLowerCase()));

    // Détecter les votes de l'utilisateur actuel
    const userVotes = pollVotes.filter(
      (v) =>
        (voterToken && v.voter_token === voterToken) ||
        (normVoterName && v.voter_name.trim().toLowerCase() === normVoterName)
    );
    const userVotedOptionIds = userVotes.map((v) => v.option_id);
    const currentUserName = userVotes.length > 0 ? userVotes[0].voter_name : null;

    const formattedOptions: PollOption[] = pollOptions.map((opt) => {
      const optVotes = pollVotes.filter((v) => v.option_id === opt.id);
      const optObj: PollOption = {
        id: opt.id,
        poll_id: opt.poll_id,
        title: opt.title,
        position: opt.position,
        votes_count: optVotes.length,
      };

      // Si admin : on ajoute la liste détaillée des votants
      if (isAdmin) {
        optObj.voters = optVotes.map((v) => ({
          name: v.voter_name,
          voted_at: v.created_at,
        }));
      }

      return optObj;
    });

    return {
      id: p.id,
      question: p.question,
      description: p.description,
      allow_multiple: p.allow_multiple,
      is_closed: p.is_closed,
      created_at: p.created_at,
      created_by: p.created_by,
      options: formattedOptions,
      total_votes: pollVotes.length,
      total_voters: uniqueVoterTokens.size,
      user_voted_options: userVotedOptionIds,
      user_voter_name: currentUserName,
    };
  });
}

/**
 * Créer un nouveau sondage et envoie une notification push à tous les utilisateurs.
 */
export async function createPoll({
  question,
  description,
  allow_multiple,
  options,
  created_by,
}: {
  question: string;
  description?: string;
  allow_multiple: boolean;
  options: string[];
  created_by?: string;
}): Promise<Poll> {
  const pollId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newPoll = {
    id: pollId,
    question: question.trim(),
    description: description ? description.trim() : null,
    allow_multiple: !!allow_multiple,
    is_closed: false,
    created_at: now,
    created_by: created_by || null,
  };

  const newOptions = options
    .map((title, idx) => ({
      id: crypto.randomUUID(),
      poll_id: pollId,
      title: title.trim(),
      position: idx,
    }))
    .filter((o) => o.title.length > 0);

  if (newOptions.length < 2) {
    throw new Error("Un sondage doit comporter au moins 2 options.");
  }

  // 1. Sauvegarde Supabase
  let savedToSupabase = false;
  try {
    const admin = createAdminClient();
    const { error: pollErr } = await admin.from("polls").insert(newPoll);
    if (!pollErr) {
      const { error: optErr } = await admin.from("poll_options").insert(newOptions);
      if (!optErr) {
        savedToSupabase = true;
      }
    }
  } catch {
    // Failover local
  }

  // 2. Toujours sauvegarder également en local
  const store = readLocalStore();
  store.polls.unshift(newPoll);
  store.options.push(...newOptions);
  writeLocalStore(store);

  // 3. Envoi de la notification push à tous les utilisateurs
  try {
    await sendPushToAll({
      title: "📊 Nouveau sondage SPS",
      body: newPoll.question,
      url: "/sondages",
    });
  } catch (err) {
    console.error("[createPoll] Erreur notification push :", err);
  }

  return {
    ...newPoll,
    options: newOptions.map((o) => ({ ...o, votes_count: 0, voters: [] })),
    total_votes: 0,
    total_voters: 0,
    user_voted_options: [],
  };
}

/**
 * Enregistre ou met à jour le vote d'un membre (prénom + nom, sans compte).
 */
export async function submitPollVote({
  poll_id,
  voter_name,
  voter_token,
  selected_option_ids,
}: {
  poll_id: string;
  voter_name: string;
  voter_token: string;
  selected_option_ids: string[];
}): Promise<{ ok: boolean; message: string }> {
  const cleanName = voter_name.trim().replace(/\s+/g, " ");
  if (!cleanName || cleanName.split(" ").length < 2) {
    throw new Error("Merci d'indiquer ton prénom ET ton nom.");
  }

  if (!voter_token) {
    throw new Error("Jeton de vote manquant.");
  }

  // Vérifier le sondage
  const store = readLocalStore();
  const poll = store.polls.find((p) => p.id === poll_id);
  if (poll && poll.is_closed) {
    throw new Error("Ce sondage est clôturé, les votes ne sont plus acceptés.");
  }

  if (poll && !poll.allow_multiple && selected_option_ids.length > 1) {
    throw new Error("Ce sondage n'autorise qu'un seul choix.");
  }

  const now = new Date().toISOString();
  const normName = cleanName.toLowerCase();

  // 1. Essayer Supabase
  try {
    const admin = createAdminClient();
    // Retirer les votes précédents de ce membre pour ce sondage
    await admin
      .from("poll_votes")
      .delete()
      .eq("poll_id", poll_id)
      .or(`voter_token.eq.${voter_token},voter_name.ilike.${cleanName}`);

    // Insérer les nouveaux votes s'il y en a
    if (selected_option_ids.length > 0) {
      const rows = selected_option_ids.map((optId) => ({
        id: crypto.randomUUID(),
        poll_id,
        option_id: optId,
        voter_name: cleanName,
        voter_token,
        created_at: now,
      }));
      await admin.from("poll_votes").insert(rows);
    }
  } catch {
    // Failover
  }

  // 2. Synchroniser le fichier local
  store.votes = store.votes.filter(
    (v) =>
      !(
        v.poll_id === poll_id &&
        (v.voter_token === voter_token || v.voter_name.trim().toLowerCase() === normName)
      )
  );

  for (const optId of selected_option_ids) {
    store.votes.push({
      id: crypto.randomUUID(),
      poll_id,
      option_id: optId,
      voter_name: cleanName,
      voter_token,
      created_at: now,
    });
  }

  writeLocalStore(store);

  return { ok: true, message: "Vote enregistré avec succès !" };
}

/**
 * Clôturer ou rouvrir un sondage (réservé admin).
 */
export async function togglePollStatus(poll_id: string, is_closed: boolean): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("polls").update({ is_closed }).eq("id", poll_id);
  } catch {}

  const store = readLocalStore();
  const poll = store.polls.find((p) => p.id === poll_id);
  if (poll) {
    poll.is_closed = is_closed;
    writeLocalStore(store);
    return true;
  }
  return false;
}

/**
 * Supprimer un sondage (réservé admin).
 */
export async function deletePoll(poll_id: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("polls").delete().eq("id", poll_id);
  } catch {}

  const store = readLocalStore();
  store.polls = store.polls.filter((p) => p.id !== poll_id);
  store.options = store.options.filter((o) => o.poll_id !== poll_id);
  store.votes = store.votes.filter((v) => v.poll_id !== poll_id);
  writeLocalStore(store);
  return true;
}
