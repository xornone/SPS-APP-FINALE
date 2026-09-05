// Affiche instantanement pendant que les statistiques du club se chargent.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08] ${className}`} />;
}

export default function ClassementLoading() {
  return (
    <div>
      <div className="px-5 pb-3 pt-5">
        <Bar className="h-7 w-52" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-black/[0.06] bg-white p-4 dark:border-white/10 dark:bg-[#1A1422]">
            <Bar className="mb-2 h-6 w-16" />
            <Bar className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 px-5">
        {[0, 1, 2].map((i) => (
          <Bar key={i} className="h-12 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
