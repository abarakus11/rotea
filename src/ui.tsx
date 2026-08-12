import React from "react";
import { Setor, CORES_SETOR, StatusChat } from "./data";

export function TagSetor({ setor, mini }: { setor: Setor; mini?: boolean }) {
  const c = CORES_SETOR[setor];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${mini ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"} font-medium`}
      style={{ background: `color-mix(in srgb, ${c} 12%, white)`, color: `color-mix(in srgb, ${c} 80%, black)` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {setor}
    </span>
  );
}

const STATUS_LABEL: Record<StatusChat, [string, string, string]> = {
  bot: ["Com o bot", "var(--az-forest)", "var(--az-leaf-soft)"],
  fila: ["Na fila", "var(--az-amber)", "var(--az-amber-soft)"],
  andamento: ["Em andamento", "var(--az-leaf)", "var(--az-leaf-soft)"],
  encerrado: ["Encerrado", "var(--az-mut)", "#EFEEE7"],
  abandonado: ["Abandonado", "var(--az-clay)", "var(--az-clay-soft)"],
};

export function TagStatus({ status }: { status: StatusChat }) {
  const [label, cor, bg] = STATUS_LABEL[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ color: cor, background: bg }}>
      {(status === "fila" || status === "bot") && <span className="w-1.5 h-1.5 rounded-full az-pulse" style={{ background: cor }} />}
      {label}
    </span>
  );
}

export function KPI({ rotulo, valor, sufixo, delta, alerta }: {
  rotulo: string; valor: string; sufixo?: string; delta?: string; alerta?: boolean;
}) {
  return (
    <div className="az-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--az-mut)" }}>{rotulo}</div>
      <div className="flex items-baseline gap-1">
        <span className="f-mono text-2xl font-semibold" style={{ color: alerta ? "var(--az-clay)" : "var(--az-ink)" }}>{valor}</span>
        {sufixo && <span className="f-mono text-xs" style={{ color: "var(--az-mut)" }}>{sufixo}</span>}
      </div>
      {delta && <div className="f-mono text-[11px] mt-0.5" style={{ color: delta.startsWith("−") ? "var(--az-clay)" : "var(--az-leaf)" }}>{delta} vs. ontem</div>}
    </div>
  );
}

export function Avatar({ nome, tam = 34 }: { nome: string; tam?: number }) {
  const ini = nome.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
  const hue = [...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="rounded-full flex items-center justify-center shrink-0 f-disp font-semibold text-white"
      style={{ width: tam, height: tam, fontSize: tam * 0.36, background: `hsl(${hue} 32% 42%)` }}>
      {ini}
    </div>
  );
}

export function Secao({ titulo, extra, children, className = "" }: {
  titulo: string; extra?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`az-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="f-disp font-semibold text-sm">{titulo}</h3>
        {extra}
      </div>
      {children}
    </div>
  );
}

export function Botao({ children, onClick, variante = "primario", tam = "md", disabled }: {
  children: React.ReactNode; onClick?: () => void;
  variante?: "primario" | "fantasma" | "perigo"; tam?: "sm" | "md"; disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const tamCls = tam === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  const estilos: Record<string, React.CSSProperties> = {
    primario: { background: "var(--az-leaf)", color: "white" },
    fantasma: { background: "transparent", color: "var(--az-ink)", border: "1px solid var(--az-line)" },
    perigo: { background: "var(--az-clay-soft)", color: "var(--az-clay)" },
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${tamCls} ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90"}`}
      style={estilos[variante]}>
      {children}
    </button>
  );
}
