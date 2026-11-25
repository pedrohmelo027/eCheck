import { AreaLogada } from '@/components/ui/AreaLogada';

/** Telas que exigem login. O proxy.ts já barrou quem não tem sessão. */
export default function LayoutAreaLogada({ children }: { children: React.ReactNode }) {
  return <AreaLogada>{children}</AreaLogada>;
}
