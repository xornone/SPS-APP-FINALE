// Affiche instantanement pendant que la liste des sorties se charge.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-black/[0.06] dark:bg-white/[0.08] ${className}`} />;
}

export default function RidesLoading() {
  return (
    <div>
      <div className="px-5 pb-3 pt-5">
        <Bar className="h-7 w-28" />
      </div>
      <div className="flex gap-2 px-5 pb-4">
        {[0, 1, 2].map((i) => (
          <Bar key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="flex flex-col gap-3 px-5">
        {[0, 1, 2, 3].map((i) => (
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
