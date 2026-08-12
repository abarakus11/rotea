import React, { useState } from "react";
import { NoFluxo, SETORES, Setor, uid } from "../data";
import { TagSetor, Botao, Secao } from "../ui";

interface Props {
  fluxo: NoFluxo[];
  setFluxo: (f: NoFluxo[]) => void;
}

export default function Fluxo({ fluxo, setFluxo }: Props) {
  const perguntas = fluxo.filter(n => n.tipo === "pergunta");
  const regras = fluxo.filter(n => n.tipo === "regra");
  const [novaKw, setNovaKw] = useState<Record<string, string>>({});

  const editar = (id: string, patch: Partial<NoFluxo>) =>
    setFluxo(fluxo.map(n => (n.id === id ? { ...n, ...patch } : n)));

  const remover = (id: string) => setFluxo(fluxo.filter(n => n.id !== id));

  const addPergunta = () =>
    setFluxo([...fluxo.filter(n => n.tipo === "pergunta"),
      { id: uid(), tipo: "pergunta", titulo: "Nova pergunta", conteudo: "Digite aqui a pergunta que o bot fará…" },
      ...regras]);

  const addRegra = () =>
    setFluxo([...fluxo, { id: uid(), tipo: "regra", titulo: "Nova regra", conteudo: "Descreva o critério", destino: "Atendimento", palavrasChave: [] }]);

  const addKw = (id: string) => {
    const kw = (novaKw[id] ?? "").trim().toLowerCase();
    if (!kw) return;
    const n = fluxo.find(x => x.id === id)!;
    editar(id, { palavrasChave: [...(n.palavrasChave ?? []), kw] });
    setNovaKw({ ...novaKw, [id]: "" });
  };

  return (
    <div className="p-5 az-in max-w-5xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="f-disp text-lg font-semibold">Construtor de fluxos do bot</h2>
        <div className="f-mono text-[11px] px-2.5 py-1 rounded-full" style={{ background: "var(--az-leaf-soft)", color: "var(--az-forest)" }}>
          ● fluxo publicado — alterações valem para novos leads
        </div>
      </div>
      <p className="text-xs mb-5" style={{ color: "var(--az-mut)" }}>
        O bot percorre as perguntas em ordem; as respostas alimentam as regras de encaminhamento abaixo.
      </p>

      <div className="grid lg:grid-cols-[1fr_auto_1fr] gap-5">
        {/* Perguntas */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--az-mut)" }}>
            1 · Perguntas de triagem
          </div>
          <div className="space-y-0">
            {perguntas.map((p, i) => (
              <div key={p.id}>
                <div className="az-card p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="f-mono text-xs w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ background: "var(--az-forest)" }}>{i + 1}</span>
                    <input value={p.titulo} onChange={e => editar(p.id, { titulo: e.target.value })}
                      className="flex-1 text-sm font-semibold bg-transparent focus:outline-none" />
                    <button onClick={() => remover(p.id)} className="text-xs" style={{ color: "var(--az-clay)" }}>remover</button>
                  </div>
                  <textarea value={p.conteudo} onChange={e => editar(p.id, { conteudo: e.target.value })}
                    rows={2}
                    className="w-full text-xs p-2 rounded-lg border resize-none focus:outline-none"
                    style={{ borderColor: "var(--az-line)", background: "var(--az-paper)" }} />
                  <div className="f-mono text-[9px] mt-1" style={{ color: "var(--az-mut)" }}>
                    use {"{nome}"} para inserir a resposta anterior
                  </div>
                </div>
                {i < perguntas.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4" style={{ background: "var(--az-line)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Botao variante="fantasma" tam="sm" onClick={addPergunta}>+ Adicionar pergunta</Botao>
          </div>
        </div>

        {/* Conector */}
        <div className="hidden lg:flex flex-col items-center justify-center gap-2">
          <div className="f-mono text-[10px] rotate-90 whitespace-nowrap" style={{ color: "var(--az-mut)" }}>
            respostas → motor de regras
          </div>
          <div className="text-2xl" style={{ color: "var(--az-leaf)" }}>➜</div>
        </div>

        {/* Regras */}
        <div>
          <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--az-mut)" }}>
            2 · Regras de encaminhamento <span className="normal-case font-normal">(avaliadas de cima para baixo)</span>
          </div>
          <div className="space-y-3">
            {regras.map(r => (
              <div key={r.id} className="az-card p-3" style={{ borderLeft: `3px solid ${r.destino ? `var(--az-leaf)` : "var(--az-line)"}` }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <input value={r.titulo} onChange={e => editar(r.id, { titulo: e.target.value })}
                    className="flex-1 text-sm font-semibold bg-transparent focus:outline-none" />
                  <select value={r.destino} onChange={e => editar(r.id, { destino: e.target.value as Setor })}
                    className="text-xs border rounded-lg px-2 py-1 focus:outline-none"
                    style={{ borderColor: "var(--az-line)" }}>
                    {SETORES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button onClick={() => remover(r.id)} className="text-xs" style={{ color: "var(--az-clay)" }}>×</button>
                </div>
                <input value={r.conteudo} onChange={e => editar(r.id, { conteudo: e.target.value })}
                  className="w-full text-xs bg-transparent focus:outline-none mb-2" style={{ color: "var(--az-mut)" }} />
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(r.palavrasChave ?? []).map(kw => (
                    <span key={kw} className="f-mono text-[10px] px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                      style={{ background: "var(--az-paper)", border: "1px solid var(--az-line)" }}>
                      {kw === "*" ? "* (qualquer resposta)" : kw}
                      <button onClick={() => editar(r.id, { palavrasChave: r.palavrasChave!.filter(x => x !== kw) })}
                        style={{ color: "var(--az-clay)" }}>×</button>
                    </span>
                  ))}
                  <input value={novaKw[r.id] ?? ""} onChange={e => setNovaKw({ ...novaKw, [r.id]: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && addKw(r.id)}
                    placeholder="+ palavra-chave ⏎"
                    className="f-mono text-[10px] px-2 py-0.5 rounded-md border focus:outline-none w-32"
                    style={{ borderColor: "var(--az-line)" }} />
                </div>
                {r.destino && <div className="mt-2"><TagSetor setor={r.destino} mini /></div>}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Botao variante="fantasma" tam="sm" onClick={addRegra}>+ Adicionar regra</Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
