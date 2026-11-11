"use client";

import { getLastUsedName } from "./myParticipations";

const TOKEN_KEY = "sps-poll-voter-token-v1";
const NAME_KEY = "sps-poll-voter-name-v1";

export function getOrCreateVoterToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = "vt_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  }
  return token;
}

export function getInitialVoterName(): string {
  if (typeof window === "undefined") return "";
  const pollName = localStorage.getItem(NAME_KEY);
  if (pollName && pollName.trim()) return pollName.trim();

  const rideName = getLastUsedName();
  if (rideName && rideName.trim()) return rideName.trim();

  const commentName = localStorage.getItem("sps-last-comment-name-v1");
  if (commentName && commentName.trim()) return commentName.trim();

  return "";
}

export function saveVoterName(name: string): void {
  if (typeof window === "undefined") return;
  const clean = name.trim();
  if (clean) {
    try {
      localStorage.setItem(NAME_KEY, clean);
      localStorage.setItem("sps-last-comment-name-v1", clean);
    } catch {}
  }
}

export function markPollVotedLocally(pollId: string, optionIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`sps_voted_${pollId}`, JSON.stringify(optionIds));
  } catch {}
}

export function clearPollVotedLocally(pollId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`sps_voted_${pollId}`);
  } catch {}
}

export function isPollVotedLocally(pollId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(localStorage.getItem(`sps_voted_${pollId}`));
  } catch {
    return false;
  }
}
