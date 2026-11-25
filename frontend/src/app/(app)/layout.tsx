import { Suspense } from 'react';
import { AreaLogada } from '@/components/ui/AreaLogada';

/**
 * Telas que exigem login. O proxy.ts já barrou quem não tem sessão.
 * Suspense: a área logada lê a URL (menu, permissão por tipo), e no Next 16 com Cache Components
 * isso precisa de um limite de Suspense para as rotas dinâmicas (ex.: /projetos/[id]).
 */
export default function LayoutAreaLogada({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Carregando…</div>}>
      <AreaLogada>{children}</AreaLogada>
    </Suspense>
  );
}
