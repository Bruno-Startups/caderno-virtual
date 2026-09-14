const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

const MATERIAS = [
  "Matemática","Português","História","Geografia","Ciências",
  "Inglês","Física","Química","Biologia"
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parse(texto) {
  const materia = (texto.match(/MATERIA:\s*(.+)/i)?.[1] || "").trim();
  const titulo = (texto.match(/TITULO:\s*(.+)/i)?.[1] || "").trim();
  return { materia, titulo };
}

async function chamarGroq(prompt, tentativa = 0) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Você identifica a matéria escolar e cria um título curto para uma prova, a partir da lista de tópicos do aluno brasileiro (Fundamental/Médio). " +
            `A matéria deve ser exatamente uma destas: ${MATERIAS.join(", ")}. ` +
            "O título deve ter no máximo 6 palavras, sem aspas, sem a palavra 'Prova'. " +
            "Responda SOMENTE neste formato, sem mais nada:\nMATERIA: <matéria>\nTITULO: <título>"
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (res.status === 429 && tentativa < 2) {
    await sleep(1200 * (tentativa + 1));
    return chamarGroq(prompt, tentativa + 1);
  }
  if (!res.ok) throw new Error(`Groq ${res.status}`);

  const data = await res.json();
  const texto = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!texto && tentativa < 2) {
    await sleep(800);
    return chamarGroq(prompt, tentativa + 1);
  }
  return texto;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Método não permitido" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const topicos = Array.isArray(body.topicos) ? body.topicos : [];
    const materiaEscolhida = (body.materia || "").trim();

    const limpos = topicos.map((t) => String(t).trim()).filter(Boolean);

    if (limpos.length === 0) {
      return res.status(400).json({ erro: "SEM_TOPICOS" });
    }

    const caracteres = limpos.join(" ").length;
    if (limpos.length < 2 && caracteres < 12) {
      return res.status(200).json({
        materia: materiaEscolhida || null,
        titulo: materiaEscolhida ? `Prova de ${materiaEscolhida}` : null,
        incerto: !materiaEscolhida
      });
    }

    const texto = await chamarGroq(`Tópicos da prova:\n- ${limpos.join("\n- ")}`);
    const { materia, titulo } = parse(texto);

    const materiaValida = MATERIAS.find(
      (m) => m.toLowerCase() === materia.toLowerCase()
    );

    const materiaFinal = materiaEscolhida || materiaValida || null;

    return res.status(200).json({
      materia: materiaFinal,
      titulo: titulo || (materiaFinal ? `Prova de ${materiaFinal}` : "Minha prova"),
      incerto: !materiaFinal
    });
  } catch (e) {
    return res.status(500).json({ erro: "FALHA_DETECCAO", detalhe: String(e.message || e) });
  }
}
