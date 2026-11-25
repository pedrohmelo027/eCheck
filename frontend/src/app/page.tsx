// Tela provisória da Fase 0. No UC02 a raiz passa a redirecionar para /login ou /painel.
export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">eCheck</h1>
      <p className="text-zinc-500">Conferência de recebimento de materiais — em desenvolvimento.</p>
    </main>
  );
}
