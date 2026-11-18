/**
 * Utilitaire de compression et de redimensionnement d'images côté client.
 * Transforme un fichier image sélectionné (JPEG, PNG, HEIC, WebP...)
 * en une Data URL JPEG optimisée (typiquement 70–150 Ko), évitant tout dépassement
 * de taille et garantissant un affichage instantané et fluide sur mobile.
 */
export async function compressImageFile(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Le fichier sélectionné n'est pas une image valide."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Impossible de lire le fichier image."));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return reject(new Error("Contenu de l'image vide."));

      const img = new Image();
      img.onerror = () => reject(new Error("Impossible de décoder l'image."));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Conserver le ratio d'aspect tout en limitant les dimensions maximales
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(src); // Fallback image brute si canvas non supporté
          }

          // Fond blanc pour les PNG / images transparentes
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch {
          // En cas d'erreur de canvas, renvoyer la source d'origine
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
