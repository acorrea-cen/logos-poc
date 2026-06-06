import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOGOS — Conocimiento Audiovisual",
  description: "Plataforma offline de transcripción y búsqueda semántica de videos de capacitación",
  // Sin favicons externos, sin manifests que carguen recursos remotos
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      {/* Sin Google Fonts — fuentes del sistema para cumplir air-gap */}
      <body>{children}</body>
    </html>
  );
}
