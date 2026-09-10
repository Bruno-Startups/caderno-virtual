const SYSTEM_PROMPT = `Você é um professor brasileiro criando exercícios de fixação. Responda em português do Brasil, no nível da turma indicada. Não invente fatos. Não use Markdown nem HTML, exceto **negrito** para destacar.

Crie exatamente 5 exercícios sobre o assunto pedido, adequados ao ano escolar. Responda exatamente neste formato, repetido 5 vezes, sem numerar você mesmo:

P: <pergunta>
R: <resposta correta, explicada de forma curta>

(linha em branco entre cada par P/R)`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'A chave da IA ainda não foi configurada.' });
  try {
    const { subject, schoolYear, topic } = req.body || {};
    if (!subject || !topic) return res.status(400).json({ error: 'Dados insuficientes para gerar exercícios.' });

    const userPrompt = `Ano escolar: ${schoolYear || 'nível intermediário, 9º ano ao 1º ano do Ensino Médio'}\nMatéria: ${subject}\nAssunto: ${topic}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userPrompt }],
        max_tokens: 1100,
      }),
    });
    const data = await groqResponse.json();
    if (!groqResponse.ok) throw new Error(data.error?.message || 'Falha ao consultar a IA.');

    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('A IA não retornou exercícios.');

    const pairs = [...raw.matchAll(/P:\s*(.+?)\s*\nR:\s*([\s\S]*?)(?=\n\s*\n|\n?P:|$)/gi)];
    const exercises = pairs.map((match) => ({ question: match[1].trim(), answer: match[2].trim() })).filter((exercise) => exercise.question && exercise.answer);

    if (exercises.length === 0) throw new Error('Não foi possível organizar os exercícios gerados.');

    return res.status(200).json({ exercises });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Não foi possível gerar exercícios.' });
  }
}
