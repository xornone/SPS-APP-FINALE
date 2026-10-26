"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { getLastUsedName } from "@/lib/myParticipations";

const CATEGORIES = [
  { id: "💡 Idée / Suggestion", label: "💡 Idée", desc: "Une proposition pour le club" },
  { id: "🗺️ Idée de parcours", label: "🗺️ Parcours", desc: "Une route ou un spot à partager" },
  { id: "❓ Question", label: "❓ Question", desc: "Besoin d'un renseignement" },
  { id: "💬 Remarque", label: "💬 Remarque", desc: "Un retour d'expérience" },
];

interface AttachedPhoto {
  file: File;
  previewUrl: string;
}

export function SuggestionForm() {
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{ simulated?: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Nettoyer les URL blob lors du démontage pour libérer la mémoire
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [photos]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    const validNewPhotos: AttachedPhoto[] = [];
    for (const f of newFiles) {
      if (!f.type.startsWith("image/")) {
        setError(`Le fichier "${f.name}" n'est pas une image.`);
        continue;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError(`L'image "${f.name}" dépasse 10 Mo.`);
        continue;
      }
      validNewPhotos.push({
        file: f,
        previewUrl: URL.createObjectURL(f),
      });
    }

    setPhotos((prev) => [...prev, ...validNewPhotos].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
    setError(null);
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  }

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
      const fd = new FormData();
      fd.append("message", trimmedMsg);
      fd.append("category", category);
      fd.append("isAnonymous", isAnonymous ? "true" : "false");
      if (!isAnonymous && trimmedName) {
        fd.append("authorName", trimmedName);
        try {
          window.localStorage.setItem("sps-last-comment-name-v1", trimmedName);
        } catch {
          // Ignorer
        }
      }
      if (email.trim()) {
        fd.append("email", email.trim());
      }

      photos.forEach((p) => {
        fd.append("attachments", p.file);
      });

      const res = await fetch("/api/suggestions", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi.");
      }

      // Succès !
      setSuccessResult({ simulated: data.simulated });
      setMessage("");
      setPhotos([]);
      if (isAnonymous) {
        setIsAnonymous(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setSuccessResult(null);
    setError(null);
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} Ko`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  if (successResult) {
    return (
      <div className="mx-5 my-6 rounded-[28px] border border-sps-violet500/20 bg-white p-7 text-center shadow-card dark:border-white/10 dark:bg-[#1A1422]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sps-violet100 text-sps-violet600 dark:bg-sps-violet950 dark:text-sps-violet300">
          <Icon name="check" size={32} />
        </div>
        <h2 className="mb-2 font-display text-2xl tracking-wide text-sps-violet950 dark:text-white">
          Merci pour ton message !
        </h2>
        <p className="mb-5 text-[14px] leading-relaxed text-black/60 dark:text-white/60">
          Ton idée a bien été envoyée à l&apos;équipe SPS sur <span className="font-semibold text-sps-violet600 dark:text-sps-violet400">contact@spscycling.fr</span>.
          Toutes les remarques sont précieuses pour faire évoluer le club !
        </p>

        {successResult.simulated && (
          <div className="mb-5 rounded-2xl bg-amber-500/10 p-3.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            ℹ️ <b>Test local :</b> L&apos;e-mail a été simulé dans la console de ton terminal (aucun compte SMTP n&apos;est encore configuré dans <code className="rounded bg-black/5 px-1 py-0.5 dark:bg-white/10">.env.local</code>).
          </div>
        )}

        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-2xl bg-sps-violet600 px-6 py-3 text-sm font-bold text-white shadow-button transition hover:bg-sps-violet700"
        >
          <Icon name="plus" size={16} /> Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 pb-10 pt-2">
      {/* 1. Catégorie / Sujet */}
      <div className="mb-5">
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

      {/* 2. Message d'abord (selon le souhait de l'utilisateur) */}
      <div className="mb-5">
        <label htmlFor="suggestion-message" className="mb-1.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
          <span>Ton message ou suggestion *</span>
          <span className="font-normal normal-case text-black/35 dark:text-white/35">Détaille ton idée</span>
        </label>
        <textarea
          id="suggestion-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex: J'aimerais qu'on organise une sortie vers le mont Aigoual le mois prochain... / J'ai une idée pour le départ des groupes..."
          className="w-full rounded-2xl border border-black/10 bg-white p-4 text-[14.5px] leading-relaxed text-black placeholder-black/35 shadow-sm outline-none transition focus:border-sps-violet600 focus:ring-2 focus:ring-sps-violet600/20 dark:border-white/15 dark:bg-[#1A1422] dark:text-white dark:placeholder-white/35"
        />
      </div>

      {/* 3. Pièce jointe / Photos si besoin */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
            Pièce(s) jointe(s) / Photos <span className="font-normal lowercase">(optionnel)</span>
          </label>
          <span className="text-xs text-black/35 dark:text-white/35">{photos.length}/5 max</span>
        </div>

        {photos.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2.5">
            {photos.map((p, idx) => (
              <div
                key={idx}
                className="relative flex items-center gap-2.5 overflow-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#1A1422]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt={p.file.name}
                  className="h-12 w-12 flex-none rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-black dark:text-white">{p.file.name}</p>
                  <p className="text-[11px] text-black/45 dark:text-white/45">{formatFileSize(p.file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="mr-1 flex h-7 w-7 items-center justify-center rounded-full text-black/40 hover:bg-red-50 hover:text-red-500 dark:text-white/40 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  aria-label="Supprimer la photo"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length < 5 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="suggestion-files"
            />
            <label
              htmlFor="suggestion-files"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-white/60 p-3.5 text-[13px] font-bold text-black/60 transition hover:border-sps-violet600 hover:bg-sps-violet50 hover:text-sps-violet600 dark:border-white/15 dark:bg-[#1A1422]/60 dark:text-white/60 dark:hover:border-sps-violet500 dark:hover:bg-sps-violet950/40 dark:hover:text-sps-violet300"
            >
              <Icon name="image" size={17} />
              <span>{photos.length > 0 ? "Ajouter une autre photo" : "Ajouter une photo ou capture d'écran"}</span>
            </label>
          </>
        )}
      </div>

      {/* 4. Identité : Nom/Prénom ou Anonyme */}
      <div className="mb-6 rounded-2xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1A1422]">
        <label className="mb-3.5 flex cursor-pointer items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🕶️</span>
            <div>
              <p className="text-[13.5px] font-bold text-black dark:text-white">Rester anonyme</p>
              <p className="text-[11.5px] text-black/50 dark:text-white/50">
                Ne pas inclure ton nom dans le message
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
                placeholder="Ex: Thomas Dupont"
                className="w-full rounded-xl border border-black/10 bg-[#FAF8FB] p-3 text-sm text-black placeholder-black/35 outline-none transition focus:border-sps-violet600 dark:border-white/10 dark:bg-[#130D1A] dark:text-white dark:placeholder-white/35"
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
                placeholder="ex: thomas@exemple.fr (si tu attends une réponse)"
                className="w-full rounded-xl border border-black/10 bg-[#FAF8FB] p-3 text-sm text-black placeholder-black/35 outline-none transition focus:border-sps-violet600 dark:border-white/10 dark:bg-[#130D1A] dark:text-white dark:placeholder-white/35"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-violet-500/10 p-3 text-xs leading-relaxed text-violet-700 dark:text-violet-300">
            🔒 Ton message sera transmis de manière 100% anonyme au bureau SPS.
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-50 p-3 text-center text-xs font-bold text-red-600 dark:bg-red-950/30 dark:text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* 5. Bouton d'envoi */}
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet600 to-sps-violet800 py-3.5 text-center text-sm font-extrabold text-white shadow-button transition hover:from-sps-violet700 hover:to-sps-violet900 disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Envoi en cours...</span>
          </>
        ) : (
          <>
            <Icon name="send" size={17} />
            <span>Envoyer à l&apos;équipe SPS</span>
          </>
        )}
      </button>
    </form>
  );
}
