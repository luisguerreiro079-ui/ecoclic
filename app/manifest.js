// Fiche d'identité de l'appli : c'est elle qui permet de l'installer sur l'écran d'accueil.
export default function manifest() {
  return {
    name: "ÉcoClic",
    short_name: "ÉcoClic",
    description: "Rappels de collecte des poubelles à Gournay-sur-Marne",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2ee",
    theme_color: "#1d5c3c",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
