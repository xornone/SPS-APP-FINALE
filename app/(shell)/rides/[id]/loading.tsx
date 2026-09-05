// Affiche instantanement pendant que la fiche sortie se charge — la partie
// la plus cliquee de l'app, donc celle ou l'effet "ecran fige" se voyait le
// plus.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08] ${className}`} />;
}

export default function RideDetailLoading() {
  return (
    <div>
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <Bar className="h-9 w-9 rounded-xl" />
      </div>

      <div className="px-5 pb-4">
        <Bar className="mb-2 h-7 w-3/4" />
        <div className="flex gap-4">
          <Bar className="h-3.5 w-20" />
          <Bar className="h-3.5 w-16" />
          <Bar className="h-3.5 w-28" />
        </div>
      </div>

      <div className="mx-5 mb-4 h-[220px] animate-pulse rounded-[22px] bg-black/[0.05] dark:bg-white/[0.06]" />

      <div className="flex gap-2.5 px-5 py-4">
        {[0, 1, 2].map((i) => (
          <Bar key={i} className="h-16 flex-1 rounded-2xl" />
        ))}
      </div>

      <div className="flex flex-col gap-2 px-5">
        {[0, 1].map((i) => (
          <Bar key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
