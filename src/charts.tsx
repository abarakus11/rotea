import React from "react";

// ── Barras verticais (horários de pico) ───────────────────────────
export function Barras({ data, cor = "var(--az-leaf)" }: { data: { h: string; v: number }[]; cor?: string }) {
  const max = Math.max(...data.map(d => d.v));
  const W = 560, H = 150, pad = 4, bw = W / data.length - 8;
  return (
    <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full">
      {data.map((d, i) => {
        const h = (d.v / max) * (H - pad);
        const x = i * (W / data.length) + 4;
        const pico = d.v === max;
        return (
          <g key={d.h}>
            <rect x={x} y={H - h} width={bw} height={h} rx={3}
              fill={pico ? "var(--az-amber)" : cor} opacity={pico ? 1 : 0.5 + 0.5 * (d.v / max)} />
            <text x={x + bw / 2} y={H + 14} textAnchor="middle" fontSize="10"
              fill="var(--az-mut)" className="f-mono">{d.h}</text>
            {pico && (
              <text x={x + bw / 2} y={H - h - 6} textAnchor="middle" fontSize="10"
                fill="var(--az-amber)" className="f-mono" fontWeight={600}>{d.v}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Linha dupla (leads × convertidos) ─────────────────────────────
export function Linhas({ data }: { data: { dia: string; leads: number; convertidos: number }[] }) {
  const W = 560, H = 160, padX = 10, padY = 12;
  const max = Math.max(...data.map(d => d.leads));
  const x = (i: number) => padX + (i * (W - 2 * padX)) / (data.length - 1);
  const y = (v: number) => H - padY - (v / max) * (H - 2 * padY);
  const path = (k: "leads" | "convertidos") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d[k])}`).join(" ");
  const area = `${path("leads")} L${x(data.length - 1)},${H} L${x(0)},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full">
      <path d={area} fill="var(--az-leaf)" opacity={0.08} />
      <path d={path("leads")} fill="none" stroke="var(--az-leaf)" strokeWidth={2.5} strokeLinecap="round" />
      <path d={path("convertidos")} fill="none" stroke="var(--az-forest)" strokeWidth={2}
        strokeDasharray="5 4" strokeLinecap="round" />
      {data.map((d, i) => (
        <g key={d.dia}>
          <circle cx={x(i)} cy={y(d.leads)} r={3.5} fill="var(--az-leaf)" />
          <circle cx={x(i)} cy={y(d.convertidos)} r={3} fill="var(--az-forest)" />
          <text x={x(i)} y={H + 16} textAnchor="middle" fontSize="10" fill="var(--az-mut)" className="f-mono">{d.dia}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Funil ─────────────────────────────────────────────────────────
export function Funil({ data }: { data: { etapa: string; valor: number }[] }) {
  const max = data[0].valor;
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct = (d.valor / max) * 100;
        return (
          <div key={d.etapa} className="flex items-center gap-3">
            <div className="w-44 text-xs shrink-0" style={{ color: "var(--az-mut)" }}>{d.etapa}</div>
            <div className="flex-1 h-7 rounded" style={{ background: "var(--az-paper)" }}>
              <div className="h-full rounded flex items-center px-2 f-mono text-xs font-semibold text-white transition-all"
                style={{ width: `${Math.max(pct, 12)}%`, background: `color-mix(in srgb, var(--az-leaf) ${40 + i * 15}%, var(--az-forest))` }}>
                {d.valor}
              </div>
            </div>
            <div className="w-12 text-right f-mono text-xs" style={{ color: "var(--az-mut)" }}>
              {Math.round(pct)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Barras horizontais (volume por origem) ────────────────────────
export function BarrasH({ data }: { data: { origem: string; v: number }[] }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.origem}>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "var(--az-ink)" }}>{d.origem}</span>
            <span className="f-mono font-semibold">{d.v}</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "var(--az-paper)" }}>
            <div className="h-full rounded-full" style={{ width: `${(d.v / max) * 100}%`, background: "var(--az-leaf)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Anel de SLA ───────────────────────────────────────────────────
export function AnelSLA({ pct }: { pct: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const cor = pct >= 95 ? "var(--az-leaf)" : pct >= 90 ? "var(--az-amber)" : "var(--az-clay)";
  return (
    <svg viewBox="0 0 84 84" className="w-20 h-20">
      <circle cx="42" cy="42" r={r} fill="none" stroke="var(--az-line)" strokeWidth="8" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={cor} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 42 42)" />
      <text x="42" y="47" textAnchor="middle" className="f-mono" fontSize="16" fontWeight="600" fill="var(--az-ink)">{pct}%</text>
    </svg>
  );
}
