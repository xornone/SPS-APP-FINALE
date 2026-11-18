"use client";

import { useState, useRef } from "react";
import { Icon } from "./Icons";
import { hapticTap } from "@/lib/haptics";
import { compressImageFile } from "@/lib/imageUtils";

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePollModal({ isOpen, onClose, onCreated }: CreatePollModalProps) {
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 12) return;
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = val;
    setOptions(next);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    setIsProcessingImage(true);
    try {
      const dataUrl = await compressImageFile(file);
      setImageUrl(dataUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du traitement de l'image.";
      setImageError(msg);
    } finally {
      setIsProcessingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
    setImageError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError("Veuillez saisir la question du sondage.");
      return;
    }

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setError("Veuillez fournir au moins 2 réponses possibles.");
      return;
    }

    setIsSubmitting(true);
    hapticTap();

    try {
      const res = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          description: description.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          allow_multiple: allowMultiple,
          options: cleanOptions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la création du sondage.");
      }

      setQuestion("");
      setDescription("");
      setImageUrl("");
      setImageError(null);
      setAllowMultiple(false);
      setOptions(["", ""]);
      onCreated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1A1424] dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sps-violet600/10 text-sps-violet600 dark:bg-sps-violet600/20 dark:text-sps-violet400">
              <Icon name="poll" size={18} />
            </span>
            <h2 className="text-base font-black tracking-tight text-neutral-900 dark:text-white">
              Nouveau sondage
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Question */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
              Question / Sujet du sondage *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex : Quel jour pour le bivouac SPS ?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-sm font-semibold text-neutral-900 outline-none transition focus:border-sps-violet500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
          </div>

          {/* Description optionnelle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
              Description / Contexte (optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Ex : Donnez vos disponibilités pour le premier week-end de juin..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-900 outline-none transition focus:border-sps-violet500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
          </div>

          {/* Photo d'illustration / contexte (optionnel) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Photo d&apos;illustration (optionnel)
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="text-[11px] font-bold text-red-500 hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />

            {imageUrl ? (
              <div className="relative group overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5">
                <img
                  src={imageUrl}
                  alt="Aperçu"
                  className="w-full max-h-48 object-cover rounded-xl"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl bg-white/90 hover:bg-white px-3 py-1.5 text-xs font-bold text-neutral-900 shadow-md transition"
                  >
                    <Icon name="pencil" size={13} />
                    <span>Remplacer</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-bold text-white shadow-md transition"
                  >
                    <Icon name="trash" size={13} />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingImage}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-neutral-300 hover:border-sps-violet500 bg-neutral-50/60 hover:bg-sps-violet500/5 transition text-xs font-bold text-neutral-600 dark:border-white/15 dark:bg-white/[0.02] dark:hover:bg-sps-violet600/10 dark:text-neutral-300"
              >
                <Icon name="image" size={16} className="text-sps-violet600 dark:text-sps-violet400" />
                <span>{isProcessingImage ? "Optimisation de l'image..." : "Ajouter une photo (affiche, plan, parcours...)"}</span>
              </button>
            )}

            {imageError && (
              <p className="mt-1.5 text-[11px] font-semibold text-red-500">
                {imageError}
              </p>
            )}
          </div>

          {/* Type de choix */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">
                Autoriser plusieurs réponses
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-white/50">
                Les adhérents pourront cocher plusieurs options.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllowMultiple(!allowMultiple)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                allowMultiple ? "bg-sps-violet600" : "bg-neutral-300 dark:bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  allowMultiple ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Options de vote */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Choix de réponses *
              </label>
              <span className="text-[11px] text-neutral-400 font-semibold">
                {options.length}/12 options
              </span>
            </div>

            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-black text-neutral-500 dark:bg-white/10 dark:text-white/60">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder={`Réponse ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-900 outline-none transition focus:border-sps-violet500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 transition"
                      title="Supprimer cette option"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 12 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-sps-violet600 hover:text-sps-violet700 dark:text-sps-violet400"
              >
                <Icon name="plus" size={14} />
                <span>Ajouter une réponse</span>
              </button>
            )}
          </div>

          {/* Info notification */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] font-medium text-amber-900 dark:text-amber-200">
            🔔 Une notification push sera automatiquement envoyée à tous les adhérents abonnés dès la publication.
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sps-violet600 to-[#AA26FF] px-4 py-2 text-xs font-black text-white shadow-md shadow-violet-600/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Icon name="poll" size={14} />
              <span>{isSubmitting ? "Création..." : "Publier le sondage"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
