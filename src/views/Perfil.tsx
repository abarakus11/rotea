import React, { useState } from "react";
import { Usuario, Setor, SETORES } from "../data";
import { Avatar, TagSetor, Botao, Secao } from "../ui";

interface Props {
  usuario: Usuario;
  email: string | null;          // null em modo demo
  modoAuth: boolean;
  salvar: (patch: { nome: string; telefone: string | null; setor: Setor | null; online: boolean }) => Promise<void>;
}

export default function Perfil({ usuario, email, modoAuth, salvar }: Props) {
  const [nome, setNome] = useState(usuario.nome);
  const [telefone, setTelefone] = useState((usuario as any).telefone ?? "");
  const [setor, setSetor] = useState<Setor | "">(usuario.setor ?? "");
  const [online, setOnline] = useState(usuario.online);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  const submeter = async () => {
    setSalvando(true);
    setMsg("");
    try {
      await salvar({
        nome: nome.trim() || usuario.nome,
        telefone: telefone.trim() || null,
        setor: usuario.perfil === "Administrador" ? null : (setor || null),
        online,
      });
      setMsg("Alterações salvas.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none";
  const inputSt = { borderColor: "var(--az-line)" } as React.CSSProperties;

  return (
    <div className="p-5 az-in max-w-2xl">
      <h2 className="f-disp text-lg font-semibold mb-1">Meu perfil</h2>
      <p className="text-xs mb-5" style={{ color: "var(--az-mut)" }}>
        {modoAuth
          ? "Dados sincronizados com a tabela perfis do Supabase — visíveis para a equipe nas filas e no ranking."
          : "Modo demonstração: as alterações valem apenas para esta sessão."}
      </p>

      <Secao titulo="Identificação">
        <div className="flex items-center gap-4 mb-5">
          <Avatar nome={nome || usuario.nome} tam={56} />
          <div>
            <div className="f-disp font-semibold">{nome || usuario.nome}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="f-mono text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "var(--az-leaf-soft)", color: "var(--az-forest)" }}>
                {usuario.perfil}
              </span>
              {usuario.setor && <TagSetor setor={usuario.setor} mini />}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>Nome completo</label>
            <input value={nome} onChange={e => setNome(e.target.value)} className={inputCls} style={inputSt} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>E-mail de acesso</label>
            <input value={email ?? "demo@rotea.local"} disabled
              className={`${inputCls} opacity-60`} style={inputSt} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>Telefone / WhatsApp</label>
            <input value={telefone} onChange={e => setTelefone(e.target.value)}
              placeholder="+55 11 90000-0000" className={`${inputCls} f-mono`} style={inputSt} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>Setor de atuação</label>
            {usuario.perfil === "Administrador" ? (
              <input value="Todos os setores (Administrador)" disabled
                className={`${inputCls} opacity-60`} style={inputSt} />
            ) : (
              <select value={setor} onChange={e => setSetor(e.target.value as Setor)}
                className={inputCls} style={inputSt}>
                <option value="">— selecionar —</option>
                {SETORES.map(s => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 p-3 rounded-lg" style={{ background: "var(--az-paper)" }}>
          <div>
            <div className="text-sm font-medium">Disponível para atendimento</div>
            <div className="text-[11px]" style={{ color: "var(--az-mut)" }}>
              Quando ativo, a distribuição automática pode direcionar leads para você.
            </div>
          </div>
          <button onClick={() => setOnline(v => !v)}
            className="rounded-full p-0.5 flex transition-colors"
            style={{ background: online ? "var(--az-leaf)" : "var(--az-line)", height: 22, width: 40 }}>
            <span className="w-[18px] h-[18px] rounded-full bg-white transition-transform"
              style={{ transform: online ? "translateX(18px)" : "none" }} />
          </button>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <Botao onClick={submeter} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar alterações"}
          </Botao>
          {msg && <span className="text-xs" style={{ color: msg === "Alterações salvas." ? "var(--az-leaf)" : "var(--az-clay)" }}>{msg}</span>}
        </div>
      </Secao>

      <div className="f-mono text-[10px] mt-4" style={{ color: "var(--az-mut)" }}>
        alteração de e-mail e senha: fluxo do supabase auth (link de confirmação) · perfil de acesso é definido por um administrador
      </div>
    </div>
  );
}
