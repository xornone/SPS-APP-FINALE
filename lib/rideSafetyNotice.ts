// Texte fixe de consignes de securite/equipement, affiche sous la
// description de CHAQUE sortie (peu importe ce que l'admin a ecrit dans le
// champ description). Volontairement garde a part de `ride.description` —
// et jamais fusionne dedans — pour que le partage WhatsApp
// (lib/shareMessage.ts) puisse continuer a n'utiliser que la description
// propre a la sortie sans avoir a retirer ce texte d'un blob unique.
export const RIDE_SAFETY_NOTICE = `⚠️ Si ton niveau n’est pas adapté à l’allure de la sortie, nous te demanderons de terminer la sortie en autonomie pour ne pas pénaliser le groupe

🛡️ Équipement obligatoire pour les sorties SPS :

Chaque participant doit être équipé de :
• Casque obligatoire
• Kit anti-crevaison (chambre à air, etc)
• Éclairage avant et arrière si la sortie a lieu de nuit ou en conditions de faible visibilité
• Eau : minimum 1 bidon de 750 ml (même en hiver)
• ❌ Prolongateurs interdits

🗺️ Trace GPS

Si tu as un GPS, merci d’y charger la trace de la sortie.
Cela évite les erreurs de parcours et améliore la sécurité du groupe.

⏰ Horaires

Les heures de départ doivent être respectées.
👉 Le groupe partira au maximum 5 minutes après l’heure indiquée.

ℹ️ Infos

L’association SPS dispose d’une assurance couvrant ses activités ainsi que ses membres.
Cependant, chaque participant reste responsable de son comportement, de son matériel et de son état de santé pendant la sortie.
Chacun s’engage à respecter le code de la route et à adopter une conduite prudente afin de garantir sa sécurité ainsi que celle du groupe.`;
