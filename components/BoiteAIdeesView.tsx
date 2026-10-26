"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { SuggestionForm } from "./SuggestionForm";
import { AdminSuggestionsList } from "./AdminSuggestionsList";
import { AdminOnly } from "./AdminOnly";
import { Icon } from "./Icons";

export function BoiteAIdeesView() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleIdeaSubmitted() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            prefetch={true}
            aria-label="Retour à l'accueil"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.08] bg-white shadow-cardSm transition hover:scale-105 active:scale-95 dark:border-white/10 dark:bg-[#1A1422]"
          >
            <Icon name="chevL" size={18} />
          </Link>
          <div>
            <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-sps-violet600 dark:text-sps-violet400">
              Espace Membres
            </span>
            <h1 className="font-display text-[24px] tracking-wide text-black dark:text-white">
              Boîte à idées 💡
            </h1>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Carte d'introduction */}
      <div className="mx-5 mb-3 rounded-2xl bg-gradient-to-br from-sps-violet600/10 via-sps-violet800/5 to-transparent p-4 dark:from-sps-violet500/15 dark:via-sps-violet900/10">
        <p className="text-[13.5px] leading-relaxed text-black/75 dark:text-white/80">
          Une idée de sortie, une proposition, une question ou une remarque pour le club ?
          Exprime-toi librement, avec ton nom ou de façon <b>100% anonyme</b>. Tous les messages sont consultés directement par les administrateurs du club.
        </p>
      </div>

      {/* Formulaire de soumission d'idée (Message d'abord, sans pièces jointes, sans email externe) */}
      <SuggestionForm onSubmitted={handleIdeaSubmitted} />

      {/* Section réservée aux admins : Liste des idées reçues */}
      <AdminOnly>
        <AdminSuggestionsList refreshKey={refreshKey} />
      </AdminOnly>
    </div>
  );
}
