import React, { useState, useRef, useEffect } from "react";
import { Chat, Usuario, Setor, SETORES, ETIQUETAS_DISPONIVEIS, StatusChat } from "../data";
import { TagSetor, TagStatus, TagEmpresa, Avatar, Botao } from "../ui";

export interface AcoesChat {
  enviar: (c: Chat, texto: string) => void;
  anexar: (c: Chat) => void;
  assumir: (c: Chat) => void;
  encerrar: (c: Chat) => void;
  transferir: (c: Chat, destino: Setor) => void;
  toggleEtiqueta: (c: Chat, etiqueta: string) => void;
  addNota: (c: Chat, nota: string) => void;
  marcarLido: (c: Chat) => void;
}

interface Props {
  chats: Chat[];
  usuario: Usuario;
  acoes: AcoesChat;
}

const FILTROS: { rotulo: string; v: StatusChat | "todos" }[] = [
  { rotulo: "Todos", v: "todos" },
  { rotulo: "Bot", v: "bot" },
  { rotulo: "Fila", v: "fila" },
  { rotulo: "Andamento", v: "andamento" },
  { rotulo: "Encerrados", v: "encerrado" },
  { rotulo: "Abandonados", v: "abandonado" },
];

export default function Conversas({ chats, usuario, acoes }: Props) {
  const [selId, setSelId] = useState<string | null>(chats[0]?.id ?? null);
  const [filtro, setFiltro] = useState<StatusChat | "todos">("todos");
  const [busca, setBusca] = useState("");
  const [texto, setTexto] = useState("");
  const [novaNota, setNovaNota] = useState("");
  const [menuTransf, setMenuTransf] = useState(false);
  const [menuEtq, setMenuEtq] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  const ehAtendente = usuario.perfil === "Atendente";
  const visiveis = chats
    .filter(c => !ehAtendente || c.setor === usuario.setor || c.setor === null)
    .filter(c => filtro === "todos" || c.status === filtro)
    .filter(c => busca === "" || c.cliente.toLowerCase().includes(busca.toLowerCase())
      || c.msgs.some(m => m.texto.toLowerCase().includes(busca.toLowerCase())));

  const sel = chats.find(c => c.id === selId) ?? null;

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [sel?.msgs.length]);

  useEffect(() => {
    if (chats.length > 0 && !chats.some(c => c.id === selId)) setSelId(chats[0].id);
  }, [chats, selId]);

  const BadgeVivo = ({ c }: { c: Chat }) => c.aoVivo ? (
    <span className="f-mono text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
      style={{ background: "var(--az-leaf-soft)", color: "var(--az-forest)" }}>
      ● ao vivo
    </span>
  ) : null;

  const enviar = () => {
    if (!texto.trim() || !sel) return;
    acoes.enviar(sel, texto.trim());
    setTexto("");
  };





  const addNota = () => {
    if (!novaNota.trim() || !sel) return;
    acoes.addNota(sel, novaNota.trim());
    setNovaNota("");
  };


  return (
    <div className="flex h-full az-in">
      {/* Lista */}
      <div className="w-[300px] shrink-0 border-r flex flex-col" style={{ borderColor: "var(--az-line)", background: "white" }}>
        <div className="p-3 border-b" style={{ borderColor: "var(--az-line)" }}>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente ou mensagem…"
            className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none"
            style={{ borderColor: "var(--az-line)", background: "var(--az-paper)" }} />
          <div className="flex gap-1 mt-2 flex-wrap">
            {FILTROS.map(f => (
              <button key={f.v} onClick={() => setFiltro(f.v)}
                className="px-2 py-1 rounded-md text-[11px] font-medium"
                style={{
                  background: filtro === f.v ? "var(--az-forest)" : "var(--az-paper)",
                  color: filtro === f.v ? "white" : "var(--az-mut)",
                }}>{f.rotulo}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto az-scroll">
          {visiveis.length === 0 && (
            <div className="p-6 text-center text-xs" style={{ color: "var(--az-mut)" }}>
              Nenhuma conversa neste filtro. Use ▶ Simular novo lead no topo da tela.
            </div>
          )}
          {visiveis.map(c => (
            <button key={c.id} onClick={() => { setSelId(c.id); acoes.marcarLido(c); }}
              className="w-full text-left px-3 py-2.5 border-b flex gap-2.5 transition-colors"
              style={{
                borderColor: "var(--az-line)",
                background: selId === c.id ? "var(--az-leaf-soft)" : "transparent",
              }}>
              <Avatar nome={c.cliente} tam={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{c.cliente}</span>
                  <span className="f-mono text-[10px]" style={{ color: "var(--az-mut)" }}>{c.inicio}</span>
                </div>
                <div className="text-xs truncate mt-0.5" style={{ color: "var(--az-mut)" }}>
                  {c.msgs[c.msgs.length - 1]?.texto}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <TagStatus status={c.status} />
                  {c.empresa && <TagEmpresa empresa={c.empresa} mini />}
                  {c.setor && <TagSetor setor={c.setor} mini />}
                  <BadgeVivo c={c} />
                  {c.naoLidas > 0 && (
                    <span className="ml-auto f-mono text-[10px] font-bold text-white rounded-full px-1.5"
                      style={{ background: "var(--az-leaf)" }}>{c.naoLidas}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      {sel ? (
        <div className="flex-1 flex flex-col min-w-0" style={{ background: "var(--az-paper)" }}>
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "var(--az-line)", background: "white" }}>
            <Avatar nome={sel.cliente} tam={38} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold flex items-center gap-2">{sel.cliente} <BadgeVivo c={sel} /></div>
              <div className="f-mono text-[11px] flex items-center gap-1.5 flex-wrap" style={{ color: "var(--az-mut)" }}>
                <span>{sel.telefone}</span>
                <span>·</span>
                <span>{sel.origem}</span>
                {sel.empresa && (
                  <>
                    <span>·</span>
                    <TagEmpresa empresa={sel.empresa} mini />
                  </>
                )}
              </div>
            </div>
            <TagStatus status={sel.status} />
            {sel.status === "fila" && <Botao tam="sm" onClick={() => acoes.assumir(sel)}>Assumir atendimento</Botao>}
            {sel.status === "andamento" && (
              <>
                <div className="relative">
                  <Botao tam="sm" variante="fantasma" onClick={() => setMenuTransf(v => !v)}>⇄ Transferir</Botao>
                  {menuTransf && (
                    <div className="absolute right-0 top-9 z-20 az-card p-1 w-48 shadow-lg">
                      {SETORES.filter(s => s !== sel.setor).map(s => (
                        <button key={s} onClick={() => { acoes.transferir(sel, s); setMenuTransf(false); }}
                          className="w-full text-left px-2.5 py-1.5 rounded-md text-xs hover:bg-[var(--az-paper)]">{s}</button>
                      ))}
                    </div>
                  )}
                </div>
                <Botao tam="sm" variante="perigo" onClick={() => acoes.encerrar(sel)}>Encerrar</Botao>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto az-scroll p-4 space-y-2">
            {sel.msgs.map(m => m.de === "sistema" ? (
              <div key={m.id} className="text-center">
                <span className="f-mono text-[10px] px-2.5 py-1 rounded-full" style={{ background: "#EFEEE7", color: "var(--az-mut)" }}>
                  {m.texto} · {m.hora}
                </span>
              </div>
            ) : (
              <div key={m.id} className={`flex ${m.de === "cliente" ? "justify-start" : "justify-end"}`}>
                <div className="max-w-[70%] px-3 py-2 rounded-2xl text-sm az-in"
                  style={m.de === "cliente"
                    ? { background: "white", border: "1px solid var(--az-line)", borderBottomLeftRadius: 6 }
                    : m.de === "bot"
                      ? { background: "var(--az-forest)", color: "white", borderBottomRightRadius: 6 }
                      : { background: "var(--az-leaf)", color: "white", borderBottomRightRadius: 6 }}>
                  {m.de === "bot" && <div className="f-mono text-[9px] uppercase tracking-wider opacity-60 mb-0.5">bot · triagem</div>}
                  <div className="whitespace-pre-line">{m.texto}</div>
                  <div className="f-mono text-[9px] mt-1 opacity-60 text-right">{m.hora}</div>
                </div>
              </div>
            ))}
            <div ref={fimRef} />
          </div>

          {sel.status === "andamento" ? (
            <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--az-line)", background: "white" }}>
              <button onClick={() => acoes.anexar(sel)} title="Anexar arquivo"
                className="px-3 rounded-lg border text-sm" style={{ borderColor: "var(--az-line)" }}>📎</button>
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === "Enter" && enviar()}
                placeholder="Escreva sua resposta…"
                className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none"
                style={{ borderColor: "var(--az-line)" }} />
              <Botao onClick={enviar}>Enviar ➤</Botao>
            </div>
          ) : (
            <div className="p-3 border-t text-center f-mono text-[11px]"
              style={{ borderColor: "var(--az-line)", background: "white", color: "var(--az-mut)" }}>
              {sel.status === "fila" ? "assuma o atendimento para responder" :
               sel.status === "bot" ? "o bot está conduzindo a triagem…" :
               "conversa somente leitura — atendimento finalizado"}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--az-mut)" }}>
          Selecione uma conversa à esquerda.
        </div>
      )}

      {/* Painel lateral */}
      {sel && (
        <div className="w-[260px] shrink-0 border-l overflow-y-auto az-scroll p-3 space-y-4 hidden xl:block"
          style={{ borderColor: "var(--az-line)", background: "white" }}>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--az-mut)" }}>Dados do lead</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-2 items-center">
                <span style={{ color: "var(--az-mut)" }}>Origem</span>
                <span className="font-medium text-right">{sel.origem}</span>
              </div>
              <div className="flex justify-between gap-2 items-center">
                <span style={{ color: "var(--az-mut)" }}>Empresa</span>
                {sel.empresa ? <TagEmpresa empresa={sel.empresa} mini /> : <span className="font-medium">—</span>}
              </div>
              {[["Início", sel.inicio], ["Espera", `${sel.espera} min`],
                ["Setor", sel.setor ?? "—"], ["Atendente", sel.atendente ?? "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span style={{ color: "var(--az-mut)" }}>{k}</span>
                  <span className="font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--az-mut)" }}>Etiquetas</div>
              <button onClick={() => setMenuEtq(v => !v)} className="f-mono text-xs" style={{ color: "var(--az-leaf)" }}>+ editar</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sel.etiquetas.length === 0 && <span className="text-xs" style={{ color: "var(--az-mut)" }}>Sem etiquetas.</span>}
              {sel.etiquetas.map(e => (
                <span key={e} className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: "var(--az-amber-soft)", color: "#9A6614" }}>{e}</span>
              ))}
            </div>
            {menuEtq && (
              <div className="mt-2 az-card p-2 grid grid-cols-1 gap-1">
                {ETIQUETAS_DISPONIVEIS.map(e => (
                  <label key={e} className="flex items-center gap-2 text-xs cursor-pointer px-1 py-0.5 rounded hover:bg-[var(--az-paper)]">
                    <input type="checkbox" checked={sel.etiquetas.includes(e)} onChange={() => acoes.toggleEtiqueta(sel, e)} />
                    {e}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--az-mut)" }}>Notas internas</div>
            <div className="space-y-1.5 mb-2">
              {sel.notas.length === 0 && <span className="text-xs" style={{ color: "var(--az-mut)" }}>Nenhuma nota registrada.</span>}
              {sel.notas.map((n, i) => (
                <div key={i} className="text-xs p-2 rounded-lg" style={{ background: "var(--az-amber-soft)" }}>{n}</div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={novaNota} onChange={e => setNovaNota(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addNota()}
                placeholder="Nova nota…"
                className="flex-1 px-2 py-1.5 rounded-lg border text-xs focus:outline-none min-w-0"
                style={{ borderColor: "var(--az-line)" }} />
              <Botao tam="sm" onClick={addNota}>Salvar</Botao>
            </div>
            <div className="f-mono text-[9px] mt-1.5" style={{ color: "var(--az-mut)" }}>
              visível apenas para a equipe — nunca para o cliente
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
