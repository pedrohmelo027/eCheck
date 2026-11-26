'use client';

import { useState } from 'react';

interface Props {
  nome: string;
  email: string;
  senha: string;
  aoFechar: () => void;
}

/**
 * Mostra a senha provisória UMA única vez, para o Administrador repassar.
 * Ela não fica guardada em lugar nenhum; se perder, gera-se outra.
 */
export function SenhaProvisoria({ nome, email, senha, aoFechar }: Props) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const texto = `Sistema: ${window.location.origin}\nE-mail: ${email}\nSenha provisória: ${senha}\n(você vai definir uma nova senha no primeiro acesso)`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section role="dialog" aria-labelledby="titulo-senha" className="flex max-w-xl flex-col gap-3 rounded border-2 border-blue-600 bg-blue-50 p-4">
      <h2 id="titulo-senha" className="font-semibold text-blue-900">
        Senha provisória de {nome}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-zinc-600">E-mail</dt>
        <dd className="font-medium">{email}</dd>
        <dt className="text-zinc-600">Senha</dt>
        <dd className="select-all font-mono text-base font-semibold tracking-wide">{senha}</dd>
      </dl>
      <p className="text-sm text-amber-800">
        Anote ou copie agora: esta senha <strong>não será mostrada de novo</strong>. A pessoa vai definir a própria senha no primeiro acesso.
      </p>
      <div className="flex gap-2">
        <button onClick={copiar} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          {copiado ? '✓ Copiado' : 'Copiar e-mail e senha'}
        </button>
        <button onClick={aoFechar} className="rounded px-4 py-2 text-sm text-zinc-700 hover:bg-white">
          Já anotei, fechar
        </button>
      </div>
    </section>
  );
}
