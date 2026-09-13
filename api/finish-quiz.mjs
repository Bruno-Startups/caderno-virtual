import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function needForLevel(level) {
  return Math.round(100 * Math.pow(level, 1.5));
}

function computeLevel(totalXp) {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= needForLevel(level)) {
    remaining -= needForLevel(level);
    level += 1;
  }
  return { level, currentXp: remaining, neededXp: needForLevel(level) };
}

function xpForResult(correct, total) {
  if (total <= 0) return 0;
  const percent = correct / total;
  let bonus = 0;
  if (percent >= 1) bonus = 150;
  else if (percent >= 0.9) bonus = 100;
  else if (percent >= 0.8) bonus = 75;
  else if (percent >= 0.7) bonus = 50;
  else if (percent >= 0.6) bonus = 30;
  else if (percent >= 0.4) bonus = 15;
  return 50 + bonus;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Servidor de progresso não configurado.' });

  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Não autenticado.' });

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ error: 'Sessão inválida.' });
    const userId = userData.user.id;

    const { attemptId, correct, total } = req.body || {};
    if (!attemptId || typeof correct !== 'number' || typeof total !== 'number' || total <= 0) {
      return res.status(400).json({ error: 'Dados do simulado inválidos.' });
    }

    let { data: progresso } = await supabaseAdmin
      .from('progresso_alunos')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!progresso) {
      const { data: created } = await supabaseAdmin
        .from('progresso_alunos')
        .insert({ user_id: userId, total_xp: 0, total_simulados: 0, total_questoes: 0, total_acertos: 0 })
        .select()
        .single();
      progresso = created;
    }

    const beforeLevel = computeLevel(progresso.total_xp);

    const { error: grantError } = await supabaseAdmin
      .from('xp_grants')
      .insert({ attempt_id: attemptId, user_id: userId, xp_awarded: 0 });

    if (grantError) {
      const afterLevel = computeLevel(progresso.total_xp);
      return res.status(200).json({
        alreadyGranted: true,
        xpAwarded: 0,
        totalXp: progresso.total_xp,
        before: beforeLevel,
        after: afterLevel,
      });
    }

    const xpAwarded = xpForResult(correct, total);
    const newTotalXp = progresso.total_xp + xpAwarded;
    const afterLevel = computeLevel(newTotalXp);

    await supabaseAdmin
      .from('progresso_alunos')
      .update({
        total_xp: newTotalXp,
        total_simulados: progresso.total_simulados + 1,
        total_questoes: progresso.total_questoes + total,
        total_acertos: progresso.total_acertos + correct,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    await supabaseAdmin
      .from('xp_grants')
      .update({ xp_awarded: xpAwarded })
      .eq('attempt_id', attemptId);

    return res.status(200).json({
      alreadyGranted: false,
      xpAwarded,
      totalXp: newTotalXp,
      before: beforeLevel,
      after: afterLevel,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Não foi possível processar o XP.' });
  }
}
