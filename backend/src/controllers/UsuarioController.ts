import { Request, Response } from 'express';
import { Administrador } from '../models/Administrador';
import { idDaRota } from '../validators/comum';
import {
  esquemaAlterarTipo,
  esquemaAlterarUsuario,
  esquemaCadastrarUsuario,
  esquemaFiltroUsuarios,
} from '../validators/usuario';

const administrador = (req: Request) => Administrador.carregar(req.usuario!.id);

export const UsuarioController = {
  async listar(req: Request, res: Response) {
    const filtro = esquemaFiltroUsuarios.parse(req.query);
    const usuarios = await (await administrador(req)).listarUsuarios(filtro);
    res.json(usuarios);
  },

  /** A senha provisória (forma "senha") só aparece nesta resposta; não é guardada em lugar nenhum. */
  async cadastrar(req: Request, res: Response) {
    const { nome, email, tipo, forma } = esquemaCadastrarUsuario.parse(req.body);
    const { usuario, senhaProvisoria } = await (await administrador(req)).cadastrarUsuario(nome, email, tipo, forma);
    res.status(201).json({ ...usuario.toJSON(), senhaProvisoria });
  },

  /** PATCH /usuarios/:id/senha-provisoria — gera outra senha provisória (mostrada uma única vez). */
  async gerarSenhaProvisoria(req: Request, res: Response) {
    const { usuario, senhaProvisoria } = await (await administrador(req)).gerarNovaSenhaProvisoria(idDaRota(req.params.id));
    res.json({ ...usuario.toJSON(), senhaProvisoria });
  },

  async alterar(req: Request, res: Response) {
    const id = idDaRota(req.params.id);
    const { nome, email } = esquemaAlterarUsuario.parse(req.body);
    res.json(await (await administrador(req)).alterarUsuario(id, nome, email));
  },

  async alterarTipo(req: Request, res: Response) {
    const id = idDaRota(req.params.id);
    const { tipo } = esquemaAlterarTipo.parse(req.body);
    res.json(await (await administrador(req)).alterarTipo(id, tipo));
  },

  async desativar(req: Request, res: Response) {
    res.json(await (await administrador(req)).desativarUsuario(idDaRota(req.params.id)));
  },

  async reativar(req: Request, res: Response) {
    res.json(await (await administrador(req)).reativarUsuario(idDaRota(req.params.id)));
  },
};
