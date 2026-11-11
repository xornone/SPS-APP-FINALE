"use client";

import { useState, useEffect } from "react";
import { Poll } from "@/lib/pollsStorage";
import { Icon } from "./Icons";
import { hapticTap } from "@/lib/haptics";

interface EditPollModalProps {
  isOpen: boolean;
  poll: Poll;
  onClose: () => void;
  onUpdated: () => void;
}

interface EditableOption {
  id?: string;
  title: string;
  votes_count?: number;
}

export function EditPollModal({ isOpen, poll, onClose, onUpdated }: EditPollModalProps) {
  const [question, setQuestion] = useState(poll.question);
  const [description, setDescription] = useState(poll.description || "");
  const [allowMultiple, setAllowMultiple] = useState(poll.allow_multiple);
  const [options, setOptions] = useState<EditableOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronisation lors de l'ouverture
  useEffect(() => {
    if (isOpen && poll) {
      setQuestion(poll.question);
      setDescription(poll.description || "");
      setAllowMultiple(poll.allow_multiple);
      setOptions(
        poll.options.map((o) => ({
          id: o.id,
          title: o.title,
          votes_count: o.votes_count,
        }))
      );
      setError(null);
    }
  }, [isOpen, poll]);

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 12) return;
    setOptions([...options, { title: "" }]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    const target = options[idx];
    if (target.votes_count && target.votes_count > 0) {
      const confirmDelete = confirm(
        `Attention : l'option « ${target.title} » comptabilise déjà ${target.votes_count} vote(s).\nLa supprimer annulera ces votes. Voulez-vous continuer ?`
      );
      if (!confirmDelete) return;
    }
    setOptions(options.filter((_, i) => i !== idx));
  };

  const handleOptionTitleChange = (idx: number, val: string) => {
    const next = [...options];
    next[idx] = { ...next[idx], title: val };
    setOptions(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanQuestion = question.trim();
    if (!cleanQuestion) {
      setError("Veuillez saisir la question du sondage.");
      return;
    }

    const cleanOptions = options
      .map((o) => ({ ...o, title: o.title.trim() }))
      .filter((o) => o.title.length > 0);

    if (cleanOptions.length < 2) {
      setError("Le sondage doit comporter au moins 2 choix de réponses.");
      return;
    }

    setIsSubmitting(true);
    hapticTap();

    try {
      const res = await fetch(`/api/admin/polls/${poll.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cleanQuestion,
          description: description.trim() || undefined,
          allow_multiple: allowMultiple,
          options: cleanOptions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la modification du sondage.");
      }

      onUpdated();
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
              <Icon name="pencil" size={16} />
            </span>
            <div>
              <h2 className="text-base font-black tracking-tight text-neutral-900 dark:text-white leading-tight">
                Modifier le sondage
              </h2>
              <p className="text-[11px] text-neutral-400 font-bold">
                {poll.total_voters} votant{poll.total_voters > 1 ? "s" : ""} enregistré{poll.total_voters > 1 ? "s" : ""}
              </p>
            </div>
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
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-medium text-neutral-900 outline-none transition focus:border-sps-violet500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
          </div>

          {/* Type de choix */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">
                Autoriser plusieurs réponses
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-white/50">
                Permet aux adhérents de sélectionner plus d&apos;une option.
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
                <div key={opt.id || idx} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-black text-neutral-500 dark:bg-white/10 dark:text-white/60">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    value={opt.title}
                    onChange={(e) => handleOptionTitleChange(idx, e.target.value)}
                    className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-900 outline-none transition focus:border-sps-violet500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                  />
                  {typeof opt.votes_count === "number" && opt.votes_count > 0 && (
                    <span className="flex-shrink-0 rounded-md bg-sps-violet600/10 px-2 py-1 text-[10px] font-bold text-sps-violet700 dark:bg-sps-violet600/20 dark:text-sps-violet300">
                      {opt.votes_count} vote{opt.votes_count > 1 ? "s" : ""}
                    </span>
                  )}
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
              <Icon name="check" size={14} />
              <span>{isSubmitting ? "Enregistrement..." : "Enregistrer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
