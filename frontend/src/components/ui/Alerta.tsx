/** Mensagem de erro ou sucesso. Os erros mostram a mensagem EX do back-end. */
export function Alerta({ tipo, children }: { tipo: 'erro' | 'sucesso'; children: React.ReactNode }) {
  const cores = tipo === 'erro' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800';
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded border px-3 py-2 text-sm ${cores}`}>
      {children}
    </div>
  );
}
