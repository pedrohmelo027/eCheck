import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'eCheck',
  description: 'Conferência de recebimento de materiais',
};

// Layout raiz. O menu por tipo (components/ui/Menu) entra nas telas logadas a partir do UC02,
// quando GET /auth/me existir.
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full bg-zinc-50 font-sans text-zinc-900">{children}</body>
    </html>
  );
}
