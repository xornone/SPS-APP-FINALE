/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  experimental: {
    // Sans ca, Next.js peut reafficher une page deja visitee (Accueil,
    // Sorties, une fiche sortie, Classement) depuis son propre cache cote
    // navigateur au lieu de redemander la page au serveur — y compris en
    // changeant d'onglet ou avec le bouton retour. A 0, chaque navigation
    // revient toujours chercher la version courante aupres du serveur : vu
    // que ces pages sont elles-memes rendues a chaque requete (voir
    // export const dynamic = "force-dynamic" sur chacune), l'app se met a
    // jour a chaque clic, comme demande par le club, plutot que de
    // reafficher une version potentiellement perimee.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

export default nextConfig;
