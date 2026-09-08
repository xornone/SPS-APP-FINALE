import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SPS — Sorties",
    short_name: "SPS",
    description: "L'application du club de cyclisme SPS : sorties, parcours et participation.",
    start_url: "/",
    display: "standalone",
    background_color: "#33124F",
    theme_color: "#33124F",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
