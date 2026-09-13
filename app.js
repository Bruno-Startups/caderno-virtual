const introOverlay = document.querySelector('#intro-overlay');
if (introOverlay) {
  introOverlay.addEventListener('animationend', (event) => {
    if (event.animationName === 'intro-fade-out') introOverlay.remove();
  });
  window.setTimeout(() => introOverlay.remove(), 3000);
}

const form = document.querySelector('#study-form');
const topicInput = document.querySelector('#topic');
const submitButton = document.querySelector('#submit-button');
const answer = document.querySelector('#answer');
const answerTitle = document.querySelector('#answer-title');
const answerMeta = document.querySelector('#answer-meta');
const summaryList = document.querySelector('#summary-list');
const explanationContent = document.querySelector('#explanation-content');
const imagesGrid = document.querySelector('#images-grid');
const imagesEmpty = document.querySelector('#images-empty');
const historyList = document.querySelector('#history-list');
const clearHistory = document.querySelector('#clear-history');
const newQuestion = document.querySelector('#new-question');
const generateExercisesBtn = document.querySelector('#generate-exercises');
const exercisesSection = document.querySelector('#exercises');
const exercisesList = document.querySelector('#exercises-list');
const exercisesClose = document.querySelector('#exercises-close');

const mainTabs = document.querySelectorAll('.main-tab');
const mainPanes = document.querySelectorAll('.main-tab-pane');

function setMainTab(name) {
  mainTabs.forEach((tab) => {
    const isActive = tab.dataset.maintab === name;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });
  mainPanes.forEach((pane) => pane.classList.toggle('active', pane.dataset.mainpane === name));
  document.body.classList.toggle('maintab-simulados', name === 'simulados');
  clearHistory.dataset.mode = name;
  const historyCaption = document.querySelector('#history-caption');
  if (name === 'simulados') {
    historyCaption.textContent = 'Seu desempenho nos simulados, salvo neste aparelho.';
    applySubjectColor(quizSelectedSubject);
    renderQuizSidebarHistory();
  } else {
    historyCaption.textContent = 'Seus assuntos ficam salvos por matéria, neste aparelho.';
    applySubjectColor(form.elements.subject.value);
    renderHistory();
  }
}

mainTabs.forEach((tab) => tab.addEventListener('click', () => setMainTab(tab.dataset.maintab)));
clearHistory.dataset.mode = 'estudo';

document.querySelectorAll('[data-maintab-trigger]').forEach((el) => {
  el.addEventListener('click', () => {
    setMainTab(el.dataset.maintabTrigger);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

const storageKey = 'caderno-virtual-history-v4';
let currentItem = null;

const SUBJECT_COLORS = {
  'Matemática': { color: '#1f66b2', soft: '#eaf3ff' },
  'Português': { color: '#b6424e', soft: '#fbeaec' },
  'História': { color: '#c9821e', soft: '#fbf0e1' },
  'Geografia': { color: '#2f9e6a', soft: '#e7f7ef' },
  'Ciências': { color: '#0f9b8e', soft: '#e4f8f5' },
  'Inglês': { color: '#7c5cd6', soft: '#f0ecfc' },
  'Física': { color: '#4a5fd1', soft: '#eceffc' },
  'Química': { color: '#c94f9c', soft: '#fbebf5' },
  'Biologia': { color: '#3f8f4f', soft: '#eaf6ec' },
};

const EXAMPLE_TOPICS = {
  'Matemática': ['Equação de 1º grau', 'Frações', 'Teorema de Pitágoras'],
  'Português': ['Figuras de linguagem', 'Concordância verbal', 'Interpretação de texto'],
  'História': ['Revolução Francesa', 'Segunda Guerra Mundial', 'Brasil Colônia'],
  'Geografia': ['Placas tectônicas', 'Globalização', 'Clima do Brasil'],
  'Ciências': ['Fotossíntese', 'Sistema solar', 'Ciclo da água'],
  'Inglês': ['Present perfect', 'Verbos irregulares', 'Falsos cognatos'],
  'Física': ['Leis de Newton', 'Energia cinética', 'Circuitos elétricos'],
  'Química': ['Tabela periódica', 'Ligações químicas', 'Reações ácido-base'],
  'Biologia': ['Célula animal', 'Genética', 'Evolução das espécies'],
  '': ['Equação de 1º grau', 'Revolução Francesa', 'Fotossíntese', 'Present perfect'],
};

function applySubjectColor(subject) {
  const palette = SUBJECT_COLORS[subject];
  document.documentElement.style.setProperty('--blue', palette ? palette.color : '#1f66b2');
  document.documentElement.style.setProperty('--blue-soft', palette ? palette.soft : '#eaf3ff');
}

function renderHeroSubjects() {
  const container = document.querySelector('#hero-subjects');
  container.innerHTML = Object.keys(SUBJECT_COLORS).map((subject) => {
    const palette = SUBJECT_COLORS[subject];
    return `<button type="button" class="subject-pill" data-subject="${subject}" style="--pill-bg:${palette.soft}; --pill-fg:${palette.color}"><span class="dot"></span>${subject}</button>`;
  }).join('');
  container.addEventListener('click', (event) => {
    const pill = event.target.closest('.subject-pill');
    if (!pill) return;
    form.elements.subject.value = pill.dataset.subject;
    applySubjectColor(pill.dataset.subject);
    renderTopicChips(pill.dataset.subject);
    updateActivePill();
    topicInput.focus();
  });
}

function updateActivePill(animate = false) {
  const current = form.elements.subject.value;
  document.querySelectorAll('.subject-pill').forEach((pill) => {
    const isActive = pill.dataset.subject === current;
    pill.classList.toggle('active', isActive);
    if (isActive && animate) {
      pill.classList.remove('pill-auto-detect');
      void pill.offsetWidth;
      pill.classList.add('pill-auto-detect');
    }
  });
}

function renderTopicChips(subject) {
  const container = document.querySelector('#topic-chips');
  const topics = EXAMPLE_TOPICS[subject] || EXAMPLE_TOPICS[''];
  container.innerHTML = topics.map((topic) => `<button type="button" class="topic-chip">${escapeHtml(topic)}</button>`).join('');
}

document.querySelector('#topic-chips').addEventListener('click', (event) => {
  const chip = event.target.closest('.topic-chip');
  if (!chip) return;
  topicInput.value = chip.textContent;
  topicInput.focus();
});

form.elements.subject.addEventListener('change', () => {
  applySubjectColor(form.elements.subject.value);
  renderTopicChips(form.elements.subject.value);
  updateActivePill();
});

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' })[character]);
const bold = (text) => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('O servidor demorou muito ou está instável agora. Tenta de novo em instantes.');
  }
  return response.json();
}

/* ===== Sincronização com a conta (Supabase) =====
   Quando o usuário está logado (usuarioAtual definido em auth.js), cada item novo
   também é enviado pra nuvem. Ao logar em outro aparelho, o histórico do banco é
   baixado e mesclado com o que já existe no localStorage daquele aparelho. */

function estaLogado() {
  return typeof usuarioAtual !== 'undefined' && usuarioAtual;
}

function sincronizarEstudoNaNuvem(item) {
  if (!estaLogado() || typeof salvarNoHistorico !== 'function') return;
  salvarNoHistorico(item.subject, item.topic, 'estudo', item).catch((error) => {
    console.warn('Não foi possível sincronizar o estudo com a conta:', error);
  });
}

function sincronizarQuizNaNuvem(record) {
  if (!estaLogado() || typeof salvarNoHistorico !== 'function') return;
  salvarNoHistorico(record.subject, record.topic, 'questao', record).catch((error) => {
    console.warn('Não foi possível sincronizar o simulado com a conta:', error);
  });
}

async function baixarHistoricoDaNuvem() {
  if (!estaLogado() || typeof carregarHistoricoDoBanco !== 'function') return;
  try {
    const registros = await carregarHistoricoDoBanco();
    if (!Array.isArray(registros) || registros.length === 0) return;

    const estudoHistory = getHistory();
    const quizHistoryAtual = getQuizHistory();
    let estudoMudou = false;
    let quizMudou = false;

    registros.forEach((registro) => {
      if (registro.tipo === 'estudo') {
        const item = registro.dados;
        if (!item || !item.subject || !item.topic) return;
        if (!estudoHistory[item.subject]) estudoHistory[item.subject] = [];
        const normalizedNew = normalizeTopic(item.topic);
        const jaExiste = estudoHistory[item.subject].some((saved) => normalizeTopic(saved.topic) === normalizedNew);
        if (!jaExiste) {
          estudoHistory[item.subject].unshift(item);
          estudoMudou = true;
        }
      } else if (registro.tipo === 'questao') {
        const record = registro.dados;
        if (!record) return;
        const jaExiste = quizHistoryAtual.some((saved) => saved.statement === record.statement && saved.date === record.date);
        if (!jaExiste) {
          quizHistoryAtual.push(record);
          quizMudou = true;
        }
      }
    });

    if (estudoMudou) {
      Object.keys(estudoHistory).forEach((subject) => { estudoHistory[subject] = estudoHistory[subject].slice(0, 15); });
      localStorage.setItem(storageKey, JSON.stringify(estudoHistory));
    }
    if (quizMudou) {
      quizHistoryAtual.sort((a, b) => new Date(b.date) - new Date(a.date));
      localStorage.setItem(quizStorageKey, JSON.stringify(quizHistoryAtual.slice(0, 300)));
    }

    const activePane = document.querySelector('.main-tab.active')?.dataset.maintab;
    if (activePane === 'simulados') renderQuizSidebarHistory(); else renderHistory();
  } catch (error) {
    console.warn('Não foi possível baixar o histórico da conta:', error);
  }
}
window.baixarHistoricoDaNuvem = baixarHistoricoDaNuvem;

function getHistory() { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; } }
function saveHistory(history) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(history));
  } catch (error) {
    console.warn('Não foi possível salvar o histórico:', error);
  }
  renderHistory();
}

function normalizeTopic(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function addToHistory(item) {
  const history = getHistory();
  if (!history[item.subject]) history[item.subject] = [];
  const normalizedNew = normalizeTopic(item.topic);
  history[item.subject] = history[item.subject].filter((saved) => normalizeTopic(saved.topic) !== normalizedNew);
  history[item.subject].unshift(item);
  history[item.subject] = history[item.subject].slice(0, 15);
  saveHistory(history);
  sincronizarEstudoNaNuvem(item);
}

function deleteHistoryItem(subject, topic) {
  const history = getHistory();
  if (!history[subject]) return;
  history[subject] = history[subject].filter((item) => item.topic !== topic);
  if (history[subject].length === 0) delete history[subject];
  saveHistory(history);
  if (estaLogado() && typeof apagarHistoricoPorTopico === "function") {
    apagarHistoricoPorTopico(subject, topic, "estudo").catch((error) => console.warn("Não foi possível apagar da conta:", error));
  }
}

function deleteHistorySubject(subject) {
  const history = getHistory();
  delete history[subject];
  saveHistory(history);
  if (estaLogado() && typeof apagarHistoricoPorMateria === "function") {
    apagarHistoricoPorMateria(subject, "estudo").catch((error) => console.warn("Não foi possível apagar da conta:", error));
  }
}

function renderHistory() {
  const history = getHistory();
  const subjects = Object.keys(history);
  clearHistory.hidden = subjects.length === 0;
  if (subjects.length === 0) {
    historyList.innerHTML = '<p class="empty-history">Quando você pesquisar um assunto, ele vai aparecer aqui.</p>';
    return;
  }
  historyList.innerHTML = '';
  subjects.forEach((subject) => {
    const palette = SUBJECT_COLORS[subject] || { color: '#5e7da1' };
    const group = document.createElement('div');
    group.className = 'history-group';
    const tab = document.createElement('div');
    tab.className = 'history-tab';
    tab.style.setProperty('--tab-color', palette.color);
    tab.innerHTML = `<p>${escapeHtml(subject)}</p><button type="button" class="history-tab-delete" title="Apagar matéria inteira">×</button>`;
    tab.querySelector('.history-tab-delete').addEventListener('click', (event) => {
      event.stopPropagation();
      deleteHistorySubject(subject);
    });
    group.appendChild(tab);
    history[subject].forEach((item) => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.style.borderLeft = `3px solid ${palette.color}`;
      const openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'history-item-open';
      openBtn.innerHTML = `<span>${escapeHtml(subject)}</span><strong>${escapeHtml(item.topic)}</strong>`;
      openBtn.addEventListener('click', () => {
        form.elements.subject.value = subject;
        applySubjectColor(subject);
        updateActivePill();
        showAnswer(item, false);
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'history-item-delete';
      deleteBtn.title = 'Apagar este assunto';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => deleteHistoryItem(subject, item.topic));
      row.appendChild(openBtn);
      row.appendChild(deleteBtn);
      group.appendChild(row);
    });
    historyList.appendChild(group);
  });
}

function renderExplanation(text) {
  const withBold = bold(text);
  return withBold.split(/\n\s*\n/).filter(Boolean).map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`).join('');
}

async function fetchWikipediaSummary(query) {
  try {
    const searchUrl = `https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&namespace=0&format=json&origin=*`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    const title = searchData?.[1]?.[0];
    if (!title) return null;

    const summaryUrl = `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const summaryResponse = await fetch(summaryUrl);
    if (!summaryResponse.ok) return null;
    const summary = await summaryResponse.json();
    if (summary.type === 'disambiguation') return null;

    return {
      title: summary.title,
      thumb: summary.thumbnail?.source || null,
      pageUrl: summary.content_urls?.desktop?.page || null,
    };
  } catch {
    return null;
  }
}

function renderWikipediaCard(article) {
  imagesGrid.innerHTML = '';
  if (!article || !article.pageUrl) {
    imagesEmpty.hidden = false;
    return;
  }
  imagesEmpty.hidden = true;
  const card = document.createElement('a');
  card.className = 'wiki-card';
  card.href = article.pageUrl;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.innerHTML = `${article.thumb ? `<img src="${article.thumb}" alt="${escapeHtml(article.title)}" loading="lazy" />` : ''}<div class="wiki-card-text"><strong>${escapeHtml(article.title)}</strong><span>Ver artigo completo na Wikipédia →</span></div>`;
  imagesGrid.appendChild(card);
}

function renderMindMap(topic, keywords, color, softColor) {
  const container = document.querySelector('#mindmap-container');
  const nodes = (keywords && keywords.length > 0 ? keywords : []).slice(0, 6);
  if (nodes.length === 0) { container.innerHTML = ''; return; }

  const width = 760;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;

  const centerWords = topic.split(' ');
  const centerLines = [];
  let cLine = '';
  centerWords.forEach((word) => {
    if ((cLine + ' ' + word).trim().length > 14) { centerLines.push(cLine.trim()); cLine = word; }
    else cLine = `${cLine} ${word}`.trim();
  });
  if (cLine) centerLines.push(cLine);
  const clampedCenterLines = centerLines.slice(0, 3);
  const longestCenterLine = Math.max(...clampedCenterLines.map((l) => l.length), 4);
  const centerRadius = Math.max(56, Math.min(110, longestCenterLine * 4.6, 30 + clampedCenterLines.length * 16));

  const boxWidth = 168;
  const boxHeight = 42;
  const radiusX = width / 2 - boxWidth / 2 - 12;
  const radiusY = height / 2 - boxHeight / 2 - 12;

  const branches = nodes.map((text, index) => {
    const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + radiusX * Math.cos(angle);
    const y = cy + radiusY * Math.sin(angle);
    const short = text.length > 32 ? `${text.slice(0, 30)}…` : text;
    const words = short.split(' ');
    const lines = [];
    let line = '';
    words.forEach((word) => {
      if ((line + ' ' + word).trim().length > 18) { lines.push(line.trim()); line = word; }
      else line = `${line} ${word}`.trim();
    });
    if (line) lines.push(line);
    const clampedLines = lines.slice(0, 2);

    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight / 2;
    const startDy = -((clampedLines.length - 1) * 15) / 2 + 5;
    const tspans = clampedLines.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? startDy : 15}">${escapeHtml(l)}</tspan>`).join('');

    const edgeX = cx + centerRadius * Math.cos(angle);
    const edgeY = cy + centerRadius * Math.sin(angle);

    return `
      <line x1="${edgeX}" y1="${edgeY}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="1.6" opacity="0.4" />
      <rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="10" fill="white" stroke="${color}" stroke-width="1.4" />
      <text class="mindmap-node-text" x="${x}" y="${y}" text-anchor="middle">${tspans}</text>
    `;
  }).join('');

  const centerStartDy = -((clampedCenterLines.length - 1) * 15) / 2 + 5;
  const centerTspans = clampedCenterLines.map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? centerStartDy : 15}">${escapeHtml(l)}</tspan>`).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${branches}
      <circle cx="${cx}" cy="${cy}" r="${centerRadius}" fill="${softColor}" stroke="${color}" stroke-width="2" />
      <text class="mindmap-center-text" x="${cx}" y="${cy}" text-anchor="middle">${centerTspans}</text>
    </svg>
  `;
}

function showAnswer(item, shouldScroll = true) {
  currentItem = item;
  answerTitle.textContent = item.topic;
  answerMeta.textContent = item.schoolYear ? `${item.subject} · ${item.schoolYear}` : item.subject;
  summaryList.innerHTML = item.summary.map((line) => `<li>${bold(line)}</li>`).join('');
  const palette = SUBJECT_COLORS[item.subject] || SUBJECT_COLORS['Matemática'];
  renderMindMap(item.topic, item.keywords, palette.color, palette.soft);
  explanationContent.innerHTML = renderExplanation(item.explanation);
  renderWikipediaCard(item.images);
  exercisesSection.hidden = true;
  answer.hidden = false;
  if (shouldScroll) answer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setSubmitting(isSubmitting, label) {
  submitButton.disabled = isSubmitting;
  submitButton.querySelector('span').textContent = isSubmitting ? (label || 'Buscando conteúdo...') : 'Estudar esse assunto';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const subject = form.elements.subject.value;
  const schoolYear = form.elements.schoolYear.value;
  const topic = topicInput.value.trim();

  setSubmitting(true);
  try {
    const [contentResponse, images] = await Promise.all([
      fetch('/api/study-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, schoolYear, topic }),
      }),
      fetchWikipediaSummary(`${topic} ${subject}`),
    ]);
    const data = await parseJsonResponse(contentResponse);
    if (!contentResponse.ok) throw new Error(data.error || 'Não foi possível gerar o conteúdo agora.');

    const finalSubject = data.subject || subject;
    const wasAutoDetected = !subject && !!finalSubject;
    form.elements.subject.value = finalSubject;
    applySubjectColor(finalSubject);
    updateActivePill(wasAutoDetected);
    renderTopicChips(finalSubject);

    const item = { subject: finalSubject, schoolYear, topic: data.topic || topic, summary: data.summary, keywords: data.keywords, explanation: data.explanation, images };
    addToHistory(item);
    showAnswer(item);
  } catch (error) {
    answerTitle.textContent = 'Não foi possível buscar esse conteúdo';
    answerMeta.textContent = '';
    summaryList.innerHTML = '';
    explanationContent.innerHTML = `<p>${escapeHtml(error.message || 'Tente novamente em instantes.')}</p>`;
    imagesGrid.innerHTML = '';
    imagesEmpty.hidden = true;
    answer.hidden = false;
    answer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } finally {
    setSubmitting(false);
  }
});

generateExercisesBtn.addEventListener('click', async () => {
  if (!currentItem) return;
  generateExercisesBtn.disabled = true;
  generateExercisesBtn.textContent = 'Gerando...';
  try {
    const response = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: currentItem.subject, schoolYear: currentItem.schoolYear, topic: currentItem.topic }),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) throw new Error(data.error || 'Não foi possível gerar exercícios agora.');

    exercisesList.innerHTML = data.exercises.map((exercise, index) => `
      <div class="exercise-item">
        <p class="exercise-question">${index + 1}. ${bold(exercise.question)}</p>
        <button class="exercise-toggle" type="button" data-index="${index}">Ver resposta</button>
        <div class="exercise-answer" id="exercise-answer-${index}">${bold(exercise.answer)}</div>
      </div>
    `).join('');
    exercisesSection.hidden = false;
    exercisesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    exercisesList.innerHTML = `<p>${escapeHtml(error.message || 'Não foi possível gerar exercícios agora.')}</p>`;
    exercisesSection.hidden = false;
  } finally {
    generateExercisesBtn.disabled = false;
    generateExercisesBtn.textContent = 'Gerar exercícios';
  }
});

exercisesList.addEventListener('click', (event) => {
  const button = event.target.closest('.exercise-toggle');
  if (!button) return;
  const target = document.querySelector(`#exercise-answer-${button.dataset.index}`);
  target.classList.toggle('visible');
  button.textContent = target.classList.contains('visible') ? 'Esconder resposta' : 'Ver resposta';
});

exercisesClose.addEventListener('click', () => { exercisesSection.hidden = true; });

clearHistory.addEventListener('click', () => {
  if (clearHistory.dataset.mode === 'simulados') {
    localStorage.removeItem(quizStorageKey);
    renderQuizSidebarHistory();
    if (estaLogado() && typeof apagarHistoricoPorTipo === 'function') {
      apagarHistoricoPorTipo('questao').catch((error) => console.warn('Não foi possível apagar da conta:', error));
    }
  } else {
    localStorage.removeItem(storageKey);
    answer.hidden = true;
    renderHistory();
    if (estaLogado() && typeof apagarHistoricoPorTipo === 'function') {
      apagarHistoricoPorTipo('estudo').catch((error) => console.warn('Não foi possível apagar da conta:', error));
    }
  }
});

newQuestion.addEventListener('click', () => {
  form.reset();
  applySubjectColor('');
  updateActivePill();
  renderTopicChips('');
  answer.hidden = true;
  exercisesSection.hidden = true;
  topicInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

function dedupExistingHistory() {
  const history = getHistory();
  let changed = false;
  Object.keys(history).forEach((subject) => {
    const seen = new Map();
    history[subject].forEach((item) => {
      const key = normalizeTopic(item.topic);
      if (!seen.has(key)) seen.set(key, item);
    });
    const deduped = [...seen.values()];
    if (deduped.length !== history[subject].length) changed = true;
    history[subject] = deduped;
  });
  if (changed) localStorage.setItem(storageKey, JSON.stringify(history));
}

function safeRun(label, fn) {
  try {
    fn();
  } catch (error) {
    console.error(`Falha ao inicializar "${label}":`, error);
  }
}

safeRun('hero-subjects', renderHeroSubjects);
safeRun('topic-chips', () => renderTopicChips(''));
safeRun('dedup-history', dedupExistingHistory);
safeRun('render-history', renderHistory);

/* ===== Questões e Simulados ===== */

const quizStorageKey = 'caderno-virtual-questoes-v1';
const DIFFICULTY_ORDER = ['facil', 'medio', 'dificil'];
const DIFFICULTY_LABELS = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };

const quizSetupForm = document.querySelector('#quiz-setup-form');
const quizSubjectPillsContainer = document.querySelector('#quiz-subject-pills');
const quizTopicGroup = document.querySelector('#quiz-topic-group');
const quizTopicInput = document.querySelector('#quiz-topic');
const quizDifficultySelect = document.querySelector('#quiz-difficulty-select');
const quizDifficultyInput = document.querySelector('#quiz-difficulty');
const quizCountSelect = document.querySelector('#quiz-count-select');
const quizCountInput = document.querySelector('#quiz-count');
const quizStartButton = document.querySelector('#quiz-start-button');
const quizActive = document.querySelector('#quiz-active');
const quizProgressLabel = document.querySelector('#quiz-progress-label');
const quizProgressFill = document.querySelector('#quiz-progress-fill');
const quizSubjectTopicEl = document.querySelector('#quiz-subject-topic');
const quizSkillEl = document.querySelector('#quiz-skill');
const quizStatementEl = document.querySelector('#quiz-statement');
const quizAlternativesEl = document.querySelector('#quiz-alternatives');
const quizHintButton = document.querySelector('#quiz-hint-button');
const quizHintText = document.querySelector('#quiz-hint-text');
const quizFeedback = document.querySelector('#quiz-feedback');
const quizFeedbackTitle = document.querySelector('#quiz-feedback-title');
const quizFeedbackBody = document.querySelector('#quiz-feedback-body');
const quizActions = document.querySelector('#quiz-actions');
const quizSimilarButton = document.querySelector('#quiz-similar-button');
const quizNextButton = document.querySelector('#quiz-next-button');
const quizFinishButton = document.querySelector('#quiz-finish-button');
const quizSummary = document.querySelector('#quiz-summary');
const quizStatCorrect = document.querySelector('#quiz-stat-correct');
const quizStatWrong = document.querySelector('#quiz-stat-wrong');
const quizStatPercent = document.querySelector('#quiz-stat-percent');
const quizSummaryWeak = document.querySelector('#quiz-summary-weak');
const quizRestartButton = document.querySelector('#quiz-restart-button');

let quizSelectedSubject = '';
let quizState = null;

function renderQuizTopicChips(subject) {
  const container = document.querySelector('#quiz-topic-chips');
  const topics = EXAMPLE_TOPICS[subject] || EXAMPLE_TOPICS[''];
  container.innerHTML = topics.map((topic) => `<button type="button" class="topic-chip">${escapeHtml(topic)}</button>`).join('');
}

document.querySelector('#quiz-topic-chips').addEventListener('click', (event) => {
  const chip = event.target.closest('.topic-chip');
  if (!chip) return;
  quizTopicInput.value = chip.textContent;
  quizTopicInput.focus();
});

function renderQuizSubjectPills() {
  quizSubjectPillsContainer.innerHTML = Object.keys(SUBJECT_COLORS).map((subject) => {
    const palette = SUBJECT_COLORS[subject];
    return `<button type="button" class="subject-pill" data-subject="${subject}" style="--pill-bg:${palette.soft}; --pill-fg:${palette.color}"><span class="dot"></span>${subject}</button>`;
  }).join('');
  quizSelectedSubject = '';
  updateQuizSubjectPills();
  setQuizTopicFieldVisibility(true);
  renderQuizTopicChips('');
}

function updateQuizSubjectPills() {
  quizSubjectPillsContainer.querySelectorAll('.subject-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.subject === quizSelectedSubject);
  });
}

function setQuizTopicFieldVisibility(visible) {
  quizTopicGroup.hidden = !visible;
  quizTopicInput.required = visible;
  if (!visible) quizTopicInput.value = '';
}

quizSubjectPillsContainer.addEventListener('click', (event) => {
  const pill = event.target.closest('.subject-pill');
  if (!pill) return;
  if (pill.dataset.subject === quizSelectedSubject) {
    quizSelectedSubject = '';
    updateQuizSubjectPills();
    setQuizTopicFieldVisibility(true);
    renderQuizTopicChips('');
    applySubjectColor('');
    return;
  }
  quizSelectedSubject = pill.dataset.subject;
  updateQuizSubjectPills();
  setQuizTopicFieldVisibility(false);
  applySubjectColor(quizSelectedSubject);
});

function wirePillSelect(container, hiddenInput) {
  container.addEventListener('click', (event) => {
    const option = event.target.closest('.quiz-pill-option');
    if (!option) return;
    hiddenInput.value = option.dataset.value;
    [...container.children].forEach((child) => child.classList.toggle('active', child === option));
  });
}
wirePillSelect(quizDifficultySelect, quizDifficultyInput);
wirePillSelect(quizCountSelect, quizCountInput);

function getQuizHistory() {
  try { return JSON.parse(localStorage.getItem(quizStorageKey)) || []; } catch { return []; }
}
function saveQuizRecord(record) {
  const history = getQuizHistory();
  history.unshift(record);
  try {
    localStorage.setItem(quizStorageKey, JSON.stringify(history.slice(0, 300)));
  } catch (error) {
    console.warn('Não foi possível salvar o histórico de simulados:', error);
  }
  sincronizarQuizNaNuvem(record);
}

function getPastQuestionsForSubject(subject) {
  const records = getQuizHistory();
  const filtered = subject ? records.filter((record) => record.subject === subject) : records;
  const topics = [...new Set(filtered.map((record) => record.topic).filter(Boolean))];
  const statements = [...new Set(filtered.map((record) => record.statement).filter(Boolean))];
  return { topics, statements };
}

const MODE_LABELS = { enem: 'ENEM', vestibular: 'Vestibular', escolar: 'Prova escolar', revisao: 'Revisão geral' };

function renderQuizSidebarHistory() {
  const records = getQuizHistory();
  clearHistory.hidden = records.length === 0;
  if (records.length === 0) {
    historyList.innerHTML = '<p class="empty-history">Faça seu primeiro simulado pra ver seu desempenho aqui.</p>';
    return;
  }

  const bySubject = {};
  records.forEach((record) => {
    if (!bySubject[record.subject]) bySubject[record.subject] = { correct: 0, wrong: 0, modes: new Set(), weak: {} };
    const bucket = bySubject[record.subject];
    if (record.correct) bucket.correct += 1;
    else {
      bucket.wrong += 1;
      bucket.weak[record.topic] = (bucket.weak[record.topic] || 0) + 1;
    }
    bucket.modes.add(record.mode);
  });

  historyList.innerHTML = Object.entries(bySubject).map(([subject, stats]) => {
    const palette = SUBJECT_COLORS[subject] || { color: '#5e7da1' };
    const total = stats.correct + stats.wrong;
    const percent = total > 0 ? Math.round((stats.correct / total) * 100) : 0;
    const modesLabel = [...stats.modes].map((mode) => MODE_LABELS[mode] || mode).join(', ');
    const weakEntries = Object.entries(stats.weak).sort((a, b) => b[1] - a[1]);
    const weakNote = weakEntries.length > 0
      ? `<p class="quiz-sidebar-weak">Vale revisar: ${escapeHtml(weakEntries[0][0])}</p>`
      : '';
    return `
      <div class="quiz-sidebar-card" style="--tab-color:${palette.color}">
        <div class="quiz-sidebar-card-top">
          <div>
            <p class="quiz-sidebar-subject">${escapeHtml(subject)}</p>
            <p class="quiz-sidebar-meta">${total} ${total > 1 ? 'questões' : 'questão'} · ${escapeHtml(modesLabel)}</p>
          </div>
          <span class="quiz-sidebar-percent">${percent}%</span>
        </div>
        <div class="quiz-sidebar-bar"><div style="width:${percent}%; background:${palette.color}"></div></div>
        ${weakNote}
      </div>`;
  }).join('');
}

quizSetupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!quizSetupForm.reportValidity()) return;
  const mode = quizSetupForm.elements.quizMode.value;
  const topic = quizTopicGroup.hidden ? '' : quizTopicInput.value.trim();
  if (!quizSelectedSubject && !topic) return;

  quizState = {
    mode,
    subject: quizSelectedSubject,
    requestTopic: topic,
    currentTopic: topic,
    usedTopics: topic ? [topic] : [],
    usedStatements: [],
    difficulty: quizDifficultyInput.value,
    total: Number(quizCountInput.value),
    index: 0,
    correct: 0,
    wrong: 0,
    weak: {},
    current: null,
  };

  quizSetupForm.hidden = true;
  quizSummary.hidden = true;
  quizActive.hidden = false;
  await loadQuizQuestion();
});

async function loadQuizQuestion(similarTo) {
  quizStartButton.disabled = true;
  quizAlternativesEl.dataset.answered = 'false';
  quizAlternativesEl.innerHTML = '<p class="quiz-loading">Gerando questão...</p>';
  quizStatementEl.textContent = '';
  quizFeedback.hidden = true;
  quizActions.hidden = true;
  quizFinishButton.hidden = false;
  quizNextButton.querySelector('span').textContent = 'Próxima questão';
  quizHintText.hidden = true;
  quizHintButton.hidden = false;
  quizSkillEl.hidden = true;
  quizSubjectTopicEl.textContent = '';

  try {
    const past = getPastQuestionsForSubject(quizState.subject);
    const avoidTopics = [...new Set([...quizState.usedTopics, ...past.topics])];
    const avoidStatements = [...new Set([...quizState.usedStatements, ...past.statements])].slice(-40);

    const response = await fetch('/api/question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: quizState.mode,
        subject: quizState.subject,
        topic: quizState.requestTopic,
        avoidTopics,
        avoidStatements,
        difficulty: quizState.difficulty,
        similarTo: similarTo || undefined,
      }),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) throw new Error(data.error || 'Não foi possível gerar a questão agora.');

    quizState.current = data;
    renderQuizQuestion(data);
  } catch (error) {
    quizAlternativesEl.innerHTML = `<p class="quiz-loading">${escapeHtml(error.message || 'Erro ao gerar questão.')}</p>`;
    quizActions.hidden = false;
    quizSimilarButton.hidden = true;
    quizNextButton.hidden = true;
    quizFinishButton.hidden = false;
  } finally {
    quizStartButton.disabled = false;
  }
}

function renderQuizQuestion(data) {
  quizState.subject = data.subject;
  quizState.currentTopic = data.topic;
  if (data.topic && !quizState.usedTopics.includes(data.topic)) quizState.usedTopics.push(data.topic);
  if (data.statement && !quizState.usedStatements.includes(data.statement)) quizState.usedStatements.push(data.statement);
  updateQuizProgress();
  quizSubjectTopicEl.textContent = `${data.subject} · ${data.topic}`;
  if (data.skill && data.skill.toLowerCase() !== 'não aplicável') {
    quizSkillEl.textContent = data.skill;
    quizSkillEl.hidden = false;
  }
  quizStatementEl.textContent = data.statement;
  quizAlternativesEl.innerHTML = data.alternatives.map((alt) => (
    `<button type="button" class="quiz-alt" data-id="${alt.id}"><span class="quiz-alt-letter">${alt.id}</span><span>${escapeHtml(alt.text)}</span></button>`
  )).join('');
}

function updateQuizProgress() {
  quizProgressLabel.textContent = `Questão ${quizState.index + 1} de ${quizState.total} · ${DIFFICULTY_LABELS[quizState.difficulty]}`;
  quizProgressFill.style.width = `${((quizState.index) / quizState.total) * 100}%`;
}

quizHintButton.addEventListener('click', () => {
  const hint = quizState.current?.hint;
  quizHintText.textContent = hint || 'Sem dica disponível para esta questão.';
  quizHintText.hidden = false;
  quizHintButton.hidden = true;
});

quizAlternativesEl.addEventListener('click', (event) => {
  const button = event.target.closest('.quiz-alt');
  if (!button || quizAlternativesEl.dataset.answered === 'true') return;
  quizAlternativesEl.dataset.answered = 'true';
  answerQuizQuestion(button.dataset.id);
});

function answerQuizQuestion(chosenId) {
  const data = quizState.current;
  const isCorrect = chosenId === data.correctId;

  [...quizAlternativesEl.children].forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.id === data.correctId) btn.classList.add('quiz-alt-correct');
    else if (btn.dataset.id === chosenId) btn.classList.add('quiz-alt-wrong');
  });

  if (isCorrect) {
    quizState.correct += 1;
  } else {
    quizState.wrong += 1;
    const key = `${quizState.subject} · ${quizState.currentTopic}`;
    quizState.weak[key] = (quizState.weak[key] || 0) + 1;
  }

  saveQuizRecord({
    mode: quizState.mode,
    subject: quizState.subject,
    topic: quizState.currentTopic,
    statement: data.statement,
    difficulty: quizState.difficulty,
    correct: isCorrect,
    date: new Date().toISOString(),
  });

  quizFeedbackTitle.textContent = isCorrect ? '✓ Você acertou!' : '✗ Você errou.';
  quizFeedbackTitle.className = `quiz-feedback-title ${isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`;

  const wrongList = Object.entries(data.wrongExplanations || {})
    .filter(([id]) => id !== data.correctId)
    .map(([id, text]) => `<li><strong>${id})</strong> ${escapeHtml(text)}</li>`)
    .join('');

  quizFeedbackBody.innerHTML = `
    <p><strong>Explicação:</strong> ${escapeHtml(data.correctExplanation)}</p>
    ${wrongList ? `<p><strong>Por que as outras estão erradas:</strong></p><ul>${wrongList}</ul>` : ''}
    ${data.commonMistake ? `<p><strong>Erro comum:</strong> ${escapeHtml(data.commonMistake)}</p>` : ''}
  `;
  quizFeedback.hidden = false;
  quizHintButton.hidden = true;
  quizHintText.hidden = true;

  quizActions.hidden = false;
  quizSimilarButton.hidden = isCorrect;
  const isLastQuestion = quizState.index + 1 >= quizState.total;
  quizNextButton.hidden = false;
  quizNextButton.querySelector('span').textContent = isLastQuestion ? 'Ver resultado' : 'Próxima questão';
  quizFinishButton.hidden = isLastQuestion;

  if (isCorrect) {
    const currentLevel = DIFFICULTY_ORDER.indexOf(quizState.difficulty);
    quizState.difficulty = DIFFICULTY_ORDER[Math.min(currentLevel + 1, DIFFICULTY_ORDER.length - 1)];
  } else {
    const currentLevel = DIFFICULTY_ORDER.indexOf(quizState.difficulty);
    quizState.difficulty = DIFFICULTY_ORDER[Math.max(currentLevel - 1, 0)];
  }
}

quizSimilarButton.addEventListener('click', async () => {
  quizAlternativesEl.dataset.answered = 'false';
  await loadQuizQuestion(quizState.current?.statement);
});

quizNextButton.addEventListener('click', async () => {
  if (quizState.index + 1 >= quizState.total) {
    finishQuiz();
    return;
  }
  quizState.index += 1;
  quizAlternativesEl.dataset.answered = 'false';
  await loadQuizQuestion();
});

quizFinishButton.addEventListener('click', finishQuiz);

function finishQuiz() {
  quizActive.hidden = true;
  quizSummary.hidden = false;

  const total = quizState.correct + quizState.wrong;
  const percent = total > 0 ? Math.round((quizState.correct / total) * 100) : 0;
  quizStatCorrect.textContent = quizState.correct;
  quizStatWrong.textContent = quizState.wrong;
  quizStatPercent.textContent = `${percent}%`;

  const weakEntries = Object.entries(quizState.weak).sort((a, b) => b[1] - a[1]);
  if (weakEntries.length === 0) {
    quizSummaryWeak.innerHTML = '<p class="quiz-summary-note">Mandou bem em tudo que apareceu — sem pontos de dificuldade registrados.</p>';
  } else {
    const items = weakEntries.map(([key, count]) => `<li>${escapeHtml(key)} <span>(${count} erro${count > 1 ? 's' : ''})</span></li>`).join('');
    quizSummaryWeak.innerHTML = `<p class="quiz-summary-note">Vale revisar:</p><ul class="quiz-summary-list">${items}</ul>`;
  }

  renderQuizSidebarHistory();
}

quizRestartButton.addEventListener('click', () => {
  quizSummary.hidden = true;
  quizSetupForm.hidden = false;
  quizSelectedSubject = '';
  updateQuizSubjectPills();
  setQuizTopicFieldVisibility(true);
  renderQuizTopicChips('');
  applySubjectColor('');
  quizState = null;
});

safeRun('quiz-subject-pills', renderQuizSubjectPills);
