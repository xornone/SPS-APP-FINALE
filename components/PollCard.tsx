"use client";

import { useState, useEffect } from "react";
import { Poll, PollOption } from "@/lib/pollsStorage";
import { Icon } from "./Icons";
import { hapticTap } from "@/lib/haptics";
import { EditPollModal } from "./EditPollModal";
import {
  getInitialVoterName,
  saveVoterName,
  getOrCreateVoterToken,
  markPollVotedLocally,
} from "@/lib/pollClient";

interface PollCardProps {
  poll: Poll;
  isAdmin: boolean;
  onRefresh: () => void;
}

export function PollCard({ poll, isAdmin, onRefresh }: PollCardProps) {
  // Détermine si l'utilisateur a déjà voté
  const hasVoted = Boolean(poll.user_voted_options && poll.user_voted_options.length > 0);

  // État d'affichage : soit le formulaire de vote, soit les résultats
  const [showResults, setShowResults] = useState(hasVoted || poll.is_closed);
  const [voterName, setVoterName] = useState(() => poll.user_voter_name || getInitialVoterName());
  const [selectedOptions, setSelectedOptions] = useState<string[]>(poll.user_voted_options || []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pré-remplissage automatique avec le nom habituel (sorties, participations)
  useEffect(() => {
    if (!poll.user_voter_name) {
      const initial = getInitialVoterName();
      if (initial) {
        setVoterName(initial);
      }
    }
  }, [poll.user_voter_name]);

  // Synchronisation avec les props du sondage lors des rafraîchissements
  useEffect(() => {
    if (poll.user_voted_options && poll.user_voted_options.length > 0) {
      setSelectedOptions(poll.user_voted_options);
    } else {
      setSelectedOptions([]);
    }
    if (poll.user_voter_name) {
      setVoterName(poll.user_voter_name);
    }
  }, [poll.user_voted_options, poll.user_voter_name]);

  // État de dépliage du contexte / description
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  // Accordéon pour voir les votants par option (réservé admin)
  const [expandedOptionVoters, setExpandedOptionVoters] = useState<Record<string, boolean>>({});

  const toggleOptionSelection = (optId: string) => {
    if (poll.is_closed) return;
    hapticTap();
    if (poll.allow_multiple) {
      if (selectedOptions.includes(optId)) {
        setSelectedOptions(selectedOptions.filter((id) => id !== optId));
      } else {
        setSelectedOptions([...selectedOptions, optId]);
      }
    } else {
      setSelectedOptions([optId]);
    }
  };

  const handleVoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanName = voterName.trim().replace(/\s+/g, " ");
    if (!cleanName || cleanName.split(" ").length < 2) {
      setError("Merci d'indiquer ton prénom ET ton nom (ex : Thomas Trégaro).");
      return;
    }

    if (selectedOptions.length === 0) {
      setError("Veuillez sélectionner au moins une option.");
      return;
    }

    setIsSubmitting(true);
    hapticTap();

    const voterToken = getOrCreateVoterToken();
    saveVoterName(cleanName);

    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter_name: cleanName,
          voter_token: voterToken,
          selected_option_ids: selectedOptions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement du vote.");
      }

      setSuccessMsg("Vote enregistré avec succès !");
      markPollVotedLocally(poll.id, selectedOptions);
      setShowResults(true);
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clôturer / Rouvrir le sondage (Admin)
  const handleToggleClosed = async () => {
    if (!confirm(poll.is_closed ? "Rouvrir ce sondage aux votes ?" : "Clôturer ce sondage ? Les votes seront gelés.")) return;
    try {
      const res = await fetch(`/api/admin/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_closed: !poll.is_closed }),
      });
      if (res.ok) onRefresh();
    } catch {}
  };

  // Supprimer le sondage (Admin)
  const handleDeletePoll = async () => {
    if (!confirm("Supprimer définitivement ce sondage et tous ses votes ?")) return;
    try {
      const res = await fetch(`/api/admin/polls/${poll.id}`, {
        method: "DELETE",
      });
      if (res.ok) onRefresh();
    } catch {}
  };

  // Trouver l'option gagnante (plus grand nombre de votes)
  const maxVotes = Math.max(...poll.options.map((o) => o.votes_count), 0);

  return (
    <div className="rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-cardSm transition-all duration-200 dark:border-white/10 dark:bg-[#1A1424]">
      {/* Badges d'en-tête */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2">
          {poll.is_closed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-[11px] font-black text-neutral-600 dark:border-white/20 dark:bg-white/10 dark:text-neutral-300">
              🔒 Clôturé
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En cours
            </span>
          )}

          <span className="rounded-full bg-sps-violet600/10 px-2.5 py-0.5 text-[11px] font-bold text-sps-violet600 dark:bg-sps-violet600/20 dark:text-sps-violet300">
            {poll.allow_multiple ? "Choix multiples" : "Choix unique"}
          </span>
        </div>

        <span className="text-[11px] font-bold text-neutral-400">
          👥 {poll.total_voters} votant{poll.total_voters > 1 ? "s" : ""}
        </span>
      </div>

      {/* Question */}
      <h3 className="font-display text-lg font-black tracking-tight text-neutral-900 dark:text-white mt-1">
        {poll.question}
      </h3>

      {/* Description / Contexte dépliable */}
      {poll.description && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => {
              hapticTap();
              setIsDescriptionOpen((prev) => !prev);
            }}
            className="group/desc inline-flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-700 transition-all hover:border-sps-violet600/40 hover:bg-sps-violet600/5 hover:text-sps-violet700 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80 dark:hover:border-sps-violet400/40 dark:hover:bg-sps-violet600/10 dark:hover:text-sps-violet300"
            aria-expanded={isDescriptionOpen}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-md bg-sps-violet600/10 text-sps-violet600 dark:bg-sps-violet600/20 dark:text-sps-violet400">
              <Icon name="chat" size={10} />
            </span>
            <span>{isDescriptionOpen ? "Masquer le contexte" : "Lire le contexte & explications"}</span>
            <Icon
              name="chevDown"
              size={12}
              className={`transition-transform duration-200 text-neutral-400 group-hover/desc:text-sps-violet600 dark:text-white/40 dark:group-hover/desc:text-sps-violet300 ${
                isDescriptionOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isDescriptionOpen && (
            <div className="mt-2.5 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-3.5 text-xs font-medium leading-relaxed text-neutral-700 shadow-xs dark:border-white/10 dark:bg-white/[0.03] dark:text-white/85 whitespace-pre-line">
              <div className="space-y-1">
                {poll.description}
              </div>
              <div className="mt-2.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    hapticTap();
                    setIsDescriptionOpen(false);
                  }}
                  className="text-[11px] font-bold text-sps-violet600 hover:underline dark:text-sps-violet400"
                >
                  ▲ Replier le contexte
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* Corps : Mode Résultats ou Mode Vote */}
      {showResults ? (
        /* VUE RÉSULTATS */
        <div className="mt-4 space-y-3">
          {poll.options.map((opt) => {
            const percentage =
              poll.total_votes > 0 ? Math.round((opt.votes_count / poll.total_votes) * 100) : 0;
            const isUserVoted = poll.user_voted_options?.includes(opt.id);
            const isWinner = poll.total_votes > 0 && opt.votes_count === maxVotes;
            const isExpanded = !!expandedOptionVoters[opt.id];

            return (
              <div
                key={opt.id}
                className={`relative overflow-hidden rounded-2xl border p-3 transition ${
                  isUserVoted
                    ? "border-sps-violet500/50 bg-sps-violet600/[0.04] dark:border-sps-violet500/40 dark:bg-sps-violet600/[0.08]"
                    : "border-neutral-200/80 bg-neutral-50/50 dark:border-white/10 dark:bg-white/[0.03]"
                }`}
              >
                {/* Barre de progression en arrière-plan */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out opacity-20 ${
                    isWinner
                      ? "bg-gradient-to-r from-sps-violet600 to-[#AA26FF] opacity-25"
                      : "bg-sps-violet500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />

                {/* Contenu de la ligne */}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">
                      {opt.title}
                    </span>
                    {isUserVoted && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        Votre choix ✓
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-black text-neutral-900 dark:text-white">
                      {percentage}%
                    </span>
                    <span className="text-[11px] font-bold text-neutral-400">
                      ({opt.votes_count})
                    </span>
                  </div>
                </div>

                {/* Vue Votants pour ADMIN UNIQUEMENT */}
                {isAdmin && opt.voters && (
                  <div className="relative z-10 mt-2 pt-2 border-t border-neutral-200/50 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOptionVoters((prev) => ({ ...prev, [opt.id]: !isExpanded }))
                      }
                      className="flex items-center gap-1 text-[11px] font-bold text-sps-violet600 hover:text-sps-violet700 dark:text-sps-violet400"
                    >
                      <span>👁️ Votants ({opt.voters.length})</span>
                      <span className="text-[9px]">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {opt.voters.length > 0 ? (
                          opt.voters.map((v, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-800 shadow-xs dark:border-white/10 dark:bg-white/10 dark:text-white"
                            >
                              {v.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] italic text-neutral-400">Aucun votant pour l&apos;instant</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action : Modifier mon vote */}
          {!poll.is_closed && (
            <div className="pt-3 mt-1 flex items-center justify-end border-t border-neutral-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="inline-flex items-center gap-1 text-xs font-bold text-sps-violet600 hover:underline dark:text-sps-violet400"
              >
                <Icon name={hasVoted ? "pencil" : "poll"} size={13} />
                <span>{hasVoted ? "Modifier mon vote" : "Passer au vote"}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* VUE FORMULAIRE DE VOTE */
        <form onSubmit={handleVoteSubmit} className="mt-4 space-y-3">
          {/* Saisie Prénom + Nom */}
          <div>
            <label className="block text-[11px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 mb-1.5">
              <span className="uppercase">Votre Prénom + Nom</span>{" "}
              <span className="font-normal normal-case text-neutral-400 dark:text-neutral-500">
                (le vote n&apos;est pas nominatif, votre nom n&apos;apparaît pas)
              </span>{" "}
              <span className="text-sps-violet600 dark:text-sps-violet400">*</span>
            </label>
            <input
              type="text"
              required
              value={voterName}
              onChange={(e) => setVoterName(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-bold text-neutral-900 outline-none transition focus:border-sps-violet500 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            />
          </div>

          {/* Options de vote */}
          <div className="space-y-2 pt-1">
            {poll.options.map((opt) => {
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => toggleOptionSelection(opt.id)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
                    isSelected
                      ? "border-sps-violet600 bg-sps-violet600/10 text-sps-violet950 dark:border-sps-violet500 dark:bg-sps-violet600/20 dark:text-white shadow-xs"
                      : "border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-100/50 text-neutral-800 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] dark:text-white"
                  }`}
                >
                  <span className="text-xs font-bold">{opt.title}</span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center ${
                      poll.allow_multiple ? "rounded-md" : "rounded-full"
                    } border transition ${
                      isSelected
                        ? "border-sps-violet600 bg-sps-violet600 text-white dark:border-sps-violet500"
                        : "border-neutral-300 dark:border-white/30"
                    }`}
                  >
                    {isSelected && <Icon name="check" size={12} />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Boutons d'action vote */}
          <div className="pt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowResults(true)}
              className="text-xs font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition"
            >
              Voir les résultats
            </button>

            <button
              type="submit"
              disabled={isSubmitting || selectedOptions.length === 0}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sps-violet600 to-[#AA26FF] px-4 py-2 text-xs font-black text-white shadow-md shadow-violet-600/30 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
            >
              <Icon name="check" size={14} />
              <span>
                {isSubmitting
                  ? "Enregistrement..."
                  : hasVoted
                  ? "Mettre à jour mon vote"
                  : "Valider mon vote"}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* Barre d'administration (réservée aux admins) */}
      {isAdmin && (
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs dark:border-white/10">
          <span className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
            🛡️ Admin
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10 transition"
            >
              <Icon name="pencil" size={11} />
              <span>Modifier</span>
            </button>
            <button
              type="button"
              onClick={handleToggleClosed}
              className="rounded-lg border border-neutral-200 px-2.5 py-1 text-[11px] font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10 transition"
            >
              {poll.is_closed ? "🔓 Rouvrir" : "🔒 Clôturer"}
            </button>
            <button
              type="button"
              onClick={handleDeletePoll}
              className="rounded-lg border border-red-500/20 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-500/10 dark:text-red-400 transition"
            >
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Modale de modification réservée aux admins */}
      {isAdmin && isEditModalOpen && (
        <EditPollModal
          isOpen={isEditModalOpen}
          poll={poll}
          onClose={() => setIsEditModalOpen(false)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
}
