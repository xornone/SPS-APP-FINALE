/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    // Sans ca, le navigateur peut reafficher une page deja visitee (Accueil,
    // Sorties, une fiche sortie — toutes mises en cache via export const
    // revalidate) depuis son propre cache cote client pendant encore
    // plusieurs minutes, meme apres qu'un revalidatePath() a rafraichi le
    // cache serveur suite a une inscription/un retrait. A 0, chaque
    // navigation revient verifier aupres du serveur (qui, lui, repond vite
    // grace a son propre cache tant qu'il n'a pas ete invalide) : les
    // changements de participants se refletent immediatement en changeant
    // d'onglet, au lieu d'attendre l'expiration de ce cache navigateur.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
