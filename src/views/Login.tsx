import React, { useState } from "react";
import { SupabaseClient } from "@supabase/supabase-js";
import { USUARIOS, Usuario } from "../data";
import { Avatar } from "../ui";
import { cadastrar, entrar, recuperarSenha, traduzErro, SUPABASE_URL } from "../supabase";

type Modo = "cadastro" | "entrar" | "recuperar";

interface Props {
  sb: SupabaseClient | null;          // null = anon key ainda não configurada
  onDefinirChave: (k: string) => void;
  onDemo: (u: Usuario) => void;
}

export default function Login({ sb, onDefinirChave, onDemo }: Props) {
  const [modo, setModo] = useState<Modo>("cadastro");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [chave, setChave] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [mostrarDemo, setMostrarDemo] = useState(false);

  const limpar = () => { setErro(""); setAviso(""); };

  const submeter = async () => {
    if (!sb) return;
    limpar();
    setCarregando(true);
    try {
      if (modo === "cadastro") {
        if (!nome.trim()) throw new Error("Informe seu nome completo.");
        if (senha !== senha2) throw new Error("As senhas não conferem.");
        const r = await cadastrar(sb, nome.trim(), email.trim(), senha);
        if (r.precisaConfirmar) {
          setAviso(`Cadastro criado! Enviamos um link de confirmação para ${email.trim()}. Depois de confirmar, volte aqui e entre com seu e-mail e senha.`);
          setModo("entrar");
        }
        // se a confirmação estiver desativada, a sessão abre sozinha via onAuthStateChange
      } else if (modo === "entrar") {
        await entrar(sb, email.trim(), senha);
      } else {
        await recuperarSenha(sb, email.trim());
        setAviso(`Se existir uma conta para ${email.trim()}, você receberá um e-mail com o link de redefinição.`);
        setModo("entrar");
      }
    } catch (e) {
      setErro(traduzErro(e));
    } finally {
      setCarregando(false);
    }
  };

  const inputCls = "w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2";
  const inputSt = { borderColor: "var(--az-line)" } as React.CSSProperties;

  return (
    <div className="min-h-screen flex" style={{ background: "var(--az-forest)" }}>
      {/* Painel institucional */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "26px 26px" }} />
        <div className="relative">
          <div className="f-disp text-2xl font-bold tracking-tight">Rotea</div>
          <div className="f-mono text-[11px] mt-1 opacity-60">central inteligente de atendimento · whatsapp api oficial</div>
        </div>
        <div className="relative">
          <h1 className="f-disp text-4xl font-semibold leading-tight max-w-md">
            Um número.<br />Um bot que entende.<br />
            <span style={{ color: "var(--az-leaf)" }}>O setor certo, sempre.</span>
          </h1>
          <div className="mt-8 space-y-2 f-mono text-xs opacity-70">
            <div>→ anúncio · whatsapp · triagem automática</div>
            <div>→ roteamento por regras configuráveis</div>
            <div>→ filas inteligentes · métricas em tempo real</div>
          </div>
        </div>
        <div className="relative f-mono text-[10px] opacity-40">
          supabase auth · postgres com rls · lgpd · logs e auditoria
        </div>
      </div>

      {/* Coluna de acesso */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto" style={{ background: "var(--az-paper)" }}>
        <div className="w-full max-w-sm az-in py-6">
          <div className="lg:hidden mb-6 text-center">
            <div className="f-disp text-2xl font-bold">Rotea</div>
            <div className="f-mono text-[11px]" style={{ color: "var(--az-mut)" }}>central inteligente de atendimento</div>
          </div>

          {!sb ? (
            /* ── Configuração da anon key ── */
            <div>
              <h2 className="f-disp text-xl font-semibold mb-1">Conectar ao Supabase</h2>
              <p className="text-sm mb-4" style={{ color: "var(--az-mut)" }}>
                Projeto <span className="f-mono text-xs">{SUPABASE_URL.replace("https://", "")}</span> já configurado.
                Cole a <strong>anon key</strong> (Painel Supabase → Settings → API Keys) para ativar
                cadastro e login reais.
              </p>
              <textarea value={chave} onChange={e => setChave(e.target.value)} rows={3}
                placeholder="eyJhbGciOiJIUzI1NiIs…"
                className={`${inputCls} f-mono text-xs resize-none mb-3`} style={inputSt} />
              <button onClick={() => chave.trim() && onDefinirChave(chave.trim())}
                disabled={!chave.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "var(--az-leaf)", opacity: chave.trim() ? 1 : 0.4 }}>
                Ativar autenticação
              </button>
              <div className="f-mono text-[10px] mt-2" style={{ color: "var(--az-mut)" }}>
                a anon key é pública por design — a segurança vem das políticas rls do banco
              </div>
              <div className="my-4 flex items-center gap-2 text-[11px]" style={{ color: "var(--az-mut)" }}>
                <div className="flex-1 h-px" style={{ background: "var(--az-line)" }} /> ou <div className="flex-1 h-px" style={{ background: "var(--az-line)" }} />
              </div>
              <button onClick={() => setMostrarDemo(v => !v)}
                className="w-full py-2.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: "var(--az-line)", background: "white" }}>
                Explorar em modo demonstração
              </button>
              {mostrarDemo && (
                <div className="mt-3 space-y-2">
                  {USUARIOS.map(u => (
                    <button key={u.id} onClick={() => onDemo(u)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border text-left bg-white hover:border-[var(--az-leaf)]"
                      style={{ borderColor: "var(--az-line)" }}>
                      <Avatar nome={u.nome} tam={32} />
                      <div>
                        <div className="text-sm font-medium">{u.nome}</div>
                        <div className="text-[11px]" style={{ color: "var(--az-mut)" }}>{u.perfil} · sem persistência</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── Cadastro / Login / Recuperação ── */
            <div>
              <div className="flex rounded-xl p-1 mb-5" style={{ background: "#EAE8DF" }}>
                {([["cadastro", "Criar conta"], ["entrar", "Entrar"]] as [Modo, string][]).map(([m, r]) => (
                  <button key={m} onClick={() => { setModo(m); limpar(); }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{
                      background: modo === m || (modo === "recuperar" && m === "entrar") ? "white" : "transparent",
                      color: modo === m || (modo === "recuperar" && m === "entrar") ? "var(--az-ink)" : "var(--az-mut)",
                      boxShadow: modo === m ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                    }}>{r}</button>
                ))}
              </div>

              <h2 className="f-disp text-xl font-semibold mb-1">
                {modo === "cadastro" ? "Criar sua conta" : modo === "entrar" ? "Acessar a plataforma" : "Recuperar acesso"}
              </h2>
              <p className="text-sm mb-5" style={{ color: "var(--az-mut)" }}>
                {modo === "cadastro"
                  ? "O primeiro cadastro do projeto entra como Administrador; os demais, como Atendente."
                  : modo === "entrar"
                  ? "Entre com o e-mail e a senha cadastrados."
                  : "Informe o e-mail cadastrado para receber o link de redefinição de senha."}
              </p>

              {aviso && (
                <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "var(--az-leaf-soft)", color: "var(--az-forest)" }}>
                  ✉ {aviso}
                </div>
              )}
              {erro && (
                <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "var(--az-clay-soft)", color: "var(--az-clay)" }}>
                  {erro}
                </div>
              )}

              <div className="space-y-3">
                {modo === "cadastro" && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>Nome completo</label>
                    <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Como você quer ser identificado(a)"
                      className={inputCls} style={inputSt} autoComplete="name" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@empresa.com.br"
                    className={inputCls} style={inputSt} autoComplete="email" />
                </div>
                {modo !== "recuperar" && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>Senha</label>
                    <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && modo === "entrar" && submeter()}
                      placeholder={modo === "cadastro" ? "Mínimo de 6 caracteres" : "Sua senha"}
                      className={inputCls} style={inputSt}
                      autoComplete={modo === "cadastro" ? "new-password" : "current-password"} />
                  </div>
                )}
                {modo === "cadastro" && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--az-mut)" }}>Confirmar senha</label>
                    <input type="password" value={senha2} onChange={e => setSenha2(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && submeter()}
                      placeholder="Repita a senha" className={inputCls} style={inputSt} autoComplete="new-password" />
                  </div>
                )}
              </div>

              <button onClick={submeter} disabled={carregando}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-5"
                style={{ background: "var(--az-leaf)", opacity: carregando ? 0.6 : 1 }}>
                {carregando ? "Processando…"
                  : modo === "cadastro" ? "Criar conta e receber confirmação por e-mail"
                  : modo === "entrar" ? "Entrar"
                  : "Enviar link de redefinição"}
              </button>

              {modo === "entrar" && (
                <button onClick={() => { setModo("recuperar"); limpar(); }}
                  className="w-full text-center text-xs mt-3" style={{ color: "var(--az-mut)" }}>
                  Esqueci minha senha
                </button>
              )}
              {modo === "recuperar" && (
                <button onClick={() => { setModo("entrar"); limpar(); }}
                  className="w-full text-center text-xs mt-3" style={{ color: "var(--az-mut)" }}>
                  ← Voltar para o login
                </button>
              )}

              <div className="f-mono text-[10px] mt-5 text-center" style={{ color: "var(--az-mut)" }}>
                supabase auth · confirmação por e-mail · sessão persistente
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
