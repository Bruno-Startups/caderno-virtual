const MODE_GUIDANCE = {
  enem: `Modo ENEM. Priorize: contextualização, interpretação de texto, gráficos/tabelas/dados quando fizer sentido, situações-problema do cotidiano, raciocínio em vez de memorização pura, e possibilidade de interdisciplinaridade. Use uma linguagem parecida com a de uma avaliação nacional brasileira, mas NUNCA copie ou parafraseie de perto uma questão oficial real — crie um enunciado inteiramente original. Se fizer sentido, descreva em HABILIDADE a competência trabalhada (em texto livre, nunca invente um código oficial de habilidade da matriz).`,
  vestibular: `Modo Vestibular. Crie uma questão objetiva original com nível de dificuldade e formato aproximados ao de vestibulares brasileiros em geral. NÃO copie nem reproduza questões de nenhuma instituição específica, mesmo que o aluno tenha mencionado uma. O estilo é uma aproximação, nunca uma reprodução oficial.`,
  escolar: `Modo Prova escolar. Use linguagem adequada ao ano escolar informado. Prefira questões diretas e de aplicação direta do conteúdo, coerentes com o que normalmente cai em avaliações de sala de aula — evite o nível e a complexidade de um vestibular.`,
  revisao: `Modo Revisão geral. Crie uma questão de fixação equilibrada, focada em consolidar o entendimento do assunto, sem se preocupar em imitar o estilo de uma prova específica.`,
};

const DIFFICULTY_LABELS = { facil: 'fácil', medio: 'médio', dificil: 'difícil' };

function sanitizeMath(text) {
  if (!text) return text;
  return text
    .replace(/\\displaystyle/g, '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1/$2)')
    .replace(/\^\{2\}/g, '²')
    .replace(/\^\{3\}/g, '³')
    .replace(/\^\{([^{}]*)\}/g, '^$1')
    .replace(/_\{([^{}]*)\}/g, '_$1')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, '')
    .replace(/\${1,2}/g, '')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/\{([^{}]*)\}/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

function buildPrompt({ mode, subject, topic, schoolYear, difficulty, institution, similarTo }) {
  const modeText = MODE_GUIDANCE[mode] || MODE_GUIDANCE.revisao;
  const difficultyText = DIFFICULTY_LABELS[difficulty] || 'médio';

  const system = `Você é um professor brasileiro especialista em criar questões objetivas originais de múltipla escolha, no estilo de avaliações escolares e vestibulares. Responda em português do Brasil.

REGRA MAIS IMPORTANTE: a questão deve ser 100% ORIGINAL, criada por você agora. NUNCA reproduza, copie ou parafraseie de perto uma questão real de ENEM, vestibular ou livro didático, mesmo que conheça uma parecida — invente um enunciado, contexto e números novos. Não invente fatos, datas, fórmulas ou leis incorretas.

${modeText}

FÓRMULAS E CÁLCULOS: escreva em texto simples (√, ², ³, ×, ÷, ±) — nunca em LaTeX ou comandos com barra invertida.

A questão deve ter exatamente 5 alternativas (A a E), com apenas UMA correta e sem ambiguidade entre as outras quatro. Confira os cálculos e a lógica antes de responder.

Responda EXATAMENTE neste formato, com as marcações em linhas próprias, sem nada além disso:

HABILIDADE: <descreva em uma frase a habilidade/competência trabalhada, ou escreva "Não aplicável" se não fizer sentido>

ENUNCIADO:
<enunciado completo, pode ter 2 a 6 linhas de contexto quando fizer sentido>

A) <alternativa>
B) <alternativa>
C) <alternativa>
D) <alternativa>
E) <alternativa>

GABARITO: <apenas a letra da alternativa correta, ex.: C>

EXPLICACAO_CORRETA:
<explique por que a alternativa correta está certa, com raciocínio passo a passo quando envolver cálculo>

EXPLICACAO_ERRADAS:
A) <por que essa alternativa está errada, ou "Correta" se for a letra do gabarito>
B) <...>
C) <...>
D) <...>
E) <...>

ERRO_COMUM: <um erro de raciocínio comum que leva a marcar uma alternativa errada>

DICA: <uma dica curta que ajuda sem entregar a resposta>`;

  let user = `Matéria/área: ${subject}\nAssunto: ${topic}\nAno escolar/nível: ${schoolYear || 'não informado, calibre um nível intermediário'}\nDificuldade desejada: ${difficultyText}`;
  if (institution) user += `\nEstilo de referência (aproximado, não oficial): ${institution}`;
  if (similarTo) user += `\n\nO aluno errou uma questão parecida com esta anteriormente: "${similarTo}". Crie uma NOVA questão sobre o mesmo assunto e mesma dificuldade, com contexto e números diferentes, para reforçar o mesmo conceito.`;

  return { system, user };
}

function parseQuestion(raw) {
  const habilidadeMatch = raw.match(/HABILIDADE:\s*(.+?)\s*\n/i);
  const enunciadoMatch = raw.match(/ENUNCIADO:\s*\n([\s\S]*?)\n\s*A\)/i);
  const altABlock = raw.match(/A\)\s*([\s\S]*?)\nB\)\s*([\s\S]*?)\nC\)\s*([\s\S]*?)\nD\)\s*([\s\S]*?)\nE\)\s*([\s\S]*?)\n\s*GABARITO:/i);
  const gabaritoMatch = raw.match(/GABARITO:\s*([A-E])/i);
  const explCorretaMatch = raw.match(/EXPLICACAO_CORRETA:\s*\n([\s\S]*?)\n\s*EXPLICACAO_ERRADAS:/i);
  const explErradasMatch = raw.match(/EXPLICACAO_ERRADAS:\s*\n([\s\S]*?)\n\s*ERRO_COMUM:/i);
  const erroComumMatch = raw.match(/ERRO_COMUM:\s*(.+?)\s*\n/i);
  const dicaMatch = raw.match(/DICA:\s*([\s\S]*)$/i);

  if (!enunciadoMatch || !altABlock || !gabaritoMatch || !explCorretaMatch) return null;

  const letters = ['A', 'B', 'C', 'D', 'E'];
  const alternatives = letters.map((letter, index) => ({
    id: letter,
    text: sanitizeMath(altABlock[index + 1].trim()),
  }));

  const correctId = gabaritoMatch[1].toUpperCase();
  if (!letters.includes(correctId)) return null;

  const wrongExplanationsRaw = explErradasMatch ? explErradasMatch[1] : '';
  const wrongExplanations = {};
  letters.forEach((letter) => {
    const match = wrongExplanationsRaw.match(new RegExp(`${letter}\\)\\s*(.+?)(?=\\n[A-E]\\)|$)`, 's'));
    if (match) wrongExplanations[letter] = sanitizeMath(match[1].trim());
  });

  return {
    skill: habilidadeMatch ? sanitizeMath(habilidadeMatch[1].trim()) : '',
    statement: sanitizeMath(enunciadoMatch[1].trim()),
    alternatives,
    correctId,
    correctExplanation: sanitizeMath(explCorretaMatch[1].trim()),
    wrongExplanations,
    commonMistake: erroComumMatch ? sanitizeMath(erroComumMatch[1].trim()) : '',
    hint: dicaMatch ? sanitizeMath(dicaMatch[1].trim()) : '',
  };
}

async function callGroq(system, user) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: 1200,
      temperature: 0.4,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Falha ao consultar a IA.');
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('A IA não retornou conteúdo.');
  return raw;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'A chave da IA ainda não foi configurada.' });
  try {
    const { mode, subject, topic, schoolYear, difficulty, institution, similarTo } = req.body || {};
    if (!subject || !topic) return res.status(400).json({ error: 'Escolha uma matéria e um assunto.' });

    const { system, user } = buildPrompt({ mode, subject, topic, schoolYear, difficulty, institution, similarTo });

    let parsed = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt += 1) {
      const raw = await callGroq(system, user);
      parsed = parseQuestion(raw);
    }
    if (!parsed) throw new Error('Não foi possível gerar uma questão válida agora. Tente novamente.');

    return res.status(200).json({
      mode: mode || 'revisao',
      subject,
      topic,
      difficulty: difficulty || 'medio',
      aiGenerated: true,
      ...parsed,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Não foi possível gerar a questão agora.' });
  }
}
