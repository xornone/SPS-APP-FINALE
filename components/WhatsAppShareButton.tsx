"use client";

import { whatsAppShareUrl } from "@/lib/shareMessage";
import { Icon } from "./Icons";

// Bouton admin : ouvre WhatsApp (app ou WhatsApp Web) avec un message
// pre-rempli resumant la sortie, pret a etre envoye dans la conversation
// ou le groupe de son choix. Lien "click to chat" officiel WhatsApp
// (wa.me) — aucune cle API, aucun compte a connecter.
export function WhatsAppShareButton({ text }: { text: string }) {
  return (
    <a
      href={whatsAppShareUrl(text)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
    >
      <Icon name="chat" size={15} className="text-emerald-500" /> Publier sur WhatsApp
    </a>
  );
}
