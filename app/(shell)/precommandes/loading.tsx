// Squelette de chargement instantané pour la page Précommandes.
// Permet d'éviter l'écran blanc/vide pendant la vérification de session et le rendu.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-white/[0.08] ${className}`} />;
}

export default function PrecommandesLoading() {
  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-hidden bg-gradient-to-b from-[#11071F] via-[#1A0B2E] to-[#0D0418] px-4 pb-12 pt-4 text-white">
      {/* Barre supérieure : Retour Accueil + ThemeToggle */}
      <div className="flex items-center justify-between pb-3">
        <Bar className="h-8 w-24 rounded-full bg-white/10" />
        <Bar className="h-9 w-9 rounded-xl bg-white/10" />
      </div>

      {/* Header : Badge + Tabs pill */}
      <div className="mt-2 text-center">
        <div className="mx-auto mb-3 flex justify-center">
          <Bar className="h-6 w-56 rounded-full bg-fuchsia-500/20" />
        </div>

        {/* Pilules des articles */}
        <div className="mx-auto flex max-w-sm justify-center gap-1.5 overflow-hidden py-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-8 w-20 rounded-full bg-white/10" />
          ))}
        </div>

        {/* Titre & Sous-titre */}
        <div className="mx-auto mt-4 flex flex-col items-center gap-2">
          <Bar className="h-9 w-64 rounded-xl bg-white/15" />
          <Bar className="h-4 w-44 rounded-md bg-fuchsia-400/20" />
          <Bar className="mt-1 h-3.5 w-60 rounded-md bg-white/10" />
        </div>
      </div>

      {/* Vitrine Produit : Placeholder silhouette */}
      <div className="relative mx-auto mt-3 max-w-sm px-6">
        <div className="flex h-72 w-full items-center justify-center rounded-3xl bg-white/[0.03]">
          <Bar className="h-56 w-44 rounded-2xl bg-white/[0.07]" />
        </div>
      </div>

      {/* Métriques */}
      <div className="mx-auto mt-5 grid max-w-sm grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] p-2.5"
          >
            <Bar className="mb-1.5 h-4 w-10 bg-white/20" />
            <Bar className="h-2.5 w-12 bg-white/10" />
          </div>
        ))}
      </div>

      {/* Bouton CTA HelloAsso */}
      <div className="mx-auto mt-5 max-w-sm">
        <Bar className="h-12 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600/40 to-purple-600/40" />
      </div>

      {/* Fiche Narrative */}
      <div className="mx-auto mt-5 max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <Bar className="mb-3 h-5 w-40 rounded-full bg-white/15" />
        <div className="flex flex-col gap-2">
          <Bar className="h-3 w-full bg-white/10" />
          <Bar className="h-3 w-5/6 bg-white/10" />
          <Bar className="h-3 w-4/6 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
