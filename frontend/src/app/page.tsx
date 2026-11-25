import { redirect } from 'next/navigation';

// A raiz leva ao painel; o proxy.ts manda para /login quem não estiver logado.
export default function Inicio() {
  redirect('/painel');
}
