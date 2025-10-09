import './globals.css';

export const metadata = {
  title: 'Control Financiero',
  description: 'Gestiona tus finanzas personales con historial mensual y análisis visual.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-white min-h-screen">{children}</body>
    </html>
  );
}
