const CORES = {
  erro: 'border-red-200 bg-red-50 text-red-800',
  sucesso: 'border-green-200 bg-green-50 text-green-800',
  aviso: 'border-amber-200 bg-amber-50 text-amber-900',
} as const;

/** Mensagem de erro, sucesso ou aviso. Erros e avisos mostram a mensagem EX do back-end. */
export function Alerta({ tipo, children }: { tipo: keyof typeof CORES; children: React.ReactNode }) {
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded border px-3 py-2 text-sm ${CORES[tipo]}`}>
      {children}
    </div>
  );
}
