import { supabase } from '../config/supabase';
import { AppError } from '../errors/AppError';
import { TipoUsuario } from '../models/enums';

/** Linha da tabela `usuarios`. */
export interface UsuarioLinha {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  criado_em: string;
}

export const UsuarioRepository = {
  async buscarPorId(id: string): Promise<UsuarioLinha | null> {
    const { data, error } = await supabase().from('usuarios').select('*').eq('id', id).maybeSingle();
    if (error) throw new AppError('EX22', {}, [error.message]);
    return data as UsuarioLinha | null;
  },
};
