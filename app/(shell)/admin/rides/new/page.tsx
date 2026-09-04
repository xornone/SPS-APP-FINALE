import Link from "next/link";
import { RideForm } from "@/components/RideForm";
import { Icon } from "@/components/Icons";

export default function NewRidePage() {
  return (
    <div>
      <div className="flex items-center gap-3 px-5 pb-2 pt-5">
        <Link
          href="/admin"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-xl border border-black/[0.08] bg-white dark:border-white/10 dark:bg-[#1A1422]"
        >
          <Icon name="chevL" size={18} />
        </Link>
        <h1 className="font-display text-xl tracking-wide">Nouvelle sortie</h1>
      </div>
      <div className="pt-3">
        <RideForm />
      </div>
    </div>
  );
}
