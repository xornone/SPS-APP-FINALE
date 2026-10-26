"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import type { Suggestion } from "@/lib/suggestionsStorage";

export function AdminSuggestionsList({ refreshKey }: { refreshKey?: number }) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "done">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  async function loadSuggestions() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/suggestions");
      if (!res.ok) {
        throw new Error("Impossible de charger les suggestions.");
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuggestions();
  }, [refreshKey]);

  async function handleToggleStatus(id: string) {
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/admin/suggestions/${id}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Erreur.");
      const data = await res.json();
      setSuggestions((prev) => prev.map((s) => (s.id === id ? data.suggestion : s)));
    } catch {
      alert("Erreur lors de la mise à jour du statut.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Es-tu sûr de vouloir supprimer cette suggestion ?")) return;
    try {
      setActionLoadingId(id);
      const res = await fetch(`/api/admin/suggestions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur.");
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const timeStr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      if (isToday) {
        return `Aujourd'hui à ${timeStr}`;
      }
      return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${timeStr}`;
    } catch {
      return iso;
    }
  }

  const filtered = suggestions.filter((s) => {
    if (filter === "new") return s.status === "new";
    if (filter === "done") return s.status === "done";
    return true;
  });

  return (
    <div className="mt-8 border-t border-black/10 px-5 pt-7 dark:border-white/10">
      {/* En-tête section Admin */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            👑
          </span>
          <div>
            <h2 className="font-display text-xl tracking-wide text-black dark:text-white">
              Idées reçues (Admin)
            </h2>
            <p className="text-[11.5px] text-black/50 dark:text-white/50">
              Visible uniquement par les membres du bureau
            </p>
          </div>
        </div>
        <span className="rounded-full bg-sps-violet100 px-2.5 py-1 text-xs font-extrabold text-sps-violet700 dark:bg-sps-violet950 dark:text-sps-violet300">
          {suggestions.length}
        </span>
      </div>

      {/* Filtres de statut */}
      <div className="mb-4 flex gap-1.5">
        {[
          { id: "all", label: `Toutes (${suggestions.length})` },
          { id: "new", label: `À voir (${suggestions.filter((s) => s.status === "new").length})` },
          { id: "done", label: `Traitées (${suggestions.filter((s) => s.status === "done").length})` },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as "all" | "new" | "done")}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              filter === f.id
                ? "bg-sps-violet600 text-white"
                : "border border-black/10 bg-white text-black/60 hover:bg-black/5 dark:border-white/10 dark:bg-[#1A1422] dark:text-white/60 dark:hover:bg-white/5"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="py-8 text-center text-sm text-black/40 dark:text-white/40">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-sps-violet600/30 border-t-sps-violet600" />
          <p className="mt-2 text-xs">Chargement des idées...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-50 p-4 text-center text-xs text-red-600 dark:bg-red-950/20 dark:text-red-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-xs text-black/40 dark:border-white/10 dark:text-white/40">
          Aucune idée ne correspond à ce filtre.
        </div>
      ) : (
        <div className="space-y-3.5 pb-10">
          {filtered.map((item) => {
            const isItemLoading = actionLoadingId === item.id;
            const isDone = item.status === "done";

            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isDone
                    ? "border-black/5 bg-white/50 opacity-80 dark:border-white/5 dark:bg-[#1A1422]/50"
                    : "border-black/10 bg-white shadow-cardSm dark:border-white/10 dark:bg-[#1A1422]"
                }`}
              >
                {/* Ligne du haut : Catégorie + Date + Statut */}
                <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-2.5 dark:border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-sps-violet50 px-2 py-0.5 text-[11px] font-extrabold text-sps-violet700 dark:bg-sps-violet950/60 dark:text-sps-violet300">
                      {item.category}
                    </span>
                    <span className="text-[11.5px] text-black/40 dark:text-white/40">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                      isDone
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {isDone ? "Traité ✓" : "Nouveau"}
                  </span>
                </div>

                {/* Corps : Auteur & Message */}
                <div className="p-4">
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-bold text-black dark:text-white">
                      {item.is_anonymous ? "🕶️ Membre anonyme" : `👤 ${item.author_name}`}
                    </span>
                    {item.email && (
                      <a
                        href={`mailto:${item.email}?subject=Suite à ton idée sur l'app SPS`}
                        className="flex items-center gap-1 rounded-md bg-black/5 px-2 py-0.5 text-[11.5px] font-medium text-sps-violet600 hover:underline dark:bg-white/5 dark:text-sps-violet400"
                      >
                        <span>✉️ {item.email}</span>
                      </a>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-black/85 dark:text-white/85">
                    {item.message}
                  </p>
                </div>

                {/* Barre d'action admin */}
                <div className="flex items-center justify-between border-t border-black/[0.06] bg-[#FAF8FB] px-4 py-2 dark:border-white/[0.06] dark:bg-[#150F1D]">
                  <button
                    type="button"
                    disabled={isItemLoading}
                    onClick={() => handleToggleStatus(item.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-black/60 transition hover:text-sps-violet600 disabled:opacity-50 dark:text-white/60 dark:hover:text-sps-violet400"
                  >
                    <Icon name={isDone ? "refresh" : "check"} size={13} />
                    <span>{isDone ? "Marquer comme à traiter" : "Marquer comme traité"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isItemLoading}
                    onClick={() => handleDelete(item.id)}
                    aria-label="Supprimer la suggestion"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-black/40 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:text-white/40 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
