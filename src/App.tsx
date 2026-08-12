import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { SupabaseClient, Session } from "@supabase/supabase-js";
import {
  Chat, Usuario, NoFluxo, USUARIOS, CHATS_INICIAIS, FLUXO_INICIAL,
  LEADS_SIMULAVEIS, Setor, agora, uid,
} from "./data";
import {
  getSupabase, supabaseConfigurado, aoMudarSessao, buscarPerfil,
  listarEquipe, salvarPerfil, removerMembro, sair, PerfilDB, traduzErro,
} from "./supabase";
import {
  carregarConversasLive, assinarLive, patchConversa, msgSistema,
  enviarLive, simularLive,
} from "./live";
import Login from "./views/Login";
import Painel from "./views/Painel";
import Conversas from "./views/Conversas";
import Fluxo from "./views/Fluxo";
import Filas from "./views/Filas";
import Gestao from "./views/Gestao";
import Perfil from "./views/Perfil";

type Aba = "painel" | "conversas" | "filas" | "fluxo" | "gestao" | "perfil";

const NAV: { aba: Aba; rotulo: string; icone: string; perfis: ("Administrador" | "Supervisor" | "Atendente")[] }[] = [
  { aba: "painel", rotulo: "Painel", icone: "📊", perfis: ["Administrador", "Supervisor", "Atendente"] },
  { aba: "conversas", rotulo: "Conversas", icone: "💬", perfis: ["Administrador", "Supervisor", "Atendente"] },
  { aba: "filas", rotulo: "Filas", icone: "🗂", perfis: ["Administrador", "Supervisor", "Atendente"] },
  { aba: "fluxo", rotulo: "Fluxo do bot", icone: "🤖", perfis: ["Administrador", "Supervisor"] },
  { aba: "gestao", rotulo: "Setores & equipe", icone: "👥", perfis: ["Administrador"] },
  { aba: "perfil", rotulo: "Meu perfil", icone: "🪪", perfis: ["Administrador", "Supervisor", "Atendente"] },
];

const RESPOSTAS_CLIENTE = [
  "Ah, perfeito! Pode me explicar melhor como funciona?",
  "Entendi, faz sentido. E quanto ficaria o valor?",
  "Hmm, achei justo. Vocês têm alguma condição especial este mês?",
  "Ótimo! Consegue me enviar os detalhes por e-mail também?",
  "Perfeito, meu e-mail é contato@cliente-teste.com.br 😊",
  "Muito obrigado pelo atendimento, era isso mesmo que eu precisava!",
];
const RESPOSTAS_FINAIS = ["👍", "Certo!", "Combinado, obrigado!", "Show!"];

const mapPerfil = (p: PerfilDB): Usuario => ({
  id: p.id, nome: p.nome || p.email, perfil: p.perfil, setor: p.setor,
  online: p.online, atendimentosHoje: 0, tmaMin: 0, nota: 0,
});

export default function App() {
  // ── Supabase / sessão ──
  const [chaveRuntime, setChaveRuntime] = useState<string>("");
  const sb: SupabaseClient | null = useMemo(() => {
    try { return supabaseConfigurado(chaveRuntime) ? getSupabase(chaveRuntime) : null; }
    catch { return null; }
  }, [chaveRuntime]);

  const [sessao, setSessao] = useState<Session | null>(null);
  const [meuPerfilDB, setMeuPerfilDB] = useState<PerfilDB | null>(null);
  const [equipeDB, setEquipeDB] = useState<PerfilDB[]>([]);
  const [demoUser, setDemoUser] = useState<Usuario | null>(null);

  useEffect(() => {
    if (!sb) return;
    return aoMudarSessao(sb, async s => {
      setSessao(s);
      if (s) {
        try {
          const [meu, todos] = await Promise.all([buscarPerfil(sb, s.user.id), listarEquipe(sb)]);
          setMeuPerfilDB(meu);
          setEquipeDB(todos);
        } catch { /* perfis ainda não migrados */ }
      } else {
        setMeuPerfilDB(null);
        setEquipeDB([]);
      }
    });
  }, [sb]);

  const modoAuth = Boolean(sb && sessao);
  const usuario: Usuario | null = modoAuth
    ? (meuPerfilDB ? mapPerfil(meuPerfilDB) : sessao ? {
        id: sessao.user.id, nome: sessao.user.email ?? "Usuário", perfil: "Atendente",
        setor: null, online: true, atendimentosHoje: 0, tmaMin: 0, nota: 0,
      } : null)
    : demoUser;

  // ── Estado operacional ──
  const [aba, setAba] = useState<Aba>("painel");
  const [chats, setChats] = useState<Chat[]>(CHATS_INICIAIS);
  const [chatsLive, setChatsLive] = useState<Chat[] | null>(null);
  const [fluxo, setFluxo] = useState<NoFluxo[]>(FLUXO_INICIAL);
  const [usuariosDemo, setUsuariosDemo] = useState<Usuario[]>(USUARIOS);
  const [simulando, setSimulando] = useState(false);
  const leadIdx = useRef(0);

  // ── Conversas reais ao vivo (Supabase Realtime) ──
  useEffect(() => {
    if (!sb || !sessao) { setChatsLive(null); return; }
    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const nomes: Record<string, string> = {};
    equipeDB.forEach(p => { nomes[p.id] = p.nome || p.email; });
    const carregar = async () => {
      const lista = await carregarConversasLive(sb, nomes);
      if (ativo) setChatsLive(lista);
    };
    carregar();
    const desassinar = assinarLive(sb, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(carregar, 400);
    });
    return () => { ativo = false; if (timer) clearTimeout(timer); desassinar(); };
  }, [sb, sessao, equipeDB]);

  const aoVivo = modoAuth && chatsLive !== null;
  const equipe: Usuario[] = modoAuth && equipeDB.length > 0 ? equipeDB.map(mapPerfil) : usuariosDemo;
  const chatsAtivos: Chat[] = aoVivo ? (chatsLive ?? []) : chats;

  const atualizarChat = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChats(prev => prev.map(c => (c.id === id ? fn(c) : c)));
  }, []);

  const mutLive = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChatsLive(prev => (prev ? prev.map(c => (c.id === id ? fn(c) : c)) : prev));
  }, []);

  const mut = useCallback((c: Chat, fn: (x: Chat) => Chat) => {
    if (c.aoVivo) mutLive(c.id, fn); else atualizarChat(c.id, fn);
  }, [mutLive, atualizarChat]);

  const salvarMeuPerfil = async (patch: { nome: string; telefone: string | null; setor: Setor | null; online: boolean }) => {
    if (modoAuth && sb && sessao) {
      await salvarPerfil(sb, sessao.user.id, patch);
      const [meu, todos] = await Promise.all([buscarPerfil(sb, sessao.user.id), listarEquipe(sb)]);
      setMeuPerfilDB(meu);
      setEquipeDB(todos);
    } else if (demoUser) {
      const novo = { ...demoUser, nome: patch.nome, setor: patch.setor ?? demoUser.setor, online: patch.online };
      setDemoUser(novo);
      setUsuariosDemo(prev => prev.map(u => (u.id === novo.id ? novo : u)));
    }
  };

  const removerDaEquipe = async (id: string) => {
    if (modoAuth && sb) {
      try {
        await removerMembro(sb, id);
      } catch (e) {
        throw new Error(traduzErro(e));
      }
      setEquipeDB(prev => prev.filter(p => p.id !== id));
      return;
    }
    setUsuariosDemo(prev => prev.filter(u => u.id !== id));
  };

  const deslogar = async () => {
    if (sb) await sair(sb);
    setDemoUser(null);
    setSessao(null);
    setAba("painel");
  };

  // ── Motor de simulação: lead → bot → regra → fila → atendente ──
  const simularLead = () => {
    if (simulando) return;
    if (aoVivo && sb) {
      setSimulando(true);
      simularLive(sb).finally(() => setTimeout(() => setSimulando(false), 1500));
      return;
    }
    setSimulando(true);
    const lead = LEADS_SIMULAVEIS[leadIdx.current % LEADS_SIMULAVEIS.length];
    leadIdx.current++;
    const id = uid();
    const perguntas = fluxo.filter(n => n.tipo === "pergunta");
    const primeiroNome = lead.nome.split(" ")[0];
    const p1 = perguntas[0]?.conteudo ?? "Olá! Qual o seu nome?";
    const p2 = (perguntas[1]?.conteudo ?? "Sobre qual empresa você gostaria de falar?").replace("{nome}", primeiroNome);
    const p3 = (perguntas[2]?.conteudo ?? "Como podemos ajudar você hoje?").replace("{nome}", primeiroNome);

    const regras = fluxo.filter(n => n.tipo === "regra");
    const assunto = lead.assunto.toLowerCase();
    const regra = regras.find(r => (r.palavrasChave ?? []).some(k => k !== "*" && assunto.includes(k)))
      ?? regras.find(r => (r.palavrasChave ?? []).includes("*"))
      ?? regras[0];
    const destino = regra?.destino ?? lead.setor;
    const atendente = equipe.find(u => u.online && (u.setor === destino || u.setor === null));

    const novo: Chat = {
      id, cliente: lead.nome, telefone: lead.telefone, origem: lead.origem,
      setor: null, atendente: null, status: "bot", etiquetas: [], notas: [],
      inicio: agora(), espera: 0, naoLidas: 1,
      msgs: [{ id: uid(), de: "bot", texto: p1, hora: agora() }],
    };
    setChats(prev => [novo, ...prev]);

    const passo = (ms: number, fn: () => void) => setTimeout(fn, ms);
    passo(1400, () => atualizarChat(id, c => ({ ...c, msgs: [...c.msgs, { id: uid(), de: "cliente", texto: lead.nome, hora: agora() }] })));
    passo(2600, () => atualizarChat(id, c => ({ ...c, msgs: [...c.msgs, { id: uid(), de: "bot", texto: p2, hora: agora() }] })));
    passo(4200, () => atualizarChat(id, c => ({ ...c, empresa: lead.empresa, msgs: [...c.msgs, { id: uid(), de: "cliente", texto: lead.empresa, hora: agora() }] })));
    passo(5400, () => atualizarChat(id, c => ({ ...c, msgs: [...c.msgs, { id: uid(), de: "bot", texto: p3, hora: agora() }] })));
    passo(7000, () => atualizarChat(id, c => ({ ...c, naoLidas: c.naoLidas + 1, msgs: [...c.msgs, { id: uid(), de: "cliente", texto: lead.assunto, hora: agora() }] })));
    passo(8200, () => atualizarChat(id, c => ({
      ...c, setor: destino, status: "fila", espera: 1, etiquetas: [lead.empresa],
      msgs: [...c.msgs, { id: uid(), de: "sistema", texto: `Regra "${regra?.titulo ?? "padrão"}" aplicada · empresa ${lead.empresa} · encaminhado para fila ${destino}`, hora: agora() }],
    })));
    passo(10600, () => {
      if (atendente) {
        atualizarChat(id, c => c.status === "fila" && !c.atendente ? ({
          ...c, status: "andamento", atendente: atendente.nome,
          msgs: [...c.msgs,
            { id: uid(), de: "sistema", texto: `Distribuição automática: ${atendente.nome} assumiu o atendimento`, hora: agora() },
            { id: uid(), de: "atendente", texto: `Olá, ${primeiroNome}! Aqui é ${atendente.nome.split(" ")[0]}. Vi que seu contato é sobre a ${lead.empresa} — já estou verificando para você.`, hora: agora() },
          ],
        }) : c);
      }
      setSimulando(false);
    });
  };

  if (!usuario) {
    return (
      <Login
        sb={sb}
        onDefinirChave={setChaveRuntime}
        onDemo={u => { setDemoUser(u); setAba("painel"); }}
      />
    );
  }

  const u = usuario;

  const enviarTexto = (c: Chat, texto: string) => {
    mut(c, x => ({ ...x, naoLidas: 0, msgs: [...x.msgs, { id: uid(), de: "atendente", texto, hora: agora() }] }));
    if (c.aoVivo && sb) {
      enviarLive(sb, c.id, texto).then(r => {
        if (r.aviso) mutLive(c.id, x => ({ ...x, msgs: [...x.msgs, { id: uid(), de: "sistema", texto: r.aviso as string, hora: agora() }] }));
      });
    } else {
      // Cliente simulado local responde de volta — sem WhatsApp, sem banco
      const n = c.msgs.filter(m => m.de === "atendente").length + 1;
      const resposta = n <= RESPOSTAS_CLIENTE.length
        ? RESPOSTAS_CLIENTE[n - 1]
        : RESPOSTAS_FINAIS[Math.floor(Math.random() * RESPOSTAS_FINAIS.length)];
      setTimeout(() => {
        atualizarChat(c.id, x => x.status === "andamento"
          ? { ...x, naoLidas: 0, msgs: [...x.msgs, { id: uid(), de: "cliente", texto: resposta, hora: agora() }] }
          : x);
      }, 1400 + Math.floor(Math.random() * 1500));
    }
  };

  const acoes = {
    marcarLido: (c: Chat) => mut(c, x => ({ ...x, naoLidas: 0 })),
    enviar: enviarTexto,
    anexar: (c: Chat) => enviarTexto(c, "📎 documento_anexo.pdf (envio de anexos entra com a API ativa)"),
    assumir: (c: Chat) => {
      const texto = `${u.nome} assumiu o atendimento`;
      mut(c, x => ({ ...x, status: "andamento", atendente: u.nome, naoLidas: 0, msgs: [...x.msgs, { id: uid(), de: "sistema", texto, hora: agora() }] }));
      if (c.aoVivo && sb) { patchConversa(sb, c.id, { status: "andamento", atendente_id: u.id }); msgSistema(sb, c.id, texto); }
    },
    encerrar: (c: Chat) => {
      const texto = `Atendimento encerrado por ${u.nome}`;
      mut(c, x => ({ ...x, status: "encerrado", msgs: [...x.msgs, { id: uid(), de: "sistema", texto, hora: agora() }] }));
      if (c.aoVivo && sb) { patchConversa(sb, c.id, { status: "encerrado" }); msgSistema(sb, c.id, texto); }
    },
    transferir: (c: Chat, destino: Setor) => {
      const texto = `Transferido para a fila ${destino} por ${u.nome}`;
      mut(c, x => ({ ...x, setor: destino, atendente: null, status: "fila", msgs: [...x.msgs, { id: uid(), de: "sistema", texto, hora: agora() }] }));
      if (c.aoVivo && sb) { patchConversa(sb, c.id, { setor: destino, status: "fila", atendente_id: null }); msgSistema(sb, c.id, texto); }
    },
    toggleEtiqueta: (c: Chat, e: string) => {
      const novas = c.etiquetas.includes(e) ? c.etiquetas.filter(x => x !== e) : [...c.etiquetas, e];
      mut(c, x => ({ ...x, etiquetas: novas }));
      if (c.aoVivo && sb) patchConversa(sb, c.id, { etiquetas: novas });
    },
    addNota: (c: Chat, nota: string) => {
      const f = `${nota} — ${u.nome.split(" ")[0]}, ${agora()}`;
      const novas = [...c.notas, f];
      mut(c, x => ({ ...x, notas: novas }));
      if (c.aoVivo && sb) patchConversa(sb, c.id, { notas: novas });
    },
  };

  const navVisivel = NAV.filter(n => n.perfis.includes(u.perfil));
  const filaTotal = chatsAtivos.filter(c => c.status === "fila" || c.status === "bot").length;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--az-paper)" }}>
      {/* Topbar */}
      <header className="shrink-0 flex items-center gap-4 px-4 py-2 text-white"
        style={{ background: "var(--az-forest)" }}>
        <div className="flex items-baseline gap-2">
          <span className="f-disp text-lg font-bold tracking-tight">Rotea</span>
          <span className="f-mono text-[9px] opacity-50 hidden sm:inline">central de atendimento</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 f-mono text-[10px] px-2.5 py-1 rounded-full"
          style={{ background: "var(--az-forest-2)" }}>
          <span className="w-1.5 h-1.5 rounded-full az-pulse" style={{ background: "var(--az-leaf)" }} />
          {aoVivo ? "conversas ao vivo · supabase realtime" : modoAuth ? "supabase conectado · sessão autenticada" : "modo demonstração · sem persistência"}
        </div>
        <div className="flex-1" />
        <button onClick={simularLead} disabled={simulando}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
          style={{ background: "var(--az-leaf)", opacity: simulando ? 0.5 : 1 }}>
          {simulando ? "⏳ Lead em triagem…" : "▶ Simular novo lead"}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setAba("perfil")} className="text-right hidden sm:block">
            <div className="text-xs font-semibold leading-tight">{u.nome}</div>
            <div className="f-mono text-[9px] opacity-60">{u.perfil}{u.setor ? ` · ${u.setor}` : ""}</div>
          </button>
          <button onClick={deslogar} title="Sair"
            className="f-mono text-[10px] px-2 py-1 rounded-md" style={{ background: "var(--az-forest-2)" }}>
            sair
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <nav className="w-14 lg:w-44 shrink-0 flex flex-col py-3 gap-1" style={{ background: "var(--az-forest-2)" }}>
          {navVisivel.map(n => (
            <button key={n.aba} onClick={() => setAba(n.aba)}
              className="mx-2 px-2 lg:px-3 py-2 rounded-lg flex items-center gap-2.5 text-sm font-medium transition-colors text-left"
              style={{
                background: aba === n.aba ? "var(--az-forest)" : "transparent",
                color: aba === n.aba ? "white" : "rgba(255,255,255,.65)",
              }}>
              <span>{n.icone}</span>
              <span className="hidden lg:inline flex-1">{n.rotulo}</span>
              {n.aba === "filas" && filaTotal > 0 && (
                <span className="hidden lg:inline f-mono text-[10px] font-bold px-1.5 rounded-full text-white"
                  style={{ background: "var(--az-amber)" }}>{filaTotal}</span>
              )}
            </button>
          ))}
          <div className="flex-1" />
          <div className="hidden lg:block px-4 f-mono text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,.35)" }}>
            supabase auth + rls<br />multi-tenant · lgpd<br />logs & auditoria
          </div>
        </nav>

        {/* Conteúdo */}
        <main className="flex-1 min-w-0 overflow-y-auto az-scroll">
          {aba === "painel" && <Painel chats={chatsAtivos} equipe={equipe} />}
          {aba === "conversas" && <Conversas chats={chatsAtivos} usuario={u} acoes={acoes} />}
          {aba === "filas" && <Filas chats={chatsAtivos} equipe={equipe} assumir={acoes.assumir} />}
          {aba === "fluxo" && <Fluxo fluxo={fluxo} setFluxo={setFluxo} />}
          {aba === "gestao" && (
            <Gestao
              usuarios={equipe}
              setUsuarios={setUsuariosDemo}
              chats={chatsAtivos}
              modoAuth={modoAuth}
              onRemover={removerDaEquipe}
            />
          )}
          {aba === "perfil" && (
            <Perfil usuario={u} email={modoAuth ? sessao?.user.email ?? null : null}
              modoAuth={modoAuth} salvar={salvarMeuPerfil} />
          )}
        </main>
      </div>
    </div>
  );
}
