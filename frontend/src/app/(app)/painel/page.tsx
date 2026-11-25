'use client';

import { useUsuario } from '@/components/ui/AreaLogada';

// Tela inicial após o login. O painel geral (UC09) substitui este conteúdo.
export default function PainelPage() {
  const usuario = useUsuario();
  return (
    <main className="flex flex-1 flex-col gap-2 p-6">
      <h1 className="text-xl font-semibold">Painel</h1>
      <p className="text-sm text-zinc-500">Olá, {usuario.nome}. O painel geral chega no UC09.</p>
    </main>
  );
}
