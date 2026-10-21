// Squelette de chargement instantané pour la page Administration.
// Évite l'écran figé au clic sur l'onglet Admin pendant les requêtes serveur.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08] ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div className="relative">
      {/* En-tête Administration */}
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <div>
          <Bar className="h-7 w-40" />
          <Bar className="mt-1.5 h-3.5 w-52" />
        </div>
        <Bar className="h-9 w-9 rounded-xl" />
      </div>

      {/* Bloc Strava */}
      <div className="px-5 pb-5">
        <Bar className="mb-2 h-5 w-36" />
        <Bar className="mb-3 h-3 w-5/6" />
        <div className="flex h-11 w-full items-center justify-center rounded-2xl border border-black/[0.06] bg-white p-2 dark:border-white/10 dark:bg-[#1A1422]">
          <Bar className="h-4 w-32" />
        </div>
      </div>

      {/* Liste des sorties */}
      <div className="flex flex-col gap-2.5 px-5 pb-24">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 dark:border-white/10 dark:bg-[#1A1422]"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bar className="h-4 w-44" />
              <Bar className="h-3 w-32" />
            </div>
            <div className="flex flex-none gap-1.5">
              <Bar className="h-8 w-8 rounded-[10px]" />
              <Bar className="h-8 w-8 rounded-[10px]" />
            </div>
          </div>
        ))}
      </div>

      {/* Bouton flottant (+) */}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-5">
        <div className="ml-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sps-violet600/30">
          <Bar className="h-6 w-6 rounded-md bg-white/40" />
        </div>
      </div>
    </div>
  );
}
