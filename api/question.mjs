const SUBJECT_LIST = ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Física', 'Química', 'Biologia'];

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
    .replace(/\s*\|\s*/g, '\n')
    .replace(/^-{2,}$/gm, '')
    .replace(/[ \t]{2,}/g, ' ');
}

function buildPrompt({ mode, subject, topic, schoolYear, difficulty, institution, similarTo, avoidTopics, avoidStatements }) {
  const modeText = MODE_GUIDANCE[mode] || MODE_GUIDANCE.revisao;
  const difficultyText = DIFFICULTY_LABELS[difficulty] || 'médio';

  const system = `Você é um professor brasileiro especialista em criar questões objetivas originais de múltipla escolha, no estilo de avaliações escolares e vestibulares. Responda em português do Brasil.

REGRA MAIS IMPORTANTE: a questão deve ser 100% ORIGINAL, criada por você agora. NUNCA reproduza, copie ou parafraseie de perto uma questão real de ENEM, vestibular ou livro didático, mesmo que conheça uma parecida — invente um enunciado, contexto e números novos. Não invente fatos, datas, fórmulas ou leis incorretas.

${modeText}

IMPORTANTE — escopo: você só cria questões sobre assuntos do currículo escolar do Fundamental e Ensino Médio no Brasil, dentro de uma das matérias listadas acima (conceitos, eventos, fórmulas, fenômenos, obras, gramática etc.). NÃO é assunto escolar: receitas de culinária, entretenimento, celebridades, jogos, produtos, opiniões pessoais, ou qualquer tópico do dia a dia que não seja tradicionalmente ensinado em sala de aula. Se o assunto pedido não for um tema escolar de verdade, responda EXATAMENTE e apenas com esta linha, sem nenhuma outra marcação:

FORA_DE_ESCOPO: <explique em uma frase curta e gentil que esse não é um assunto escolar, e sugira reformular>

FÓRMULAS E CÁLCULOS: escreva em texto simples (√, ², ³, ×, ÷, ±) — nunca em LaTeX ou comandos com barra invertida.

DADOS EM TABELA: se a questão precisar apresentar dados (região, ano, valor, etc.), NUNCA use tabela em Markdown (nunca use o caractere | nem linhas de traços tipo ---). Em vez disso, escreva cada item como uma linha de texto simples, assim: "Norte: 1.560.000 km², 18,5 milhões de habitantes." — um item por linha.

A questão deve ter exatamente 5 alternativas (A a E), com apenas UMA correta e sem ambiguidade entre as outras quatro. Confira os cálculos e a lógica antes de responder.

Responda EXATAMENTE neste formato, com as marcações em linhas próprias, sem nada além disso:

MATERIA: <a matéria correta para esta questão, escolhida apenas entre: ${SUBJECT_LIST.join(', ')}. Se a matéria já foi informada corretamente, repita ela mesma>

ASSUNTO: <o assunto exato abordado nesta questão. Se o assunto já foi informado, repita-o de forma limpa; se não foi informado, escolha você mesmo um assunto específico e relevante dentro da matéria>

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

  let user = `Matéria/área: ${subject || 'não informada — identifique você mesmo a mais adequada'}\nAssunto: ${topic || 'não informado — escolha você mesmo um assunto específico dentro da matéria'}\nAno escolar/nível: ${schoolYear || 'não informado, calibre um nível intermediário'}\nDificuldade desejada: ${difficultyText}`;
  if (institution) user += `\nEstilo de referência (aproximado, não oficial): ${institution}`;
  if (!topic && Array.isArray(avoidTopics) && avoidTopics.length > 0) {
    user += `\n\nJá foram usados nesta sessão os seguintes assuntos, dentro da mesma matéria: ${avoidTopics.join(', ')}. Escolha um assunto DIFERENTE desses, ainda dentro da matéria informada, para variar o simulado.`;
  }
  if (Array.isArray(avoidStatements) && avoidStatements.length > 0) {
    const shortened = avoidStatements.slice(-15).map((text) => text.length > 160 ? `${text.slice(0, 157)}...` : text);
    user += `\n\nEstas questões já foram usadas antes para este aluno nesta matéria — NÃO repita nenhuma delas nem crie uma questão muito parecida (mesmo contexto/números), mesmo que o assunto seja o mesmo:\n- ${shortened.join('\n- ')}`;
  }
  if (similarTo) user += `\n\nO aluno errou uma questão parecida com esta anteriormente: "${similarTo}". Crie uma NOVA questão sobre o mesmo assunto e mesma dificuldade, com contexto e números diferentes, para reforçar o mesmo conceito.`;

  return { system, user };
}

function parseQuestion(raw, fallbackSubject, fallbackTopic) {
  const materiaMatch = raw.match(/MATERIA:\s*(.+?)\s*\n/i);
  const assuntoMatch = raw.match(/ASSUNTO:\s*(.+?)\s*\n/i);
  const habilidadeMatch = raw.match(/HABILIDADE:\s*(.+?)\s*\n/i);
  const enunciadoMatch = raw.match(/ENUNCIADO:\s*\n([\s\S]*?)\n\s*A\)/i);
  if (!enunciadoMatch) return null;

  const afterEnunciado = raw.slice(enunciadoMatch.index + enunciadoMatch[0].length - 2);

  const altABlock = afterEnunciado.match(/A\)\s*([\s\S]*?)\nB\)\s*([\s\S]*?)\nC\)\s*([\s\S]*?)\nD\)\s*([\s\S]*?)\nE\)\s*([\s\S]*?)\n\s*GABARITO:/i);
  const gabaritoMatch = afterEnunciado.match(/GABARITO:\s*([A-E])/i);
  const explCorretaMatch = afterEnunciado.match(/EXPLICACAO_CORRETA:\s*\n([\s\S]*?)\n\s*EXPLICACAO_ERRADAS:/i);
  const explErradasMatch = afterEnunciado.match(/EXPLICACAO_ERRADAS:\s*\n([\s\S]*?)\n\s*ERRO_COMUM:/i);
  const erroComumMatch = afterEnunciado.match(/ERRO_COMUM:\s*(.+?)\s*\n/i);
  const dicaMatch = afterEnunciado.match(/DICA:\s*([\s\S]*)$/i);

  if (!altABlock || !gabaritoMatch || !explCorretaMatch) return null;

  const letters = ['A', 'B', 'C', 'D', 'E'];
  const alternatives = letters.map((letter, index) => ({
    id: letter,
    text: sanitizeMath(altABlock[index + 1].trim()),
  }));

  const looksMalformed = alternatives.some((alt) =>
    alt.text.length > 220 || /HABILIDADE:|ENUNCIADO:|MATERIA:|ASSUNTO:/i.test(alt.text)
  );
  if (looksMalformed) return null;

  const correctId = gabaritoMatch[1].toUpperCase();
  if (!letters.includes(correctId)) return null;

  const wrongExplanationsRaw = explErradasMatch ? explErradasMatch[1] : '';
  const wrongExplanations = {};
  letters.forEach((letter) => {
    const match = wrongExplanationsRaw.match(new RegExp(`${letter}\\)\\s*(.+?)(?=\\n[A-E]\\)|$)`, 's'));
    if (match) wrongExplanations[letter] = sanitizeMath(match[1].trim());
  });

  const detectedSubject = materiaMatch ? materiaMatch[1].trim() : '';
  const subject = SUBJECT_LIST.includes(detectedSubject) ? detectedSubject : (fallbackSubject || SUBJECT_LIST[0]);
  const topic = assuntoMatch ? sanitizeMath(assuntoMatch[1].trim()) : (fallbackTopic || '');

  return {
    subject,
    topic,
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
      max_tokens: 2000,
      temperature: 0.4,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Falha ao consultar a IA.');
    if (response.status === 429) error.isRateLimit = true;
    throw error;
  }
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error('A IA não retornou conteúdo.');
  return raw;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'A chave da IA ainda não foi configurada.' });
  try {
    const { mode, subject, topic, schoolYear, difficulty, institution, similarTo, avoidTopics, avoidStatements } = req.body || {};
    if (!subject && !topic) return res.status(400).json({ error: 'Escolha uma matéria ou digite um assunto.' });

    const { system, user } = buildPrompt({ mode, subject, topic, schoolYear, difficulty, institution, similarTo, avoidTopics, avoidStatements });

    let parsed = null;
    let lastError = null;
    let outOfScopeMessage = null;
    for (let attempt = 0; attempt < 3 && !parsed && !outOfScopeMessage; attempt += 1) {
      try {
        const raw = await callGroq(system, user);
        const outOfScopeMatch = raw.match(/^FORA_DE_ESCOPO:\s*(.+)$/im);
        if (outOfScopeMatch) {
          outOfScopeMessage = outOfScopeMatch[1].trim();
          break;
        }
        parsed = parseQuestion(raw, subject, topic);
      } catch (attemptError) {
        lastError = attemptError;
        if (attempt < 2) await sleep(attemptError.isRateLimit ? 2000 : 800);
      }
    }
    if (outOfScopeMessage) {
      return res.status(422).json({ error: outOfScopeMessage });
    }
    if (!parsed) {
      const message = lastError?.isRateLimit
        ? 'A IA está com muita gente usando agora (limite gratuito). Tenta de novo em alguns segundos.'
        : (lastError?.message || 'Não foi possível gerar uma questão válida agora. Tente novamente.');
      throw new Error(message);
    }

    return res.status(200).json({
      mode: mode || 'revisao',
      difficulty: difficulty || 'medio',
      aiGenerated: true,
      ...parsed,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Não foi possível gerar a questão agora.' });
  }
}
