// Intercalaire affiché entre les sorties de deux semaines calendaires
// différentes (lundi -> dimanche) dans les listes de sorties.
export function WeekDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-0.5 pt-1">
      <span className="flex-none text-[10.5px] font-extrabold uppercase tracking-wide text-black/35 dark:text-white/35">
        {label}
      </span>
      <span className="h-px flex-1 bg-black/[0.08] dark:bg-white/10" />
    </div>
  );
}
