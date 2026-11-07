import "./globals.css";
import EnregistrerSW from "./EnregistrerSW";

export const metadata = {
  title: "ÉcoClic",
  description: "Rappels de collecte des poubelles à Gournay-sur-Marne",
  appleWebApp: { capable: true, title: "ÉcoClic", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport = {
  themeColor: "#1d5c3c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <EnregistrerSW />
        {children}
      </body>
    </html>
  );
}
