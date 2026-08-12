import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";
import { Perfil, Setor } from "./data";

// ── Configuração ──────────────────────────────────────────────────
// URL do seu projeto (já preenchida). A anon key é pública por design
// (a segurança vem das políticas RLS) — copie em:
// Painel Supabase → Settings → API Keys → anon / public
export const SUPABASE_URL = "https://wuuijbetsckjusnvdxts.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWlqYmV0c2NranVzbnZkeHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjAwODAsImV4cCI6MjEwMTUzNjA4MH0.VzHyjS2goE1tX0udysdjnuXcfym39jPkJWc3j-xFYbA";

let _client: SupabaseClient | null = null;

export function supabaseConfigurado(chaveRuntime?: string): boolean {
  return Boolean(SUPABASE_ANON_KEY || chaveRuntime);
}

export function getSupabase(chaveRuntime?: string): SupabaseClient {
  if (!_client) {
    const key = SUPABASE_ANON_KEY || chaveRuntime;
    if (!key) throw new Error("Anon key do Supabase não configurada.");
    _client = createClient(SUPABASE_URL, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _client;
}

// ── Tipos ─────────────────────────────────────────────────────────
export interface PerfilDB {
  id: string;
  email: string;
  nome: string;
  perfil: Perfil;
  setor: Setor | null;
  telefone: string | null;
  online: boolean;
  criado_em: string;
}

// ── Autenticação ──────────────────────────────────────────────────
export async function cadastrar(sb: SupabaseClient, nome: string, email: string, senha: string) {
  const { data, error } = await sb.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } }, // o trigger handle_novo_usuario lê este campo
  });
  if (error) throw error;
  // Se "Confirm email" estiver ativo, session vem null até o clique no link
  return { precisaConfirmar: !data.session, user: data.user };
}

export async function entrar(sb: SupabaseClient, email: string, senha: string) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data.session;
}

export async function recuperarSenha(sb: SupabaseClient, email: string) {
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function sair(sb: SupabaseClient) {
  await sb.auth.signOut();
}

// ── Perfis ────────────────────────────────────────────────────────
export async function buscarPerfil(sb: SupabaseClient, id: string): Promise<PerfilDB | null> {
  const { data, error } = await sb.from("perfis").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as PerfilDB | null;
}

export async function listarEquipe(sb: SupabaseClient): Promise<PerfilDB[]> {
  const { data, error } = await sb.from("perfis").select("*").order("criado_em");
  if (error) throw error;
  return (data ?? []) as PerfilDB[];
}

export async function salvarPerfil(
  sb: SupabaseClient, id: string,
  patch: Partial<Pick<PerfilDB, "nome" | "telefone" | "setor" | "online" | "perfil">>,
) {
  const { error } = await sb.from("perfis").update(patch).eq("id", id);
  if (error) throw error;
}

/** Remove membro da equipe (apenas admin). Apaga auth.users + perfil em cascata. */
export async function removerMembro(sb: SupabaseClient, targetId: string) {
  const { error } = await sb.rpc("remover_membro", { target_id: targetId });
  if (error) throw error;
}

export function aoMudarSessao(sb: SupabaseClient, cb: (s: Session | null) => void) {
  sb.auth.getSession().then(({ data }) => cb(data.session));
  const { data } = sb.auth.onAuthStateChange((_ev, s) => cb(s));
  return () => data.subscription.unsubscribe();
}

// Traduz erros comuns do Supabase Auth para pt-BR
export function traduzErro(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  const mapa: [string, string][] = [
    ["Invalid login credentials", "E-mail ou senha incorretos."],
    ["Email not confirmed", "E-mail ainda não confirmado. Verifique sua caixa de entrada."],
    ["User already registered", "Este e-mail já possui cadastro. Use a aba Entrar."],
    ["Password should be at least", "A senha precisa ter no mínimo 6 caracteres."],
    ["valid email", "Informe um e-mail válido."],
    ["rate limit", "Muitas tentativas. Aguarde um instante e tente novamente."],
  ];
  for (const [en, pt] of mapa) if (m.includes(en)) return pt;
  return m;
}
