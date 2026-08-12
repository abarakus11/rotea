import React from "react";
import { Chat, Usuario, SERIE_SEMANA, HORARIOS_PICO, FUNIL, VOLUME_ORIGEM, RANKING_SETOR, Setor } from "../data";
import { Linhas, Barras, Funil, BarrasH, AnelSLA } from "../charts";
import { KPI, Secao, Avatar, TagSetor, Botao } from "../ui";

export default function Painel({ chats, equipe }: { chats: Chat[]; equipe: Usuario[] }) {
  const andamento = chats.filter(c => c.status === "andamento").length;
  const fila = chats.filter(c => c.status === "fila" || c.status === "bot").length;
  const encerrados = chats.filter(c => c.status === "encerrado").length;
  const abandonados = chats.filter(c => c.status === "abandonado").length;
  const atendentes = equipe.filter(u => u.atendimentosHoje > 0)
    .sort((a, b) => b.atendimentosHoje - a.atendimentosHoje);

  const exportarExcel = () => {
    const linhas = [
      "Indicador;Valor",
      "TMA;08:24", "Tempo de primeira resposta;00:47", "SLA;93%",
      `Leads hoje;73`, "Taxa de conversão;39,7%",
      `Em andamento;${andamento}`, `Na fila;${fila}`,
      `Encerrados;${encerrados}`, `Abandonados;${abandonados}`,
      "", "Setor;Atendimentos;SLA",
      ...RANKING_SETOR.map(r => `${r.setor};${r.atendimentos};${r.sla}%`),
      "", "Atendente;Atendimentos;TMA (min);Nota",
      ...atendentes.map(a => `${a.nome};${a.atendimentosHoje};${a.tmaMin};${a.nota}`),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + linhas], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rotea_indicadores.csv";
    a.click();
  };

  return (
    <div className="p-5 space-y-4 az-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="f-disp text-lg font-semibold">Painel executivo</h2>
          <p className="text-xs" style={{ color: "var(--az-mut)" }}>Quarta-feira, 05 de agosto de 2026 · dados em tempo real</p>
        </div>
        <div className="flex gap-2">
          <Botao variante="fantasma" tam="sm" onClick={exportarExcel}>⬇ Exportar Excel</Botao>
          <Botao variante="fantasma" tam="sm" onClick={() => window.print()}>⬇ Exportar PDF</Botao>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <KPI rotulo="TMA" valor="08:24" sufixo="min" delta="−0:41" />
        <KPI rotulo="1ª resposta" valor="00:47" sufixo="s" delta="−0:09" />
        <KPI rotulo="SLA" valor="93" sufixo="%" delta="+2 pp" />
        <KPI rotulo="Leads hoje" valor="73" delta="+18%" />
        <KPI rotulo="Conversão" valor="39,7" sufixo="%" delta="+3,1 pp" />
        <KPI rotulo="Em andamento" valor={String(andamento)} />
        <KPI rotulo="Na fila" valor={String(fila)} alerta={fila > 2} />
        <KPI rotulo="Abandonados" valor={String(abandonados)} alerta={abandonados > 0} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Secao titulo="Leads × convertidos — últimos 7 dias"
          extra={<div className="flex gap-3 f-mono text-[10px]" style={{ color: "var(--az-mut)" }}>
            <span>— leads</span><span>- - convertidos</span>
          </div>}>
          <Linhas data={SERIE_SEMANA} />
        </Secao>
        <Secao titulo="Horários de pico — volume por hora">
          <Barras data={HORARIOS_PICO} />
        </Secao>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Secao titulo="Funil de atendimento" className="lg:col-span-2">
          <Funil data={FUNIL} />
        </Secao>
        <Secao titulo="Volume por origem">
          <BarrasH data={VOLUME_ORIGEM} />
        </Secao>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Secao titulo="Ranking por atendente — hoje">
          <div className="space-y-1">
            {atendentes.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-[var(--az-paper)]">
                <span className="f-mono text-xs w-5" style={{ color: i < 3 ? "var(--az-leaf)" : "var(--az-mut)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Avatar nome={a.nome} tam={28} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.nome}</div>
                  <div className="text-[11px]" style={{ color: "var(--az-mut)" }}>{a.setor ?? a.perfil}</div>
                </div>
                <div className="f-mono text-xs text-right">
                  <div className="font-semibold">{a.atendimentosHoje} atend.</div>
                  <div style={{ color: "var(--az-mut)" }}>TMA {a.tmaMin}min · ★{a.nota}</div>
                </div>
              </div>
            ))}
          </div>
        </Secao>
        <Secao titulo="Ranking por setor — mês">
          <div className="grid grid-cols-2 gap-3">
            {RANKING_SETOR.map(r => (
              <div key={r.setor} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--az-paper)" }}>
                <AnelSLA pct={r.sla} />
                <div>
                  <TagSetor setor={r.setor as Setor} mini />
                  <div className="f-mono text-lg font-semibold mt-1">{r.atendimentos}</div>
                  <div className="text-[10px]" style={{ color: "var(--az-mut)" }}>atendimentos · SLA ao lado</div>
                </div>
              </div>
            ))}
          </div>
        </Secao>
      </div>
    </div>
  );
}
