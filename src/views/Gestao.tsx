import React, { useEffect, useRef, useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { Usuario, Setor, SETORES, CORES_SETOR, Perfil, Chat, uid } from "../data";
import { Avatar, TagSetor, Secao, Botao } from "../ui";
import {
  buscarBotPerfil, salvarBotPerfil, salvarBotPerfilFoto, BotPerfilWA,
} from "../live";

interface Props {
  usuarios: Usuario[];
  setUsuarios: (u: Usuario[]) => void;
  chats: Chat[];
  modoAuth: boolean;
  sb?: SupabaseClient | null;
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
  { recurso: "Perfil comercial do WhatsApp (bot)", a: true, s: false, at: false },
];

const VERTICAIS = [
  { v: "", rotulo: "— selecionar —" },
  { v: "OTHER", rotulo: "Outro" },
  { v: "PROF_SERVICES", rotulo: "Serviços profissionais" },
  { v: "FINANCE", rotulo: "Finanças" },
  { v: "EDU", rotulo: "Educação" },
  { v: "HEALTH", rotulo: "Saúde" },
  { v: "RETAIL", rotulo: "Varejo" },
  { v: "APPAREL", rotulo: "Moda e vestuário" },
  { v: "AUTO", rotulo: "Automotivo" },
  { v: "BEAUTY", rotulo: "Beleza e spa" },
  { v: "ENTERTAIN", rotulo: "Entretenimento" },
  { v: "EVENT_PLAN", rotulo: "Eventos" },
  { v: "GOVT", rotulo: "Governo" },
  { v: "GROCERY", rotulo: "Alimentação / mercado" },
  { v: "HOTEL", rotulo: "Hotelaria" },
  { v: "NONPROFIT", rotulo: "ONG / sem fins lucrativos" },
  { v: "RESTAURANT", rotulo: "Restaurante" },
  { v: "TRAVEL", rotulo: "Viagens" },
];

const inputCls = "w-full px-3 py-2 rounded-lg border text-sm focus:outline-none";
const inputSt = { borderColor: "var(--az-line)" } as React.CSSProperties;

function PerfilWhatsAppBot({ sb }: { sb: SupabaseClient }) {
  const [dados, setDados] = useState<BotPerfilWA | null>(null);
  const [about, setAbout] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [websites, setWebsites] = useState("");
  const [vertical, setVertical] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const aplicar = (j: BotPerfilWA) => {
    setDados(j);
    setAbout(j.perfil.about || "");
    setDescription(j.perfil.description || "");
    setEmail(j.perfil.email || "");
    setAddress(j.perfil.address || "");
    setWebsites((j.perfil.websites || []).join("\n"));
    setVertical(j.perfil.vertical || "");
  };

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      aplicar(await buscarBotPerfil(sb));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar o perfil do WhatsApp.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, [sb]);

  const salvar = async () => {
    setSalvando(true);
    setMsg(null);
    setErro(null);
    try {
      const sites = websites.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      await salvarBotPerfil(sb, {
        about, description, email, address, vertical, websites: sites,
      });
      setMsg("Perfil do WhatsApp atualizado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const onFoto = async (file: File | null) => {
    if (!file) return;
    setEnviandoFoto(true);
    setMsg(null);
    setErro(null);
    try {
      await salvarBotPerfilFoto(sb, file);
      setMsg("Foto do bot enviada. Pode levar alguns minutos para aparecer no WhatsApp.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload da foto.");
    } finally {
      setEnviandoFoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Secao titulo="Perfil do WhatsApp · Contato do bot">
      <p className="text-xs mb-4" style={{ color: "var(--az-mut)" }}>
        Dados públicos do número +55 11 5304-9387 (PHONE_NUMBER_ID). Visível quando o cliente abre o perfil do bot no WhatsApp.
      </p>

      {carregando && (
        <div className="text-xs py-4" style={{ color: "var(--az-mut)" }}>Carregando perfil na Meta…</div>
      )}
      {erro && (
        <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: "#FDECEA", color: "var(--az-clay)" }}>{erro}</div>
      )}
      {msg && (
        <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: "var(--az-leaf-soft)", color: "var(--az-forest)" }}>{msg}</div>
      )}

      {!carregando && dados && (
        <>
          <div className="flex flex-wrap items-start gap-4 mb-5">
            <div className="shrink-0">
              {dados.perfil.profile_picture_url ? (
                <img
                  src={dados.perfil.profile_picture_url}
                  alt="Foto do bot"
                  className="rounded-full object-cover"
                  style={{ width: 72, height: 72, border: "2px solid var(--az-line)" }}
                />
              ) : (
                <div
                  className="rounded-full flex items-center justify-center f-disp font-semibold text-white"
                  style={{ width: 72, height: 72, background: "var(--az-forest)", fontSize: 22 }}
                >
                  WA
                </div>
              )}
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="text-xs font-medium mb-1" style={{ color: "var(--az-mut)" }}>Foto do perfil</div>
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="hidden"
                  onChange={e => onFoto(e.target.files?.[0] ?? null)}
                />
                <Botao tam="sm" disabled={enviandoFoto} onClick={() => fileRef.current?.click()}>
                  {enviandoFoto ? "Enviando…" : "Trocar foto"}
                </Botao>
                <span className="f-mono text-[10px]" style={{ color: "var(--az-mut)" }}>JPEG ou PNG · até 5 MB</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>
                Nome de exibição (WhatsApp)
              </label>
              <input
                value={dados.verified_name || "—"}
                disabled
                className={`${inputCls} opacity-60`}
                style={inputSt}
              />
              <div className="f-mono text-[10px] mt-1" style={{ color: "var(--az-mut)" }}>
                {dados.telefone || ""}{dados.name_status ? ` · status: ${dados.name_status}` : ""}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>
                Categoria (vertical)
              </label>
              <select value={vertical} onChange={e => setVertical(e.target.value)} className={inputCls} style={inputSt}>
                {VERTICAIS.map(o => <option key={o.v || "vazio"} value={o.v}>{o.rotulo}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-3 p-2.5 rounded-lg text-[11px] leading-relaxed" style={{ background: "var(--az-paper)", color: "var(--az-mut)" }}>
            {dados.aviso_nome}
            {" "}Altere o nome de exibição no Meta Business Manager (WhatsApp → números → nome de exibição). Aprovação da Meta é obrigatória.
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>
                Nome / descrição da empresa
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={512}
                placeholder="Texto longo da empresa no perfil (até 512 caracteres)"
                className={inputCls}
                style={inputSt}
              />
              <div className="f-mono text-[10px] mt-1" style={{ color: "var(--az-mut)" }}>
                Campo <code>description</code> da Cloud API — o “nome da empresa” editável aqui. O nome na lista de chats é o verified_name acima.
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>
                Recado (about)
              </label>
              <input
                value={about}
                onChange={e => setAbout(e.target.value)}
                maxLength={139}
                placeholder="Texto curto sob o nome no perfil"
                className={inputCls}
                style={inputSt}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>E-mail</label>
              <input value={email} onChange={e => setEmail(e.target.value)} maxLength={128}
                className={inputCls} style={inputSt} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>Endereço</label>
              <input value={address} onChange={e => setAddress(e.target.value)} maxLength={256}
                className={inputCls} style={inputSt} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>
                Sites (até 2, um por linha)
              </label>
              <textarea
                value={websites}
                onChange={e => setWebsites(e.target.value)}
                rows={2}
                placeholder={"https://exemplo.com\nhttps://instagram.com/exemplo"}
                className={inputCls}
                style={inputSt}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar perfil"}</Botao>
            <Botao variante="fantasma" tam="sm" onClick={carregar} disabled={carregando || salvando}>Recarregar</Botao>
          </div>
        </>
      )}
    </Secao>
  );
}

export default function Gestao({ usuarios, setUsuarios, chats, modoAuth, sb, onRemover }: Props) {
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

      {modoAuth && sb && <PerfilWhatsAppBot sb={sb} />}

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
