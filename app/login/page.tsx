"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-[#3a1a63] via-[#1a0f2c] to-[#0c0714] px-6 py-12 text-white">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-sps-violet400 to-sps-violet600 shadow-[0_0_0_4px_rgba(167,139,250,.18)]" />
          <span className="font-display text-2xl tracking-[.14em]">SPS</span>
        </div>
        <p className="max-w-xs text-sm text-white/60">Solo Plus Solo — connexion administrateur</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur"
      >
        <h1 className="mb-1 font-display text-2xl tracking-wide">Connexion</h1>
        <p className="mb-5 text-sm text-white/60">
          Réservée à l&apos;administrateur du club. Les membres n&apos;ont pas besoin de compte pour s&apos;inscrire aux sorties.
        </p>

        {status === "sent" ? (
          <div className="rounded-2xl bg-emerald-500/15 p-4 text-sm text-emerald-200">
            Email envoyé à <b>{email}</b>. Ouvre le lien reçu pour te connecter.
          </div>
        ) : (
          <>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/50">
              Adresse email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@exemple.fr"
              className="mb-4 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-sps-violet400"
            />
            {status === "error" && (
              <p className="mb-3 text-xs text-red-300">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 px-4 py-3 text-sm font-extrabold shadow-lg shadow-violet-900/40 disabled:opacity-60"
            >
              {status === "sending" ? "Envoi…" : "Recevoir mon lien de connexion"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
