"use client";

// Suivi cote navigateur des messages postes depuis cet appareil — sans
// compte, c'est le seul moyen de savoir "c'est moi" et d'afficher un bouton
// supprimer uniquement sur ses propres messages. Ce n'est pas un mecanisme
// de securite : l'API verifie elle-meme le client_token avant de laisser
// supprimer un message (voir app/api/comments).
const TOKENS_KEY = "sps-my-comments-v1";
const NAME_KEY = "sps-last-comment-name-v1";

type Store = Record<string, string>; // commentId -> client_token

function readStore(): Store {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(store));
  } catch {
    // stockage indisponible (navigation privee, etc.) : on continue sans persister
  }
}

export function saveMyCommentToken(commentId: string, clientToken: string) {
  const store = readStore();
  store[commentId] = clientToken;
  writeStore(store);
}

export function getMyCommentToken(commentId: string): string | null {
  return readStore()[commentId] || null;
}

export function forgetMyComment(commentId: string) {
  const store = readStore();
  delete store[commentId];
  writeStore(store);
}

export function getLastCommentName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setLastCommentName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // stockage indisponible : on continue sans persister
  }
}
