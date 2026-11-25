'use client';

import { ROTULO_TIPO, TipoUsuario, type Usuario } from '@/types';

interface Props {
  usuarios: Usuario[];
  aoEditar: (usuario: Usuario) => void;
  aoAlterarTipo: (usuario: Usuario, tipo: TipoUsuario) => void;
  aoDesativar: (usuario: Usuario) => void;
  aoReativar: (usuario: Usuario) => void;
}

/** Lista de usuários com nome, e-mail, tipo e situação (UC01 passo 2) e as ações de cada um. */
export function UsuariosTabela({ usuarios, aoEditar, aoAlterarTipo, aoDesativar, aoReativar }: Props) {
  if (usuarios.length === 0) {
    return <p className="rounded border border-zinc-200 bg-white p-4 text-sm text-zinc-500">Nenhum usuário encontrado com estes filtros.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-2 font-medium">Nome</th>
            <th className="px-4 py-2 font-medium">E-mail</th>
            <th className="px-4 py-2 font-medium">Tipo</th>
            <th className="px-4 py-2 font-medium">Situação</th>
            <th className="px-4 py-2 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-4 py-2">{u.nome}</td>
              <td className="px-4 py-2 text-zinc-600">{u.email}</td>
              <td className="px-4 py-2">
                <select
                  aria-label={`Tipo de ${u.nome}`}
                  value={u.tipo}
                  onChange={(e) => aoAlterarTipo(u, e.target.value as TipoUsuario)}
                  className="rounded border border-zinc-300 px-2 py-1"
                >
                  {Object.values(TipoUsuario).map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ROTULO_TIPO[tipo]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-600'}`}
                >
                  {u.ativo ? 'Ativo' : 'Desativado'}
                </span>
              </td>
              <td className="flex gap-3 px-4 py-2">
                <button onClick={() => aoEditar(u)} className="text-zinc-700 underline hover:text-zinc-900">
                  Alterar
                </button>
                {u.ativo ? (
                  <button onClick={() => aoDesativar(u)} className="text-red-700 underline hover:text-red-900">
                    Desativar
                  </button>
                ) : (
                  <button onClick={() => aoReativar(u)} className="text-green-700 underline hover:text-green-900">
                    Reativar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
