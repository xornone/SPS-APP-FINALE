"use client";

import { useEffect, useState, useCallback } from "react";
import { Poll } from "@/lib/pollsStorage";
import { PollCard } from "./PollCard";
import { CreatePollModal } from "./CreatePollModal";
import { Icon } from "./Icons";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { getOrCreateVoterToken, getInitialVoterName } from "@/lib/pollClient";

export function PollsView() {
  const isAdmin = useIsAdmin();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");

  const fetchPolls = useCallback(async () => {
    try {
      const token = getOrCreateVoterToken();
      const voterName = getInitialVoterName();
      const params = new URLSearchParams();
      if (token) params.set("voter_token", token);
      if (voterName) params.set("voter_name", voterName);

      const res = await fetch(`/api/polls?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.polls)) {
        setPolls(data.polls);
      }
    } catch (err) {
      console.error("Erreur chargement sondages :", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const activePolls = polls.filter((p) => !p.is_closed);
  const closedPolls = polls.filter((p) => p.is_closed);
  const currentList = activeTab === "active" ? activePolls : closedPolls;

  return (
    <div className="px-4 pt-5 pb-12 sm:px-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sps-violet600/10 text-sps-violet600 dark:bg-sps-violet600/20 dark:text-sps-violet400">
              <Icon name="poll" size={16} />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-sps-violet600 dark:text-sps-violet400">
              Avis du Club
            </span>
          </div>
          <h1 className="font-display text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1">
            Sondages SPS 📊
          </h1>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Participez aux décisions, votez pour vos sorties et projets préférés.
          </p>
        </div>

        {/* Bouton Créer (Admin) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-sps-violet600 to-[#AA26FF] px-3.5 py-2 text-xs font-black text-white shadow-lg shadow-violet-600/30 transition hover:brightness-110 active:scale-95 flex-shrink-0"
          >
            <Icon name="plus" size={14} />
            <span>Nouveau</span>
          </button>
        )}
      </div>

      {/* Badge Phase de Test Admin */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
        <span className="text-base flex-shrink-0">🛡️</span>
        <span>
          <strong>Mode Test Admin :</strong> cette page et ses sondages sont visibles uniquement par les administrateurs connectés.
        </span>
      </div>

      {/* Onglets En cours / Terminés */}
      <div className="mt-5 flex items-center gap-2 border-b border-neutral-200/80 pb-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("active")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
            activeTab === "active"
              ? "bg-sps-violet600 text-white shadow-sm shadow-violet-600/30"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/60 dark:bg-white/10 dark:text-neutral-300"
          }`}
        >
          <span>En cours</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              activeTab === "active" ? "bg-white/20 text-white" : "bg-neutral-200 dark:bg-white/20"
            }`}
          >
            {activePolls.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("closed")}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
            activeTab === "closed"
              ? "bg-sps-violet600 text-white shadow-sm shadow-violet-600/30"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200/60 dark:bg-white/10 dark:text-neutral-300"
          }`}
        >
          <span>Terminés</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              activeTab === "closed" ? "bg-white/20 text-white" : "bg-neutral-200 dark:bg-white/20"
            }`}
          >
            {closedPolls.length}
          </span>
        </button>
      </div>

      {/* Liste des sondages */}
      <div className="mt-5 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <span className="inline-block animate-spin text-2xl mb-2">⏳</span>
            <p className="text-xs font-bold">Chargement des sondages...</p>
          </div>
        ) : currentList.length > 0 ? (
          currentList.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              isAdmin={isAdmin}
              onRefresh={fetchPolls}
            />
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-neutral-300/80 p-8 text-center dark:border-white/15">
            <span className="text-3xl">🗳️</span>
            <p className="mt-2 text-sm font-black text-neutral-900 dark:text-white">
              {activeTab === "active" ? "Aucun sondage en cours" : "Aucun sondage archivé"}
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
              {activeTab === "active"
                ? "Dès qu'un nouveau vote ou choix de sortie sera proposé par le club, il apparaîtra ici."
                : "Les sondages terminés avec leurs résultats finaux s'archiveront ici."}
            </p>
            {isAdmin && activeTab === "active" && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sps-violet600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-sps-violet700"
              >
                <Icon name="plus" size={14} />
                <span>Créer le premier sondage</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de création (Admin) */}
      <CreatePollModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchPolls}
      />
    </div>
  );
}
