import { redirect } from "next/navigation";

// L'onglet "Sorties" a fusionne avec "Accueil" (meme visuel, meme liste
// avec filtres) pour eviter le doublon entre les deux onglets. On garde
// cette route en simple redirection plutot que de la supprimer, au cas ou
// un lien externe ou un favori pointerait encore vers /rides.
export default function RidesPage() {
  redirect("/home");
}
