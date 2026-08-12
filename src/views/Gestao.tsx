import React, { useState } from "react";
import { Usuario, Setor, SETORES, CORES_SETOR, Perfil, Chat, uid } from "../data";
import { Avatar, TagSetor, Secao, Botao } from "../ui";

interface Props {
  usuarios: Usuario[];
  setUsuarios: (u: Usuario[]) => void;
  chats: Chat[];
  modoAuth: boolean;
  onRemover?: (id: string) => Promise<void>;
}

const PERMISSOES: { recurso: string; a: boolean; s: boolean; at: boolean }[] = [
  { recurso: "Painel executivo completo", a: true, s: true, at: false },
  { recurso: "Conversas de todos os setores", a: true, s: true, at: false },
  { recurso: "Conversas do próprio setor", a: true, s: true, at: true },
  { recurso: "Editar fluxo do bot e regras", a: true, s: true, at: false },
  { recurso: "Cadastrar setores e usuários", a: true, s: false, at: false },
  { recurso: "Exportar relatórios (Excel/PDF)", a: true, s: true, at: false },
  { recurso: "Transferir e encerrar atendimentos", a: true, s: true, at: true },
  { recurso: "Logs e trilha de auditoria", a: true, s: false, at: false },
];

export default function Gestao({ usuarios, setUsuarios, chats, modoAuth, onRemover }: Props) {
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState<Perfil>("Atendente");
  const [setor, setSetor] = useState<Setor>("Atendimento");
  const [removendoId, setRemovendoId] = useState<string | null>(null);
  const [erroRemover, setErroRemover] = useState<string | null>(null);

  const adicionar = () => {
    if (!nome.trim()) return;
    setUsuarios([...usuarios, {
      id: uid(), nome: nome.trim(), perfil,
      setor: perfil === "Administrador" ? null : setor,
      online: true, atendimentosHoje: 0, tmaMin: 0, nota: 0,
    }]);
    setNome("");
  };

  const alternarOnline = (id: string) =>
    setUsuarios(usuarios.map(u => (u.id === id ? { ...u, online: !u.online } : u)));

  const removerUsuario = async (id: string, nomeMembro: string) => {
    if (!window.confirm(`Remover ${nomeMembro} da equipe? Esta ação não pode ser desfeita.`)) return;
    setErroRemover(null);
    setRemovendoId(id);
    try {
      if (onRemover) {
        await onRemover(id);
      } else {
        setUsuarios(usuarios.filter(u => u.id !== id));
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message :
        (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string")
          ? (e as { message: string }).message
          : "Não foi possível remover o membro.";
      setErroRemover(msg === "[object Object]" ? "Não foi possível remover o membro." : msg);
    } finally {
      setRemovendoId(null);
    }
  };

  return (
    <div className="p-5 space-y-4 az-in max-w-6xl">
      <h2 className="f-disp text-lg font-semibold">Setores, equipe e permissões</h2>

      {/* Setores */}
      <div className="grid md:grid-cols-4 gap-3">
        {SETORES.map(s => {
          const membros = usuarios.filter(u => u.setor === s);
          const ativos = chats.filter(c => c.setor === s && c.status !== "encerrado" && c.status !== "abandonado").length;
          return (
            <div key={s} className="az-card p-3" style={{ borderTop: `3px solid ${CORES_SETOR[s]}` }}>
              <div className="text-sm font-semibold mb-1">{s}</div>
              <div className="f-mono text-[11px] mb-2" style={{ color: "var(--az-mut)" }}>
                {membros.length} membro{membros.length !== 1 && "s"} · {ativos} conversa{ativos !== 1 && "s"} ativa{ativos !== 1 && "s"}
              </div>
              <div className="flex -space-x-1.5">
                {membros.map(m => <Avatar key={m.id} nome={m.nome} tam={24} />)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Equipe */}
        <Secao titulo="Equipe cadastrada">
          {modoAuth && (
            <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: "var(--az-leaf-soft)", color: "var(--az-forest)" }}>
              Com o Supabase ativo, novos usuários entram pela tela de cadastro (e-mail + confirmação).
              Aqui um administrador ajusta perfil de acesso e setor de cada membro.
            </div>
          )}
          {erroRemover && (
            <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: "#FDECEA", color: "var(--az-clay)" }}>
              {erroRemover}
            </div>
          )}
          {!modoAuth && <div className="flex gap-2 mb-3 flex-wrap">
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo"
              className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border text-sm focus:outline-none"
              style={{ borderColor: "var(--az-line)" }} />
            <select value={perfil} onChange={e => setPerfil(e.target.value as Perfil)}
              className="text-sm border rounded-lg px-2 focus:outline-none" style={{ borderColor: "var(--az-line)" }}>
              <option>Atendente</option><option>Supervisor</option><option>Administrador</option>
            </select>
            {perfil !== "Administrador" && (
              <select value={setor} onChange={e => setSetor(e.target.value as Setor)}
                className="text-sm border rounded-lg px-2 focus:outline-none" style={{ borderColor: "var(--az-line)" }}>
                {SETORES.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
            <Botao onClick={adicionar}>+ Cadastrar</Botao>
          </div>}
          <div className="divide-y" style={{ borderColor: "var(--az-line)" }}>
            {usuarios.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <Avatar nome={u.nome} tam={30} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.nome}</div>
                  <div className="text-[11px]" style={{ color: "var(--az-mut)" }}>{u.perfil}</div>
                </div>
                {u.setor && <TagSetor setor={u.setor} mini />}
                <button onClick={() => alternarOnline(u.id)}
                  className="f-mono text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: u.online ? "var(--az-leaf-soft)" : "#EFEEE7",
                    color: u.online ? "var(--az-forest)" : "var(--az-mut)",
                  }}>
                  {u.online ? "● online" : "○ offline"}
                </button>
                {u.perfil !== "Administrador" && (
                  <button
                    type="button"
                    disabled={removendoId === u.id}
                    onClick={() => removerUsuario(u.id, u.nome)}
                    className="text-xs disabled:opacity-50"
                    style={{ color: "var(--az-clay)" }}
                  >
                    {removendoId === u.id ? "removendo…" : "remover"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Secao>

        {/* Matriz de permissões */}
        <Secao titulo="Matriz de permissões por perfil">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left" style={{ color: "var(--az-mut)" }}>
                <th className="pb-2 font-medium">Recurso</th>
                <th className="pb-2 font-medium text-center">Admin</th>
                <th className="pb-2 font-medium text-center">Superv.</th>
                <th className="pb-2 font-medium text-center">Atend.</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--az-line)" }}>
              {PERMISSOES.map(p => (
                <tr key={p.recurso}>
                  <td className="py-1.5 pr-2">{p.recurso}</td>
                  {[p.a, p.s, p.at].map((v, i) => (
                    <td key={i} className="text-center f-mono"
                      style={{ color: v ? "var(--az-leaf)" : "var(--az-line)" }}>
                      {v ? "✓" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="f-mono text-[10px] mt-3" style={{ color: "var(--az-mut)" }}>
            todas as ações geram registro na trilha de auditoria (lgpd)
          </div>
        </Secao>
      </div>
    </div>
  );
}
