'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { podeVer, sair, senhaPendente } from '@/lib/auth';
import { supabaseAuth } from '@/lib/supabaseClient';
import { ErroApi } from '@/services/api';
import { authService } from '@/services/auth';
import type { UsuarioLogado } from '@/types';
import { Menu } from './Menu';

const ContextoUsuario = createContext<UsuarioLogado | null>(null);

/** Usuário logado, para as telas da área logada. */
export function useUsuario(): UsuarioLogado {
  const usuario = useContext(ContextoUsuario);
  if (!usuario) throw new Error('useUsuario só funciona dentro da AreaLogada');
  return usuario;
}

/**
 * Carrega o usuário pelo GET /auth/me (UC02 passos 3–5), mostra o menu do tipo dele e
 * manda para o painel quem abrir uma tela de outro tipo. EX02/EX03 levam ao login (api.ts).
 */
export function AreaLogada({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const rota = usePathname();
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);

  useEffect(() => {
    // Veio de um link de convite/redefinição e ainda não salvou a senha
    if (senhaPendente()) {
      router.replace('/login');
      return;
    }
    let ativo = true;
    authService
      .me()
      .then((u) => ativo && setUsuario(u))
      .catch(async (erro) => {
        const motivo = erro instanceof ErroApi && (erro.codigo === 'EX02' || erro.codigo === 'EX03') ? erro.codigo : 'EX03';
        await sair();
        router.replace(`/login?motivo=${motivo}`);
      });

    // Saiu em outra aba ou a sessão foi encerrada
    const { data } = supabaseAuth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') router.replace('/login');
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [router]);

  const permitido = usuario ? podeVer(rota, usuario.tipo) : false;

  useEffect(() => {
    if (usuario && !permitido) router.replace('/painel');
  }, [usuario, permitido, router]);

  async function aoSair() {
    await sair();
    router.replace('/login');
  }

  if (!usuario || !permitido) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Carregando…</div>;
  }

  return (
    <ContextoUsuario.Provider value={usuario}>
      <Menu usuario={usuario} aoSair={aoSair} />
      <div className="flex flex-1 flex-col">{children}</div>
    </ContextoUsuario.Provider>
  );
}
