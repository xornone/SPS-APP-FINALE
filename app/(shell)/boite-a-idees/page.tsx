import { ThemeToggle } from "@/components/ThemeToggle";
import { SuggestionForm } from "@/components/SuggestionForm";

export const metadata = {
  title: "Boîte à idées — SPS",
  description: "Partagez vos idées, questions, parcours et suggestions avec l'équipe du club SPS.",
};

export default function BoiteAIdeesPage() {
  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <div>
          <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-sps-violet600 dark:text-sps-violet400">
            Espace Membres
          </span>
          <h1 className="font-display text-[26px] tracking-wide text-black dark:text-white">
            Boîte à idées 💡
          </h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Carte d'introduction */}
      <div className="mx-5 mb-3 rounded-2xl bg-gradient-to-br from-sps-violet600/10 via-sps-violet800/5 to-transparent p-4 dark:from-sps-violet500/15 dark:via-sps-violet900/10">
        <p className="text-[13.5px] leading-relaxed text-black/75 dark:text-white/80">
          Une idée de sortie, une proposition d&apos;amélioration, un retour ou une question pour le bureau ?
          Exprime-toi librement, avec ton nom ou de manière <b>100% anonyme</b>. Tous les messages sont transmis directement à <span className="font-semibold text-sps-violet700 dark:text-sps-violet300">contact@spscycling.fr</span> !
        </p>
      </div>

      {/* Formulaire */}
      <SuggestionForm />
    </div>
  );
}
