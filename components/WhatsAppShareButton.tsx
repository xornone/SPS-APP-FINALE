"use client";

import { useEffect, useState } from "react";
import { whatsAppShareUrl } from "@/lib/shareMessage";
import { Icon } from "./Icons";

// Bouton admin : publie une sortie sur WhatsApp.
//
// Sur les navigateurs qui supportent le partage natif de fichiers (Web
// Share API, surtout mobile — Safari iOS 15+, Chrome Android) : un seul
// tap ouvre le partage systeme avec le texte ET l'image du parcours,
// l'admin choisit WhatsApp dans la liste.
//
// Ailleurs (WhatsApp Web sur ordinateur notamment, qui n'a pas acces au
// partage natif du systeme) : deux actions separees — le texte pret via le
// lien officiel wa.me, et l'image a telecharger pour l'attacher a la main
// dans la meme conversation avant d'envoyer.
export function WhatsAppShareButton({
  text,
  imageUrl,
  imageFilename,
}: {
  text: string;
  imageUrl: string;
  imageFilename: string;
}) {
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // navigator.canShare({ files }) exige un vrai File pour repondre —
    // on ne peut donc que verifier ici que l'API existe, et affiner au
    // clic (avec repli sur le lien texte si jamais elle refuse le fichier).
    setCanShareFiles(typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare);
  }, []);

  async function handleNativeShare() {
    setPending(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("image indisponible");
      const blob = await res.blob();
      const file = new File([blob], imageFilename, { type: blob.type || "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text });
        setPending(false);
        return;
      }
    } catch (err: any) {
      setPending(false);
      if (err?.name === "AbortError") return; // partage annule par l'admin, rien a faire
      window.open(whatsAppShareUrl(text), "_blank", "noopener,noreferrer");
      return;
    }
    setPending(false);
    window.open(whatsAppShareUrl(text), "_blank", "noopener,noreferrer");
  }

  if (canShareFiles) {
    return (
      <button
        type="button"
        onClick={handleNativeShare}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold disabled:opacity-60 dark:border-white/15 dark:bg-[#1A1422]"
      >
        <Icon name="chat" size={15} className="text-emerald-500" />
        {pending ? "Préparation…" : "Publier sur WhatsApp"}
      </button>
    );
  }

  return (
    <div className="flex gap-2.5">
      <a
        href={whatsAppShareUrl(text)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
      >
        <Icon name="chat" size={15} className="text-emerald-500" /> Publier sur WhatsApp
      </a>
      <a
        href={imageUrl}
        download={imageFilename}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-[13px] font-bold dark:border-white/15 dark:bg-[#1A1422]"
      >
        <Icon name="download" size={15} /> Image du parcours
      </a>
    </div>
  );
}
