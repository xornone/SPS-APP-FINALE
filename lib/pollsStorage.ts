import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createPublicClient } from "./supabase/publicClient";
import { createAdminClient } from "./supabase/admin";
import { sendPushToAdmins } from "./webpush";
import { getCanonicalVoterKey, getCanonicalDisplayName } from "./voterCanonical";

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

function getDbClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  try {
    return createAdminClient();
  } catch {
    try {
      return createPublicClient();
    } catch {
      return null;
    }
  }
}

function getFilePath(): string {
  try {
    // Si process.cwd() n'est pas inscriptible (comme sur Vercel serverless EROFS), basculer sur /tmp
    fs.accessSync(process.cwd(), fs.constants.W_OK);
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
    const tmpPath = path.join("/tmp", "sps-polls.json");
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, "utf8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.polls)) return data;
    }
    const localPath = path.join(process.cwd(), "data/polls.json");
    if (fs.existsSync(localPath)) {
      const raw = fs.readFileSync(localPath, "utf8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.polls)) return data;
    }
  } catch {
    // Fallback silencieux
  }
  return { polls: [], options: [], votes: [] };
}

function writeLocalStore(data: LocalStoreData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  // Toujours tenter /tmp en premier (seul dossier inscriptible sur Vercel serverless)
  try {
    fs.writeFileSync("/tmp/sps-polls.json", jsonStr, "utf8");
  } catch {}

  // Tenter le dossier local data/ si accessible en écriture
  try {
    const filePath = getFilePath();
    fs.writeFileSync(filePath, jsonStr, "utf8");
  } catch (err) {
    // Normal sur environnement en lecture seule Vercel
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
  const visitorCanonicalKey = voterName ? getCanonicalVoterKey(voterName) : null;

  return polls.map((p) => {
    const pollOptions = options
      .filter((o) => o.poll_id === p.id)
      .sort((a, b) => a.position - b.position);

    const rawPollVotes = votes.filter((v) => v.poll_id === p.id);

    // Déduplication robuste des votes par votant canonique (inversion, accents, alias) :
    // On trie par date décroissante pour retenir les votes les plus récents
    const sortedVotes = [...rawPollVotes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const votesByVoter = new Map<string, RawPollVote[]>();
    for (const v of sortedVotes) {
      const vKey = getCanonicalVoterKey(v.voter_name) || v.voter_token;
      if (!votesByVoter.has(vKey)) {
        votesByVoter.set(vKey, []);
      }
      votesByVoter.get(vKey)!.push(v);
    }

    // Pour chaque votant :
    // - Choix unique : 1 seule option autorisée (la plus récente)
    // - Choix multiples : déduplication par option_id
    const deduplicatedPollVotes: RawPollVote[] = [];
    for (const [, vList] of votesByVoter.entries()) {
      if (!p.allow_multiple) {
        if (vList.length > 0) {
          deduplicatedPollVotes.push(vList[0]);
        }
      } else {
        const seenOptions = new Set<string>();
        for (const v of vList) {
          if (!seenOptions.has(v.option_id)) {
            seenOptions.add(v.option_id);
            deduplicatedPollVotes.push(v);
          }
        }
      }
    }

    // Nombre réel de votants uniques
    const totalVoters = votesByVoter.size;

    // Détecter les votes de l'utilisateur actuel
    const userVotes = deduplicatedPollVotes.filter((v) => {
      if (voterToken && v.voter_token === voterToken) return true;
      if (visitorCanonicalKey && getCanonicalVoterKey(v.voter_name) === visitorCanonicalKey) return true;
      return false;
    });
    const userVotedOptionIds = userVotes.map((v) => v.option_id);
    const currentUserName = userVotes.length > 0 ? getCanonicalDisplayName(userVotes[0].voter_name) : null;

    const formattedOptions: PollOption[] = pollOptions.map((opt) => {
      const optVotes = deduplicatedPollVotes.filter((v) => v.option_id === opt.id);
      const optObj: PollOption = {
        id: opt.id,
        poll_id: opt.poll_id,
        title: opt.title,
        position: opt.position,
        votes_count: optVotes.length,
      };

      // Si admin : on ajoute la liste détaillée des votants sans doublon
      if (isAdmin) {
        const seenVoterKeys = new Set<string>();
        const optVoters: VoterDetail[] = [];
        for (const v of optVotes) {
          const vKey = getCanonicalVoterKey(v.voter_name) || v.voter_token;
          if (!seenVoterKeys.has(vKey)) {
            seenVoterKeys.add(vKey);
            optVoters.push({
              name: getCanonicalDisplayName(v.voter_name),
              voted_at: v.created_at,
            });
          }
        }
        optObj.voters = optVoters;
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
      total_votes: deduplicatedPollVotes.length,
      total_voters: totalVoters,
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
    const db = getDbClient();
    if (db) {
      const { error: pollErr } = await db.from("polls").insert(newPoll);
      if (!pollErr) {
        const { error: optErr } = await db.from("poll_options").insert(newOptions);
        if (!optErr) {
          savedToSupabase = true;
        }
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

  // 3. Envoi de la notification push (restreinte aux admins pendant la phase de test)
  try {
    await sendPushToAdmins({
      title: "📊 [Admin Test] Nouveau sondage SPS",
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
 * Unicité stricte : réconcilie les alias, inversions prénom/nom, accents, etc.
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

  const canonicalKey = getCanonicalVoterKey(cleanName);
  const displayName = getCanonicalDisplayName(cleanName);

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

  // 1. Essayer Supabase
  try {
    const db = getDbClient();
    if (db) {
      // Récupérer les votes existants pour ce sondage et supprimer tout vote antérieur
      // correspondant à ce même membre (même token ou même identité canonique : inversion, accents, alias...)
      const { data: existingVotes } = await db
        .from("poll_votes")
        .select("id, voter_name, voter_token")
        .eq("poll_id", poll_id);

      if (existingVotes && existingVotes.length > 0) {
        const idsToDelete = existingVotes
          .filter((v) => {
            if (voter_token && v.voter_token === voter_token) return true;
            if (v.voter_name && getCanonicalVoterKey(v.voter_name) === canonicalKey) return true;
            return false;
          })
          .map((v) => v.id);

        if (idsToDelete.length > 0) {
          await db.from("poll_votes").delete().in("id", idsToDelete);
        }
      }

      // Insérer les nouveaux votes s'il y en a
      if (selected_option_ids.length > 0) {
        const rows = selected_option_ids.map((optId) => ({
          id: crypto.randomUUID(),
          poll_id,
          option_id: optId,
          voter_name: displayName,
          voter_token,
          created_at: now,
        }));
        await db.from("poll_votes").insert(rows);
      }
    }
  } catch (err) {
    console.error("[submitPollVote] Erreur Supabase :", err);
  }

  // 2. Synchroniser le fichier local
  store.votes = store.votes.filter(
    (v) =>
      !(
        v.poll_id === poll_id &&
        ((voter_token && v.voter_token === voter_token) ||
         (v.voter_name && getCanonicalVoterKey(v.voter_name) === canonicalKey))
      )
  );

  for (const optId of selected_option_ids) {
    store.votes.push({
      id: crypto.randomUUID(),
      poll_id,
      option_id: optId,
      voter_name: displayName,
      voter_token,
      created_at: now,
    });
  }

  writeLocalStore(store);

  return { ok: true, message: "Vote enregistré avec succès !" };
}

/**
 * Supprime le vote d'un utilisateur pour un sondage donné.
 * Supprime tous les votes associés au token du navigateur OU au nom canonique du votant.
 */
export async function deletePollVote({
  poll_id,
  voter_name,
  voter_token,
}: {
  poll_id: string;
  voter_name?: string;
  voter_token?: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!voter_name && !voter_token) {
    throw new Error("Identifiant de votant manquant.");
  }

  // Vérifier le sondage
  const store = readLocalStore();
  const poll = store.polls.find((p) => p.id === poll_id);
  if (poll && poll.is_closed) {
    throw new Error("Ce sondage est clôturé, votre vote ne peut plus être supprimé.");
  }

  const canonicalKey = voter_name ? getCanonicalVoterKey(voter_name) : null;

  // 1. Supabase
  try {
    const db = getDbClient();
    if (db) {
      const { data: existingVotes } = await db
        .from("poll_votes")
        .select("id, voter_name, voter_token")
        .eq("poll_id", poll_id);

      if (existingVotes && existingVotes.length > 0) {
        const idsToDelete = existingVotes
          .filter((v) => {
            if (voter_token && v.voter_token === voter_token) return true;
            if (canonicalKey && v.voter_name && getCanonicalVoterKey(v.voter_name) === canonicalKey) return true;
            return false;
          })
          .map((v) => v.id);

        if (idsToDelete.length > 0) {
          await db.from("poll_votes").delete().in("id", idsToDelete);
        }
      }
    }
  } catch (err) {
    console.error("[deletePollVote] Erreur Supabase :", err);
  }

  // 2. Synchroniser le fichier local
  store.votes = store.votes.filter(
    (v) =>
      !(
        v.poll_id === poll_id &&
        ((voter_token && v.voter_token === voter_token) ||
         (canonicalKey && v.voter_name && getCanonicalVoterKey(v.voter_name) === canonicalKey))
      )
  );

  writeLocalStore(store);

  return { ok: true, message: "Votre vote a bien été supprimé." };
}

/**
 * Clôturer ou rouvrir un sondage (réservé admin).
 */
export async function togglePollStatus(poll_id: string, is_closed: boolean): Promise<boolean> {
  try {
    const db = getDbClient();
    if (db) await db.from("polls").update({ is_closed }).eq("id", poll_id);
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
    const db = getDbClient();
    if (db) await db.from("polls").delete().eq("id", poll_id);
  } catch {}

  const store = readLocalStore();
  store.polls = store.polls.filter((p) => p.id !== poll_id);
  store.options = store.options.filter((o) => o.poll_id !== poll_id);
  store.votes = store.votes.filter((v) => v.poll_id !== poll_id);
  writeLocalStore(store);
  return true;
}
