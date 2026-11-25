import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const TELAS_PUBLICAS = ['/login'];

/**
 * Bloqueia as telas sem login (CONTEXT.md seção 5: "bloqueia telas sem login ou sem permissão").
 * Também renova o cookie da sessão quando o token vence.
 * O tipo do usuário é conferido na área logada pelo GET /auth/me, e a API confere de novo
 * em toda requisição (RN24). Este é só o primeiro filtro.
 */
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        Object.entries(headers).forEach(([chave, valor]) => resposta.headers.set(chave, valor));
      },
    },
  });

  // getClaims valida o JWT (assinatura e validade), diferente de só ler o cookie.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!logado && !TELAS_PUBLICAS.includes(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    if (pathname !== '/') login.searchParams.set('voltar', pathname);
    return NextResponse.redirect(login);
  }

  return resposta;
}

export const config = {
  // Tudo, menos arquivos estáticos e imagens
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
