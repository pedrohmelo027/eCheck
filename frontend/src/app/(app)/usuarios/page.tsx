'use client';

import { useCallback, useEffect, useState } from 'react';
import { UsuarioForm, type DadosUsuarioForm } from '@/components/formularios/UsuarioForm';
import { UsuariosTabela } from '@/components/tabelas/UsuariosTabela';
import { Alerta } from '@/components/ui/Alerta';
import { ErroApi } from '@/services/api';
import { usuariosService, type FiltroUsuarios } from '@/services/usuarios';
import { ROTULO_TIPO, TipoUsuario, type Usuario } from '@/types';

type Formulario = { modo: 'novo' } | { modo: 'editar'; usuario: Usuario } | null;

function mensagemDe(erro: unknown) {
  return erro instanceof ErroApi ? erro.message : 'Algo deu errado. Tente novamente.';
}

/** UC01 — Manter usuários (Administrador). As regras ficam na API; aqui só mostramos e enviamos. */
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtro, setFiltro] = useState<FiltroUsuarios>({ nome: '', tipo: '' });
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const carregar = useCallback(async (f: FiltroUsuarios) => {
    setCarregando(true);
    try {
      setUsuarios(await usuariosService.listar(f));
      setErro(null);
    } catch (e) {
      setErro(mensagemDe(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  // FA5: filtra ao digitar (com uma pequena espera) ou ao trocar o tipo
  useEffect(() => {
    const espera = setTimeout(() => carregar(filtro), 300);
    return () => clearTimeout(espera);
  }, [filtro, carregar]);

  /** Executa uma ação, mostra o resultado e recarrega a lista. Repassa o erro para o formulário manter os dados. */
  async function executar(acao: () => Promise<unknown>, mensagemSucesso: string, relancar = false) {
    setErro(null);
    setSucesso(null);
    try {
      await acao();
      setSucesso(mensagemSucesso);
      await carregar(filtro);
    } catch (e) {
      setErro(mensagemDe(e));
      if (relancar) throw e;
    }
  }

  async function salvarFormulario(dados: DadosUsuarioForm) {
    if (formulario?.modo === 'novo') {
      await executar(() => usuariosService.cadastrar(dados), `Convite enviado para ${dados.email}.`, true);
    } else if (formulario?.modo === 'editar') {
      const { usuario } = formulario;
      await executar(() => usuariosService.alterar(usuario.id, { nome: dados.nome, email: dados.email }), 'Dados alterados.', true);
    }
    setFormulario(null);
  }

  function alterarTipo(usuario: Usuario, tipo: TipoUsuario) {
    if (!confirm(`Alterar o tipo de ${usuario.nome} para ${ROTULO_TIPO[tipo]}?`)) return;
    executar(() => usuariosService.alterarTipo(usuario.id, tipo), `${usuario.nome} agora é ${ROTULO_TIPO[tipo]}.`);
  }

  function desativar(usuario: Usuario) {
    if (!confirm(`Desativar ${usuario.nome}? O acesso será bloqueado e o histórico mantido.`)) return;
    executar(() => usuariosService.desativar(usuario.id), `${usuario.nome} foi desativado.`);
  }

  function reativar(usuario: Usuario) {
    if (!confirm(`Reativar ${usuario.nome}?`)) return;
    executar(() => usuariosService.reativar(usuario.id), `${usuario.nome} foi reativado.`);
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuários</h1>
        {!formulario && (
          <button
            onClick={() => {
              setErro(null);
              setSucesso(null);
              setFormulario({ modo: 'novo' });
            }}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Novo usuário
          </button>
        )}
      </div>

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {sucesso && <Alerta tipo="sucesso">{sucesso}</Alerta>}

      {formulario && (
        <div className="max-w-md">
          <UsuarioForm
            key={formulario.modo === 'editar' ? formulario.usuario.id : 'novo'}
            titulo={formulario.modo === 'novo' ? 'Novo usuário' : `Alterar ${formulario.usuario.nome}`}
            inicial={formulario.modo === 'editar' ? formulario.usuario : undefined}
            comTipo={formulario.modo === 'novo'}
            textoBotao={formulario.modo === 'novo' ? 'Cadastrar e enviar convite' : 'Salvar'}
            aoEnviar={salvarFormulario}
            aoCancelar={() => setFormulario(null)}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          placeholder="Filtrar por nome"
          value={filtro.nome}
          onChange={(e) => setFiltro({ ...filtro, nome: e.target.value })}
          className="w-64 rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <select
          aria-label="Filtrar por tipo"
          value={filtro.tipo}
          onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value as TipoUsuario | '' })}
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Todos os tipos</option>
          {Object.values(TipoUsuario).map((tipo) => (
            <option key={tipo} value={tipo}>
              {ROTULO_TIPO[tipo]}
            </option>
          ))}
        </select>
      </div>

      {carregando && usuarios.length === 0 ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : (
        <UsuariosTabela
          usuarios={usuarios}
          aoEditar={(usuario) => {
            setErro(null);
            setSucesso(null);
            setFormulario({ modo: 'editar', usuario });
          }}
          aoAlterarTipo={alterarTipo}
          aoDesativar={desativar}
          aoReativar={reativar}
        />
      )}
    </main>
  );
}
