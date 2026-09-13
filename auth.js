// auth.js — autenticação via Supabase (email/senha + Google)
// Requer: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> no HTML antes deste arquivo

const SUPABASE_URL = "https://wmtjltnagzgwpypjqdtu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OVc4BkuMJBPU2aa0EatxOw_fYxNpja8";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioAtual = null;

// ---------- Estado inicial ----------
async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  usuarioAtual = session?.user ?? null;
  atualizarUI();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    usuarioAtual = session?.user ?? null;
    atualizarUI();
  });
}

function atualizarUI() {
  const areaLogado = document.getElementById("area-logado");
  const areaDeslogado = document.getElementById("area-deslogado");
  if (!areaLogado || !areaDeslogado) return;

  if (usuarioAtual) {
    areaLogado.style.display = "flex";
    areaDeslogado.style.display = "none";
    const nomeEl = document.getElementById("nome-usuario");
    if (nomeEl) nomeEl.textContent = usuarioAtual.email;
    if (typeof baixarHistoricoDaNuvem === "function") baixarHistoricoDaNuvem();
    if (typeof carregarProgresso === "function") carregarProgresso();
  } else {
    areaLogado.style.display = "none";
    areaDeslogado.style.display = "flex";
  }
}

// ---------- Cadastro ----------
async function cadastrar(email, senha) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  return { ok: true, precisaConfirmarEmail: !data.session };
}

// ---------- Login email/senha ----------
async function login(email, senha) {
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  return { ok: true };
}

// ---------- Login Google (ativar depois de configurar o provider no Supabase) ----------
async function loginComGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
  if (error) alert("Erro ao entrar com Google: " + error.message);
}

// ---------- Logout ----------
async function logout() {
  await supabaseClient.auth.signOut();
}

// ---------- Recuperar senha ----------
async function recuperarSenha(email) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  return { ok: true };
}

function traduzirErro(msg) {
  const mapa = {
    "Invalid login credentials": "Email ou senha incorretos.",
    "User already registered": "Esse email já tem cadastro. Tenta entrar.",
    "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres.",
    "Email not confirmed": "Confirma seu email antes de entrar (checa a caixa de entrada)."
  };
  return mapa[msg] || msg;
}

// ---------- Histórico ligado ao usuário ----------
async function salvarNoHistorico(materia, topico, tipo, dadosJson) {
  if (!usuarioAtual) return;
  await supabaseClient.from("historico").insert({
    user_id: usuarioAtual.id,
    materia, topico, tipo,
    dados: dadosJson
  });
}

async function carregarHistoricoDoBanco() {
  if (!usuarioAtual) return [];
  const { data, error } = await supabaseClient
    .from("historico")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function apagarDoHistorico(id) {
  await supabaseClient.from("historico").delete().eq("id", id);
}

async function apagarHistoricoPorTopico(materia, topico, tipo) {
  if (!usuarioAtual) return;
  await supabaseClient.from("historico").delete()
    .eq("materia", materia).eq("topico", topico).eq("tipo", tipo);
}

async function apagarHistoricoPorMateria(materia, tipo) {
  if (!usuarioAtual) return;
  await supabaseClient.from("historico").delete()
    .eq("materia", materia).eq("tipo", tipo);
}

async function apagarHistoricoPorTipo(tipo) {
  if (!usuarioAtual) return;
  await supabaseClient.from("historico").delete().eq("tipo", tipo);
}

// ---------- Progressão (XP/nível) — somente leitura pelo cliente; gravação é feita pelo servidor ----------
async function getAccessToken() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session?.access_token || null;
}

async function buscarProgressoNoBanco() {
  if (!usuarioAtual) return null;
  const { data, error } = await supabaseClient
    .from("progresso_alunos")
    .select("*")
    .eq("user_id", usuarioAtual.id)
    .maybeSingle();
  if (error) { console.warn("Não foi possível carregar o progresso:", error); return null; }
  return data || { total_xp: 0, total_simulados: 0, total_questoes: 0, total_acertos: 0 };
}

async function enviarResultadoSimulado(attemptId, correct, total) {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const response = await fetch("/api/finish-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ attemptId, correct, total }),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.warn("Não foi possível registrar o XP do simulado:", error);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", initAuth);
