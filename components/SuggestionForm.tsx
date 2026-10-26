"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { getLastUsedName } from "@/lib/myParticipations";

const CATEGORIES = [
  { id: "💡 Idée / Suggestion", label: "💡 Idée", desc: "Une proposition pour le club" },
  { id: "🗺️ Idée de parcours", label: "🗺️ Parcours", desc: "Une route ou un spot à partager" },
  { id: "❓ Question", label: "❓ Question", desc: "Besoin d'un renseignement" },
  { id: "💬 Remarque", label: "💬 Remarque", desc: "Un retour d'expérience" },
];

export function SuggestionForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Pré-remplir le nom de l'utilisateur s'il a déjà participé ou commenté
  useEffect(() => {
    try {
      const stored =
        getLastUsedName() ||
        (typeof window !== "undefined" ? window.localStorage.getItem("sps-last-comment-name-v1") || "" : "");
      if (stored) {
        setAuthorName(stored);
      }
    } catch {
      // Ignorer
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedMsg = message.trim();
    if (!trimmedMsg) {
      setError("Merci d'écrire un message avant d'envoyer.");
      return;
    }

    const trimmedName = authorName.trim();
    if (!isAnonymous && !trimmedName) {
      setError("Veuillez indiquer votre prénom et nom ou cocher l'option 'Rester anonyme'.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMsg,
          category,
          isAnonymous,
          authorName: !isAnonymous ? trimmedName : undefined,
          email: email.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement.");
      }

      if (!isAnonymous && trimmedName) {
        try {
          window.localStorage.setItem("sps-last-comment-name-v1", trimmedName);
        } catch {
          // Ignorer
        }
      }

      setIsSuccess(true);
      setMessage("");
      if (isAnonymous) {
        setIsAnonymous(false);
      }
      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setIsSuccess(false);
    setError(null);
  }

  if (isSuccess) {
    return (
      <div className="mx-5 my-4 rounded-[26px] border border-sps-violet500/20 bg-white p-7 text-center shadow-card dark:border-white/10 dark:bg-[#1A1422]">
        <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full bg-sps-violet100 text-sps-violet600 dark:bg-sps-violet950 dark:text-sps-violet300">
          <Icon name="check" size={28} />
        </div>
        <h2 className="mb-1.5 font-display text-2xl tracking-wide text-sps-violet950 dark:text-white">
          Merci pour ton idée !
        </h2>
        <p className="mb-5 text-[14px] leading-relaxed text-black/60 dark:text-white/60">
          Ton message a bien été enregistré. Les administrateurs du club pourront le consulter directement dans l&apos;application.
        </p>

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-2xl bg-sps-violet600 px-5 py-2.5 text-sm font-bold text-white shadow-button transition hover:bg-sps-violet700"
        >
          <Icon name="plus" size={15} /> Proposer une autre idée
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 pb-6 pt-2">
      {/* 1. Choix du type de message */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
          Type de message
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex flex-col items-start rounded-2xl border p-3 text-left transition ${
                category === c.id
                  ? "border-sps-violet600 bg-sps-violet50 dark:border-sps-violet500 dark:bg-sps-violet950/40"
                  : "border-black/10 bg-white hover:border-black/20 dark:border-white/10 dark:bg-[#1A1422] dark:hover:border-white/20"
              }`}
            >
              <span className={`text-[13px] font-bold ${category === c.id ? "text-sps-violet700 dark:text-sps-violet300" : "text-black dark:text-white"}`}>
                {c.label}
              </span>
              <span className="text-[11px] text-black/45 dark:text-white/45">{c.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Message d'abord */}
      <div className="mb-4">
        <label htmlFor="suggestion-message" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
          Ton message ou suggestion *
        </label>
        <textarea
          id="suggestion-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white p-4 text-[14.5px] leading-relaxed text-black shadow-sm outline-none transition focus:border-sps-violet600 focus:ring-2 focus:ring-sps-violet600/20 dark:border-white/15 dark:bg-[#1A1422] dark:text-white"
        />
      </div>

      {/* 3. Identité : Nom/Prénom ou Anonyme */}
      <div className="mb-5 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1A1422]">
        <label className="mb-3.5 flex cursor-pointer items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🕶️</span>
            <div>
              <p className="text-[13.5px] font-bold text-black dark:text-white">Rester anonyme</p>
              <p className="text-[11.5px] text-black/50 dark:text-white/50">
                Ne pas associer ton nom à ce message
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-5 w-5 accent-sps-violet600"
          />
        </label>

        {!isAnonymous ? (
          <div className="space-y-3 pt-1">
            <div>
              <label htmlFor="suggestion-author" className="mb-1 block text-xs font-bold text-black/60 dark:text-white/60">
                Ton prénom et nom *
              </label>
              <input
                id="suggestion-author"
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[#FAF8FB] p-3 text-sm text-black outline-none transition focus:border-sps-violet600 dark:border-white/10 dark:bg-[#130D1A] dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="suggestion-email" className="mb-1 block text-xs font-bold text-black/60 dark:text-white/60">
                Ton adresse email <span className="font-normal text-black/40 dark:text-white/40">(optionnel)</span>
              </label>
              <input
                id="suggestion-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-[#FAF8FB] p-3 text-sm text-black outline-none transition focus:border-sps-violet600 dark:border-white/10 dark:bg-[#130D1A] dark:text-white"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-violet-500/10 p-3 text-xs leading-relaxed text-violet-700 dark:text-violet-300">
            🔒 Ton message sera transmis de manière 100% anonyme aux admins.
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-50 p-3 text-center text-xs font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* 4. Bouton d'envoi */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet600 to-sps-violet800 py-3.5 text-center text-sm font-extrabold text-white shadow-button transition hover:from-sps-violet700 hover:to-sps-violet900 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Enregistrement...</span>
          </>
        ) : (
          <>
            <Icon name="send" size={17} />
            <span>Transmettre au club</span>
          </>
        )}
      </button>
    </form>
  );
}
