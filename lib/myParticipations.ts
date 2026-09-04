"use client";

// Suivi cote navigateur des inscriptions faites depuis cet appareil — sans
// compte, c'est le seul moyen de savoir "c'est moi" et de proposer un
// retrait en un geste. Ce n'est pas un mecanisme de securite : l'API
// verifie elle-meme le client_token avant de laisser modifier/retirer une
// inscription (voir app/api/participations).
const KEY = "sps-my-participations-v1";

export interface MyParticipation {
  id: string;
  client_token: string;
  participant_name: string;
  group_level: string;
}

type Store = Record<string, MyParticipation>; // rideId -> ma participation

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // stockage indisponible (navigation privee, etc.) : on continue sans persister
  }
}

export function getMyParticipation(rideId: string): MyParticipation | null {
  return readStore()[rideId] || null;
}

export function setMyParticipation(rideId: string, value: MyParticipation) {
  const store = readStore();
  store[rideId] = value;
  writeStore(store);
}

export function clearMyParticipation(rideId: string) {
  const store = readStore();
  delete store[rideId];
  writeStore(store);
}

/** Dernier nom utilise, pour pre-remplir le formulaire d'inscription suivant. */
export function getLastUsedName(): string {
  const store = readStore();
  const values = Object.values(store);
  return values.length ? values[values.length - 1].participant_name : "";
}

/** Ensemble des ride_id pour lesquels ce navigateur a une inscription enregistree. */
export function getMyRideIds(): Set<string> {
  return new Set(Object.keys(readStore()));
}
