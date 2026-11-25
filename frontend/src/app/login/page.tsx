'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alerta } from '@/components/ui/Alerta';
import { destinoSeguro, marcarSenhaPendente, MENSAGENS_LOGIN, sair, senhaPendente } from '@/lib/auth';
import { supabaseAuth } from '@/lib/supabaseClient';
import { ErroApi } from '@/services/api';
import { authService } from '@/services/auth';

/**
 * - entrar: e-mail e senha (fluxo principal)
 * - esqueci: pede o link de redefinição (FA2)
 * - definir: define a senha depois do link de convite (FA1) ou de redefinição (FA2)
 */
type Modo = 'verificando' | 'entrar' | 'esqueci' | 'definir';

const LINK_INVALIDO = 'O link expirou ou já foi usado. Peça um novo convite ao administrador ou use "Esqueci a senha".';

const campo = 'w-full rounded border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none';
const botao = 'w-full rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50';

/** Tira tokens e códigos da barra de endereço depois de usá-los. */
function limparUrl() {
  window.history.replaceState(null, '', '/login');
}

function mensagemSenha(codigo: string | undefined, mensagem: string) {
  if (codigo === 'weak_password') return 'A senha é fraca demais. Use pelo menos 6 caracteres.';
  if (codigo === 'same_password') return 'A nova senha precisa ser diferente da anterior.';
  return mensagem || MENSAGENS_LOGIN.EX22;
}

/** UC02 — Fazer login. */
export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('verificando');
  const [tituloSenha, setTituloSenha] = useState('Defina sua senha');
  const [destino, setDestino] = useState('/painel');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  /** Passos 3–5: confere na API se o usuário está ativo e abre o painel (ou a tela pedida). */
  const entrarNoSistema = useCallback(
    async (para: string) => {
      try {
        await authService.me();
        router.replace(para);
      } catch (e) {
        await sair();
        setErro(e instanceof ErroApi ? e.message : MENSAGENS_LOGIN.EX22);
        setModo('entrar');
      }
    },
    [router],
  );

  // Ao abrir: trata link de convite/redefinição, motivo de redirecionamento ou sessão já aberta.
  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const motivo = url.searchParams.get('motivo');
      const para = destinoSeguro(url.searchParams.get('voltar'));
      setDestino(para);

      // Link vencido ou já usado
      if (hash.get('error') || hash.get('error_code') || url.searchParams.get('error_code')) {
        limparUrl();
        setErro(LINK_INVALIDO);
        return setModo('entrar');
      }

      // FA1 — convite (o Supabase devolve o token no #hash)
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabaseAuth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        limparUrl();
        if (error) {
          setErro(LINK_INVALIDO);
          return setModo('entrar');
        }
        setTituloSenha(hash.get('type') === 'invite' ? 'Primeiro acesso: defina sua senha' : 'Defina sua nova senha');
        marcarSenhaPendente(true);
        return setModo('definir');
      }

      // FA2 — link de redefinição (PKCE: ?code=)
      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await supabaseAuth.exchangeCodeForSession(code);
        limparUrl();
        if (error) {
          setErro(LINK_INVALIDO);
          return setModo('entrar');
        }
        setTituloSenha('Defina sua nova senha');
        marcarSenhaPendente(true);
        return setModo('definir');
      }

      if (motivo && motivo in MENSAGENS_LOGIN) {
        setErro(MENSAGENS_LOGIN[motivo as keyof typeof MENSAGENS_LOGIN]);
        return setModo('entrar');
      }

      // Já logado: segue direto, a não ser que a senha do convite/redefinição ainda falte
      const { data } = await supabaseAuth.getSession();
      if (data.session && senhaPendente()) return setModo('definir');
      if (data.session) return entrarNoSistema(para);
      marcarSenhaPendente(false);
      setModo('entrar');
    })();
  }, [entrarNoSistema]);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setAviso(null);
    setEnviando(true);
    try {
      const { error } = await supabaseAuth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) {
        // FE1: não diz qual campo está errado
        setErro(error.status && error.status < 500 ? MENSAGENS_LOGIN.EX01 : MENSAGENS_LOGIN.EX22);
        return;
      }
      await entrarNoSistema(destino);
    } finally {
      setEnviando(false);
    }
  }

  async function pedirLink(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const { error } = await supabaseAuth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error && error.status === 429) {
        setErro('Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.');
        return;
      }
      // Não revela se o e-mail existe
      setAviso('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
      setModo('entrar');
    } finally {
      setEnviando(false);
    }
  }

  async function definirSenha(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    if (senha !== confirmacao) {
      setErro('As senhas não conferem.');
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabaseAuth.updateUser({ password: senha });
      if (error) {
        setErro(mensagemSenha(error.code, error.message));
        return;
      }
      marcarSenhaPendente(false);
      await entrarNoSistema(destino);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded border border-zinc-200 bg-white p-6">
        <div>
          <h1 className="text-xl font-semibold">eCheck</h1>
          <p className="text-sm text-zinc-500">Conferência de recebimento de materiais</p>
        </div>

        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        {aviso && <Alerta tipo="sucesso">{aviso}</Alerta>}

        {modo === 'verificando' && <p className="text-sm text-zinc-500">Carregando…</p>}

        {modo === 'entrar' && (
          <form onSubmit={entrar} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              E-mail
              <input className={campo} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Senha
              <input
                className={campo}
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={enviando} className={botao}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setErro(null);
                setAviso(null);
                setModo('esqueci');
              }}
              className="text-sm text-zinc-700 underline hover:text-zinc-900"
            >
              Esqueci a senha
            </button>
          </form>
        )}

        {modo === 'esqueci' && (
          <form onSubmit={pedirLink} className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600">Informe seu e-mail para receber o link de redefinição.</p>
            <label className="flex flex-col gap-1 text-sm">
              E-mail
              <input className={campo} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <button type="submit" disabled={enviando} className={botao}>
              {enviando ? 'Enviando…' : 'Enviar link'}
            </button>
            <button type="button" onClick={() => setModo('entrar')} className="text-sm text-zinc-700 underline hover:text-zinc-900">
              Voltar
            </button>
          </form>
        )}

        {modo === 'definir' && (
          <form onSubmit={definirSenha} className="flex flex-col gap-3">
            <p className="font-medium">{tituloSenha}</p>
            <label className="flex flex-col gap-1 text-sm">
              Nova senha
              <input
                className={campo}
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Repita a senha
              <input
                className={campo}
                type="password"
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={enviando} className={botao}>
              {enviando ? 'Salvando…' : 'Salvar senha e entrar'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
