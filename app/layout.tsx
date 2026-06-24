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
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: aplica el tema antes del primer render */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
