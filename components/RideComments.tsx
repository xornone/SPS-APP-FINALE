"use client";

import { useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "./Icons";
import { getLastUsedName } from "@/lib/myParticipations";
import { getLastCommentName, getMyCommentToken, saveMyCommentToken, setLastCommentName } from "@/lib/myComments";
import { fmtCommentTime } from "@/lib/format";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { RideComment } from "@/lib/types";

export function RideComments({
  rideId,
  initialComments,
}: {
  rideId: string;
  initialComments: RideComment[];
}) {
  // Determine cote client (voir lib/useIsAdmin.ts) plutot que reçu du
  // serveur : la fiche sortie n'a ainsi plus besoin de connaitre la
  // session pour s'afficher, et reste mise en cache pour tout le monde.
  const isAdmin = useIsAdmin();
  const [comments, setComments] = useState(initialComments);
  // Pre-rempli avec le dernier nom utilise pour un message, ou a defaut
  // celui utilise pour s'inscrire a une sortie.
  const [name, setName] = useState(() => getLastCommentName() || getLastUsedName());
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) {
      setError("Indique ton nom et ton message.");
      return;
    }
    setError("");
    setPending(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ride_id: rideId, author_name: trimmedName, message: trimmedMessage }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Une erreur est survenue.");
      return;
    }
    setLastCommentName(trimmedName);
    saveMyCommentToken(data.id, data.client_token);
    setComments((prev) => [
      ...prev,
      {
        id: data.id,
        ride_id: rideId,
        author_name: trimmedName,
        message: trimmedMessage,
        created_at: new Date().toISOString(),
      },
    ]);
    setMessage("");
  }

  // L'auteur peut supprimer son propre message (jeton local) ; un admin
  // peut supprimer n'importe quel message (moderation) — l'API verifie sa
  // session cote serveur, aucun jeton necessaire dans ce cas.
  async function handleDelete(id: string) {
    const token = getMyCommentToken(id);
    if (!token && !isAdmin) return;
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    const res = await fetch(`/api/comments/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_token: token || null }),
    });
    if (!res.ok) setComments(previous); // echec : on remet le message affiche
  }

  return (
    <div className="px-5 pb-4">
      <h2 className="mb-2 font-display text-xl tracking-wide">
        Discussion{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]">
        <div className="flex max-h-[340px] flex-col gap-3.5 overflow-y-auto px-4 py-3.5">
          {comments.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-black/40 dark:text-white/40">
              Aucun message pour le moment — sois le premier à écrire quelque chose.
            </p>
          ) : (
            comments.map((c) => {
              const mine = !!getMyCommentToken(c.id);
              return (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar name={c.author_name} seed={c.author_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <b className="truncate text-[12.5px] font-bold">{c.author_name}</b>
                      <span className="flex-none text-[10px] text-black/35 dark:text-white/35">
                        {fmtCommentTime(c.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-black/75 dark:text-white/75">
                      {c.message}
                    </p>
                  </div>
                  {(mine || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="flex-none self-start p-0.5 text-black/25 hover:text-red-500 dark:text-white/25"
                      aria-label={mine ? "Supprimer mon message" : "Supprimer (modération)"}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 border-t border-black/[0.06] p-3 dark:border-white/10"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton nom"
            maxLength={60}
            className="rounded-xl border-[1.5px] border-black/10 bg-white px-3 py-2 text-[13px] text-[#150f1c] placeholder:text-black/35 dark:border-white/15 dark:bg-[#241c2e] dark:text-white dark:placeholder:text-white/35"
          />
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Écris un message…"
              maxLength={500}
              className="flex-1 rounded-xl border-[1.5px] border-black/10 bg-white px-3 py-2 text-[13px] text-[#150f1c] placeholder:text-black/35 dark:border-white/15 dark:bg-[#241c2e] dark:text-white dark:placeholder:text-white/35"
            />
            <button
              type="submit"
              disabled={pending}
              className="flex flex-none items-center justify-center rounded-xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 px-3.5 text-white disabled:opacity-60"
              aria-label="Envoyer"
            >
              <Icon name="send" size={16} />
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      </div>
    </div>
  );
}
