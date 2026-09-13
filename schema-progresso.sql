-- Rodar no Supabase: SQL Editor > New query
-- Sistema de XP/nível: totalmente separado do histórico (historico pode ser apagado sem afetar isso)

create table if not exists public.progresso_alunos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  total_simulados integer not null default 0,
  total_questoes integer not null default 0,
  total_acertos integer not null default 0,
  updated_at timestamptz default now()
);

alter table public.progresso_alunos enable row level security;

create policy "usuario ve o proprio progresso"
  on public.progresso_alunos for select
  using (auth.uid() = user_id);

-- Nenhuma policy de insert/update para o cliente: só o servidor (service role) grava XP.
-- Isso impede o aluno de alterar totalXP direto pelo DevTools/frontend.

-- Registro de cada simulado que já concedeu XP (evita XP duplicado se a página for atualizada)
create table if not exists public.xp_grants (
  attempt_id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  xp_awarded integer not null,
  created_at timestamptz default now()
);

alter table public.xp_grants enable row level security;

create policy "usuario ve os proprios grants"
  on public.xp_grants for select
  using (auth.uid() = user_id);
