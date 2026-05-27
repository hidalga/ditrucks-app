import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ditrucks — Sistema de Gestión",
  description: "Sistema de órdenes de servicio, archivos ECU y diagnóstico preventivo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
