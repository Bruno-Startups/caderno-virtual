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
    subjectDropdown.sync();
    topicInput.focus();
  });
}

function updateActivePill() {
  const current = form.elements.subject.value;
  document.querySelectorAll('.subject-pill').forEach((pill) => pill.classList.toggle('active', pill.dataset.subject === current));
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

function enhanceSelect(select, { colorize = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'cs-wrap';
  select.classList.add('cs-native');
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cs-trigger';
  trigger.innerHTML = '<span class="cs-trigger-label"></span><svg width="16" height="10" viewBox="0 0 16 10"><path d="M1 1l7 7 7-7" stroke="#1f66b2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  wrap.appendChild(trigger);

  const menu = document.createElement('div');
  menu.className = 'cs-menu';
  menu.setAttribute('role', 'listbox');
  wrap.appendChild(menu);

  const label = trigger.querySelector('.cs-trigger-label');
  let highlightIndex = -1;

  function buildOptions() {
    menu.innerHTML = '';
    [...select.options].forEach((option) => {
      const item = document.createElement('div');
      item.className = 'cs-option';
      item.setAttribute('role', 'option');
      item.dataset.value = option.value;
      const palette = colorize ? SUBJECT_COLORS[option.value] : null;
      item.innerHTML = `<span class="cs-option-dot" ${palette ? `style="background:${palette.color};color:${palette.color}"` : ''}></span><span>${escapeHtml(option.textContent)}</span>`;
      item.addEventListener('click', () => selectValue(option.value));
      menu.appendChild(item);
    });
    syncSelected();
  }

  function syncSelected() {
    const current = select.value;
    const selectedOption = [...select.options].find((option) => option.value === current);
    label.textContent = selectedOption ? selectedOption.textContent : '';
    [...menu.children].forEach((item) => item.classList.toggle('selected', item.dataset.value === current));
  }

  function selectValue(value) {
    select.value = value;
    syncSelected();
    closeMenu();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openMenu() { wrap.classList.add('open'); highlightIndex = [...menu.children].findIndex((item) => item.classList.contains('selected')); }
  function closeMenu() { wrap.classList.remove('open'); }

  trigger.addEventListener('click', () => { wrap.classList.contains('open') ? closeMenu() : openMenu(); });

  trigger.addEventListener('keydown', (event) => {
    const items = [...menu.children];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!wrap.classList.contains('open')) { openMenu(); return; }
      highlightIndex = Math.min(items.length - 1, Math.max(0, highlightIndex + (event.key === 'ArrowDown' ? 1 : -1)));
      items.forEach((item, i) => item.classList.toggle('highlight', i === highlightIndex));
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && wrap.classList.contains('open')) {
      event.preventDefault();
      if (items[highlightIndex]) selectValue(items[highlightIndex].dataset.value);
    } else if (event.key === 'Escape') {
      closeMenu();
    }
  });

  document.addEventListener('click', (event) => { if (!wrap.contains(event.target)) closeMenu(); });

  buildOptions();
  return { sync: syncSelected };
}

const schoolYearDropdown = enhanceSelect(form.elements.schoolYear);
const subjectDropdown = enhanceSelect(form.elements.subject, { colorize: true });

function getHistory() { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; } }
function saveHistory(history) { localStorage.setItem(storageKey, JSON.stringify(history)); renderHistory(); }

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
}

function deleteHistoryItem(subject, topic) {
  const history = getHistory();
  if (!history[subject]) return;
  history[subject] = history[subject].filter((item) => item.topic !== topic);
  if (history[subject].length === 0) delete history[subject];
  saveHistory(history);
}

function deleteHistorySubject(subject) {
  const history = getHistory();
  delete history[subject];
  saveHistory(history);
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
        subjectDropdown.sync();
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

async function fetchImages(query) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=4&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=300&format=json&origin=*`;
    const response = await fetch(url);
    const data = await response.json();
    const pages = data?.query?.pages;
    if (!pages) return [];
    return Object.values(pages)
      .filter((page) => page.imageinfo?.[0]?.thumburl)
      .map((page) => ({
        thumb: page.imageinfo[0].thumburl,
        title: page.title.replace(/^File:/, '').replace(/\.(jpg|jpeg|png|svg|gif)$/i, ''),
        source: page.imageinfo[0].descriptionurl,
      }));
  } catch {
    return [];
  }
}

function renderImages(images) {
  imagesGrid.innerHTML = '';
  if (!images || images.length === 0) {
    imagesEmpty.hidden = false;
    return;
  }
  imagesEmpty.hidden = true;
  images.forEach((image) => {
    const card = document.createElement('a');
    card.className = 'image-card';
    card.href = image.source;
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.innerHTML = `<img src="${image.thumb}" alt="${escapeHtml(image.title)}" loading="lazy" /><p>${escapeHtml(image.title)}</p>`;
    imagesGrid.appendChild(card);
  });
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
  renderImages(item.images);
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
      fetchImages(`${topic} ${subject}`),
    ]);
    const data = await contentResponse.json();
    if (!contentResponse.ok) throw new Error(data.error || 'Não foi possível gerar o conteúdo agora.');

    const finalSubject = data.subject || subject;
    if (finalSubject !== subject && [...form.elements.subject.options].some((option) => option.value === finalSubject)) {
      form.elements.subject.value = finalSubject;
    }
    applySubjectColor(finalSubject);
    updateActivePill();
    renderTopicChips(finalSubject);
    subjectDropdown.sync();

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
    const data = await response.json();
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

clearHistory.addEventListener('click', () => { localStorage.removeItem(storageKey); answer.hidden = true; renderHistory(); });

newQuestion.addEventListener('click', () => {
  form.reset();
  schoolYearDropdown.sync();
  subjectDropdown.sync();
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

renderHeroSubjects();
renderTopicChips('');
dedupExistingHistory();
renderHistory();