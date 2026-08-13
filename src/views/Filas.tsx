import React, { useState } from "react";
import { Chat, Usuario, SETORES, CORES_SETOR } from "../data";
import { TagStatus, TagEmpresa, Avatar, Botao } from "../ui";
import { ehMsgAudio, rotuloPreviewAudio } from "../mediaMsg";

interface Props {
  chats: Chat[];
  equipe: Usuario[];
  assumir: (c: Chat) => void;
}

export default function Filas({ chats, equipe, assumir }: Props) {
  const [distAuto, setDistAuto] = useState(true);

  return (
    <div className="p-5 az-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="f-disp text-lg font-semibold">Filas inteligentes</h2>
          <p className="text-xs" style={{ color: "var(--az-mut)" }}>
            Leads triados pelo bot aguardando atendimento, organizados por setor.
          </p>
        </div>
        <button onClick={() => setDistAuto(v => !v)}
          className="flex items-center gap-2 az-card px-3 py-2 text-xs font-medium">
          <span className="w-8 h-4.5 rounded-full p-0.5 transition-colors flex"
            style={{ background: distAuto ? "var(--az-leaf)" : "var(--az-line)", height: 18, width: 32 }}>
            <span className="w-3.5 h-3.5 rounded-full bg-white transition-transform"
              style={{ transform: distAuto ? "translateX(14px)" : "none" }} />
          </span>
          Distribuição automática {distAuto ? "ativa" : "pausada"}
          <span className="f-mono text-[10px]" style={{ color: "var(--az-mut)" }}>
            · round-robin por carga
          </span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {SETORES.map(setor => {
          const cor = CORES_SETOR[setor];
          const naFila = chats.filter(c => c.setor === setor && (c.status === "fila" || c.status === "bot"));
          const andamento = chats.filter(c => c.setor === setor && c.status === "andamento");
          const disponiveis = equipe.filter(u => u.online && (u.setor === setor || u.setor === null));
          return (
            <div key={setor} className="az-card overflow-hidden flex flex-col">
              <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: `color-mix(in srgb, ${cor} 10%, white)` }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: cor }} />
                  <span className="text-sm font-semibold">{setor}</span>
                </div>
                <span className="f-mono text-[11px]" style={{ color: "var(--az-mut)" }}>
                  {naFila.length} fila · {andamento.length} ativo{andamento.length !== 1 && "s"}
                </span>
              </div>

              <div className="p-2.5 space-y-2 flex-1 min-h-[120px]">
                {naFila.length === 0 && (
                  <div className="text-center text-xs py-6" style={{ color: "var(--az-mut)" }}>
                    Fila vazia. ✓
                  </div>
                )}
                {naFila.map(c => (
                  <div key={c.id} className="p-2.5 rounded-lg border az-in" style={{ borderColor: "var(--az-line)" }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar nome={c.cliente} tam={26} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{c.cliente}</div>
                        <div className="f-mono text-[10px] flex items-center gap-1.5 flex-wrap" style={{ color: c.espera > 5 ? "var(--az-clay)" : "var(--az-mut)" }}>
                          <span>aguardando {c.espera} min</span>
                          {c.empresa && <TagEmpresa empresa={c.empresa} mini />}
                        </div>
                      </div>
                      <TagStatus status={c.status} />
                    </div>
                    <div className="text-[11px] truncate mb-2" style={{ color: "var(--az-mut)" }}>
                      {(() => {
                        const m = [...c.msgs].reverse().find(x => x.de === "cliente");
                        if (!m) return "…";
                        if (ehMsgAudio(m)) return rotuloPreviewAudio(m);
                        return `"${m.texto}"`;
                      })()}
                    </div>
                    {c.status === "fila" && <Botao tam="sm" onClick={() => assumir(c)}>Assumir próximo</Botao>}
                  </div>
                ))}
              </div>

              <div className="px-3 py-2 border-t flex items-center gap-1.5" style={{ borderColor: "var(--az-line)" }}>
                <span className="f-mono text-[10px] mr-1" style={{ color: "var(--az-mut)" }}>online:</span>
                {disponiveis.length === 0 && <span className="text-[10px]" style={{ color: "var(--az-clay)" }}>ninguém disponível</span>}
                {disponiveis.map(u => <Avatar key={u.id} nome={u.nome} tam={22} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
