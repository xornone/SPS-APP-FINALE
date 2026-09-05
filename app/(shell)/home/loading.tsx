// Affiche instantanement pendant que les donnees de l'accueil se chargent
// (Next.js affiche ce fichier des le clic sur l'onglet, sans attendre) —
// evite l'ecran vide qui donnait une impression de lenteur.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08] ${className}`} />;
}

export default function HomeLoading() {
  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <Bar className="h-7 w-36" />
        <Bar className="h-9 w-9 rounded-xl" />
      </div>

      <div className="px-5 pb-2">
        <Bar className="h-6 w-40" />
      </div>
      <div className="mb-6 px-5">
        <div className="h-[150px] rounded-[22px] bg-black/[0.05] dark:bg-white/[0.06]" />
      </div>

      <div className="px-5 pb-2">
        <Bar className="h-6 w-32" />
      </div>
      <div className="flex flex-col gap-3 px-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-[20px] border border-black/[0.06] bg-white p-4 dark:border-white/10 dark:bg-[#1A1422]">
            <Bar className="h-3.5 w-24" />
            <Bar className="h-4 w-2/3" />
            <Bar className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
