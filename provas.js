// provas.js — Modo Prova (aba "Minhas provas")
// Depende de: auth.js (supabaseClient, usuarioAtual), app.js (setMainTab, applySubjectColor,
// SUBJECT_COLORS, escapeHtml, clearHistory, historyList, form, topicInput, quiz*)
// Carregar DEPOIS de app.js.

(function () {
  const paneProvas = document.querySelector('[data-mainpane="provas"]');
  if (!paneProvas) return;

  let provasCache = [];
  let provaAbertaId = null;
  let carregando = false;

  // ---------- datas ----------
  function hojeLocal() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function parseData(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function diffDias(de, ate) {
    return Math.round((ate - de) / 86400000);
  }
  function offsetParaData(offset) {
    const d = hojeLocal();
    d.setDate(d.getDate() + offset);
    return d;
  }
  function rotuloDia(offset) {
    if (offset === 0) return 'Hoje';
    if (offset === 1) return 'Amanhã';
    const d = offsetParaData(offset);
    const semana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][d.getDay()];
    return `${semana} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function dataCurta(iso) {
    const d = parseData(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function hojeISO() {
    const d = hojeLocal();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---------- cronograma (calculado, nunca salvo) ----------
  function montarCronograma(prova) {
    const topicos = Array.isArray(prova.topicos) ? prova.topicos.filter(Boolean) : [];
    const dias = diffDias(hojeLocal(), parseData(prova.data_prova));

    if (dias < 0 || topicos.length === 0) {
      return { dias, encerrada: dias < 0, blocos: [] };
    }

    const offsetSimulado = Math.max(0, dias - 1);
    const diasEstudo = Math.max(1, offsetSimulado);
    const mapa = new Map();

    const push = (offset, item) => {
      if (offset > offsetSimulado) return;
      if (!mapa.has(offset)) mapa.set(offset, []);
      mapa.get(offset).push(item);
    };

    topicos.forEach((topico, i) => {
      const offset = Math.floor((i * diasEstudo) / topicos.length);
      push(offset, { tipo: 'estudo', topico, key: `e${offset}:${topico}` });
      [1, 3, 7].forEach((gap) => {
        const rev = offset + gap;
        if (rev <= offsetSimulado) {
          push(rev, { tipo: 'revisao', topico, key: `r${rev}:${topico}` });
        }
      });
    });

    push(offsetSimulado, { tipo: 'simulado', topico: 'Simulado final', key: 'sim' });

    const blocos = [...mapa.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([offset, itens]) => ({ offset, itens }));

    return { dias, encerrada: false, blocos };
  }

  function totaisCronograma(cron, concluidos) {
    let total = 0;
    let feitos = 0;
    cron.blocos.forEach((b) => b.itens.forEach((it) => {
      total += 1;
      if (concluidos.includes(it.key)) feitos += 1;
    }));
    return { total, feitos, percent: total ? Math.round((feitos / total) * 100) : 0 };
  }

  // ---------- banco ----------
  function logado() {
    return typeof usuarioAtual !== 'undefined' && !!usuarioAtual;
  }

  async function carregarProvas() {
    if (!logado()) { provasCache = []; return; }
    const { data, error } = await supabaseClient
      .from('provas')
      .select('*')
      .order('data_prova', { ascending: true });
    if (error) { console.warn('Erro ao carregar provas:', error); return; }
    provasCache = data || [];
  }

  async function criarProva({ materia, titulo, data_prova, topicos }) {
    const { data, error } = await supabaseClient
      .from('provas')
      .insert({ user_id: usuarioAtual.id, materia, titulo, data_prova, topicos })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function salvarConcluidos(prova) {
    const { error } = await supabaseClient
      .from('provas')
      .update({ concluidos: prova.concluidos })
      .eq('id', prova.id);
    if (error) console.warn('Erro ao salvar progresso da prova:', error);
  }

  async function apagarProva(id) {
    await supabaseClient.from('provas').delete().eq('id', id);
    provasCache = provasCache.filter((p) => p.id !== id);
  }

  // ---------- detecção de matéria/título ----------
  async function detectarProva(topicos, materiaEscolhida) {
    try {
      const res = await fetch('/api/detectar-prova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicos, materia: materiaEscolhida || '' }),
      });
      if (!res.ok) return { materia: materiaEscolhida || null, titulo: null, incerto: !materiaEscolhida };
      return await res.json();
    } catch {
      return { materia: materiaEscolhida || null, titulo: null, incerto: !materiaEscolhida };
    }
  }

  // ---------- render ----------
  function corDaMateria(materia) {
    return (SUBJECT_COLORS[materia] || { color: '#5e7da1', soft: '#eef2f7' });
  }

  function renderDeslogado() {
    paneProvas.innerHTML = `
      <section class="provas-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Modo prova</p>
            <h2>Cadastre sua prova e receba um cronograma</h2>
          </div>
        </div>
        <p class="provas-empty-copy">Você precisa de uma conta pra salvar suas provas — assim o cronograma acompanha você em qualquer aparelho.</p>
        <div class="form-footer">
          <button type="button" class="primary-button" id="provas-login"><span>Entrar ou criar conta</span><span aria-hidden="true">→</span></button>
        </div>
      </section>`;
    paneProvas.querySelector('#provas-login').addEventListener('click', () => abrirModalAuth('login'));
  }

  function renderLista() {
    const ativas = provasCache.filter((p) => diffDias(hojeLocal(), parseData(p.data_prova)) >= 0);
    const passadas = provasCache.filter((p) => diffDias(hojeLocal(), parseData(p.data_prova)) < 0);

    const cardsAtivos = ativas.map((prova, i) => {
      const cron = montarCronograma(prova);
      const { percent } = totaisCronograma(cron, prova.concluidos || []);
      const palette = corDaMateria(prova.materia);
      const dias = cron.dias;
      const contagem = dias === 0 ? 'É hoje!' : dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`;
      return `
        <article class="prova-card" style="--prova-color:${palette.color}; --prova-soft:${palette.soft}; --delay:${i * 60}ms">
          <div class="prova-card-head">
            <div>
              <p class="prova-card-materia">${escapeHtml(prova.materia || 'Sem matéria')}</p>
              <h3 class="prova-card-titulo">${escapeHtml(prova.titulo || 'Minha prova')}</h3>
            </div>
            <span class="prova-card-contagem">${contagem}</span>
          </div>
          <p class="prova-card-data">${dataCurta(prova.data_prova)} · ${(prova.topicos || []).length} tópico${(prova.topicos || []).length === 1 ? '' : 's'}</p>
          <div class="prova-card-bar"><div style="width:${percent}%"></div></div>
          <div class="prova-card-actions">
            <button type="button" class="primary-button" data-abrir="${prova.id}"><span>Abrir cronograma</span></button>
            <button type="button" class="icon-button" data-apagar="${prova.id}" aria-label="Apagar prova">×</button>
          </div>
        </article>`;
    }).join('');

    const blocoPassadas = passadas.length ? `
      <details class="provas-passadas">
        <summary>Provas que já passaram (${passadas.length})</summary>
        ${passadas.map((p) => `
          <div class="prova-passada">
            <span>${escapeHtml(p.titulo || 'Prova')} · ${dataCurta(p.data_prova)}</span>
            <button type="button" class="icon-button" data-apagar="${p.id}" aria-label="Apagar prova">×</button>
          </div>`).join('')}
      </details>` : '';

    paneProvas.innerHTML = `
      <section class="provas-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Modo prova</p>
            <h2>Suas provas</h2>
          </div>
          <button type="button" class="secondary-button" id="provas-nova">+ Nova prova</button>
        </div>
        ${ativas.length ? `<div class="provas-grid">${cardsAtivos}</div>`
          : `<p class="provas-empty-copy">Nenhuma prova cadastrada. Adicione a data e os tópicos que vão cair — o cronograma é montado automaticamente.</p>
             <div class="form-footer"><button type="button" class="primary-button" id="provas-nova-vazio"><span>Cadastrar minha prova</span><span aria-hidden="true">→</span></button></div>`}
        ${blocoPassadas}
      </section>`;

    paneProvas.querySelectorAll('#provas-nova, #provas-nova-vazio').forEach((b) => b.addEventListener('click', renderFormulario));
    paneProvas.querySelectorAll('[data-abrir]').forEach((b) => b.addEventListener('click', () => abrirProva(b.dataset.abrir)));
    paneProvas.querySelectorAll('[data-apagar]').forEach((b) => b.addEventListener('click', async () => {
      if (!confirm('Apagar esta prova?')) return;
      await apagarProva(b.dataset.apagar);
      renderLista();
      renderSidebar();
    }));
    applySubjectColor(ativas[0]?.materia || '');
  }

  function renderFormulario() {
    const opcoes = Object.keys(SUBJECT_COLORS)
      .map((m) => `<button type="button" class="subject-pill" data-materia="${m}" style="--pill-bg:${SUBJECT_COLORS[m].soft}; --pill-fg:${SUBJECT_COLORS[m].color}"><span class="dot"></span>${m}</button>`)
      .join('');

    paneProvas.innerHTML = `
      <section class="provas-card">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Nova prova</p>
            <h2>O que vai cair?</h2>
          </div>
          <button type="button" class="secondary-button" id="prova-cancelar">Voltar</button>
        </div>

        <form id="prova-form">
          <label class="question-label" for="prova-data">Data da prova <span aria-hidden="true">*</span></label>
          <input id="prova-data" type="date" required min="${hojeISO()}" />

          <label class="question-label" for="prova-topicos">Tópicos <span aria-hidden="true">*</span></label>
          <textarea id="prova-topicos" rows="6" required placeholder="Um por linha. Ex.:&#10;Revolução Industrial&#10;Imperialismo&#10;Primeira Guerra Mundial"></textarea>
          <p class="input-hint">Quanto mais específico, melhor o cronograma. A matéria e o título são identificados sozinhos.</p>

          <label class="question-label">Matéria (opcional)</label>
          <div class="quiz-subject-pills" id="prova-materias">${opcoes}</div>
          <p class="input-hint">Deixe sem selecionar pra detectar automaticamente.</p>

          <div class="form-footer">
            <p class="privacy-note" id="prova-msg"></p>
            <button class="primary-button" type="submit" id="prova-salvar"><span>Criar cronograma</span><span aria-hidden="true">→</span></button>
          </div>
        </form>
      </section>`;

    let materiaEscolhida = '';
    const pills = paneProvas.querySelector('#prova-materias');
    pills.addEventListener('click', (e) => {
      const pill = e.target.closest('.subject-pill');
      if (!pill) return;
      materiaEscolhida = pill.dataset.materia === materiaEscolhida ? '' : pill.dataset.materia;
      pills.querySelectorAll('.subject-pill').forEach((p) => p.classList.toggle('active', p.dataset.materia === materiaEscolhida));
      applySubjectColor(materiaEscolhida);
    });

    paneProvas.querySelector('#prova-cancelar').addEventListener('click', renderLista);

    paneProvas.querySelector('#prova-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const botao = paneProvas.querySelector('#prova-salvar');
      const msg = paneProvas.querySelector('#prova-msg');
      const data_prova = paneProvas.querySelector('#prova-data').value;
      const topicos = paneProvas.querySelector('#prova-topicos').value
        .split('\n').map((t) => t.trim()).filter(Boolean);

      if (topicos.length === 0) { msg.textContent = 'Escreva pelo menos um tópico.'; return; }

      botao.disabled = true;
      botao.querySelector('span').textContent = 'Identificando matéria...';
      const det = await detectarProva(topicos, materiaEscolhida);

      if (!det.materia) {
        msg.textContent = 'Não deu pra identificar a matéria — selecione uma abaixo.';
        botao.disabled = false;
        botao.querySelector('span').textContent = 'Criar cronograma';
        return;
      }

      try {
        botao.querySelector('span').textContent = 'Salvando...';
        const nova = await criarProva({
          materia: det.materia,
          titulo: det.titulo || `Prova de ${det.materia}`,
          data_prova,
          topicos,
        });
        provasCache.push(nova);
        provasCache.sort((a, b) => a.data_prova.localeCompare(b.data_prova));
        abrirProva(nova.id);
        renderSidebar();
      } catch (err) {
        msg.textContent = 'Não foi possível salvar a prova.';
        console.warn(err);
        botao.disabled = false;
        botao.querySelector('span').textContent = 'Criar cronograma';
      }
    });
  }

  function abrirProva(id) {
    const prova = provasCache.find((p) => p.id === id);
    if (!prova) return renderLista();
    provaAbertaId = id;
    if (!Array.isArray(prova.concluidos)) prova.concluidos = [];

    const cron = montarCronograma(prova);
    const palette = corDaMateria(prova.materia);
    applySubjectColor(prova.materia);

    const { total, feitos, percent } = totaisCronograma(cron, prova.concluidos);
    const dias = cron.dias;
    const contagem = dias < 0 ? 'Prova encerrada' : dias === 0 ? 'É hoje!' : dias === 1 ? 'Falta 1 dia' : `Faltam ${dias} dias`;

    const ICONE = {
      estudo: '📖',
      revisao: '🔁',
      simulado: '🎯',
    };
    const ROTULO = {
      estudo: 'Estudar',
      revisao: 'Revisar',
      simulado: 'Simulado final',
    };

    const blocosHtml = cron.blocos.map((bloco, i) => {
      const itens = bloco.itens.map((item) => {
        const feito = prova.concluidos.includes(item.key);
        const acoes = item.tipo === 'simulado'
          ? `<button type="button" class="prova-acao" data-simulado="1">Fazer simulado</button>`
          : `<button type="button" class="prova-acao" data-estudar="${escapeHtml(item.topico)}">Estudar</button>
             <button type="button" class="prova-acao" data-testar="${escapeHtml(item.topico)}">Testar</button>`;
        return `
          <li class="prova-item ${feito ? 'prova-item-feito' : ''}">
            <button type="button" class="prova-check" data-key="${escapeHtml(item.key)}" aria-label="Marcar como concluído">${feito ? '✓' : ''}</button>
            <div class="prova-item-corpo">
              <p class="prova-item-topico"><span aria-hidden="true">${ICONE[item.tipo]}</span> ${escapeHtml(item.topico)}</p>
              <p class="prova-item-tipo">${ROTULO[item.tipo]}</p>
              <div class="prova-item-acoes">${acoes}</div>
            </div>
          </li>`;
      }).join('');

      const atrasado = bloco.offset === 0 ? ' prova-dia-hoje' : '';
      return `
        <section class="prova-dia${atrasado}" style="--delay:${i * 70}ms">
          <p class="prova-dia-label">${rotuloDia(bloco.offset)}</p>
          <ul class="prova-dia-itens">${itens}</ul>
        </section>`;
    }).join('');

    paneProvas.innerHTML = `
      <section class="provas-card" style="--prova-color:${palette.color}; --prova-soft:${palette.soft}">
        <div class="section-heading">
          <div>
            <p class="eyebrow">${escapeHtml(prova.materia || '')}</p>
            <h2>${escapeHtml(prova.titulo || 'Minha prova')}</h2>
          </div>
          <button type="button" class="secondary-button" id="prova-voltar">Todas as provas</button>
        </div>

        <div class="prova-contagem">
          <span class="prova-contagem-num">${contagem}</span>
          <span class="prova-contagem-data">Prova em ${dataCurta(prova.data_prova)}</span>
        </div>

        <div class="prova-progresso">
          <div class="prova-progresso-track"><div class="prova-progresso-fill" style="width:${percent}%"></div></div>
          <span>${feitos} de ${total} concluído${feitos === 1 ? '' : 's'}</span>
        </div>

        ${cron.blocos.length ? blocosHtml : '<p class="provas-empty-copy">Essa prova já passou.</p>'}
      </section>`;

    paneProvas.querySelector('#prova-voltar').addEventListener('click', () => { provaAbertaId = null; renderLista(); });

    paneProvas.querySelectorAll('.prova-check').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        const idx = prova.concluidos.indexOf(key);
        if (idx >= 0) prova.concluidos.splice(idx, 1);
        else prova.concluidos.push(key);
        await salvarConcluidos(prova);
        abrirProva(prova.id);
      });
    });

    paneProvas.querySelectorAll('[data-estudar]').forEach((btn) => {
      btn.addEventListener('click', () => irParaEstudo(btn.dataset.estudar));
    });
    paneProvas.querySelectorAll('[data-testar]').forEach((btn) => {
      btn.addEventListener('click', () => irParaQuiz(btn.dataset.testar, 3));
    });
    const btnSim = paneProvas.querySelector('[data-simulado]');
    if (btnSim) {
      btnSim.addEventListener('click', () => irParaQuiz((prova.topicos || []).join(', '), 10));
    }
  }

  // ---------- integração com as outras abas ----------
  function irParaEstudo(topico) {
    setMainTab('estudo');
    topicInput.value = topico;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (form.requestSubmit) form.requestSubmit();
    else form.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  function irParaQuiz(topico, quantidade) {
    setMainTab('simulados');
    const radio = document.querySelector('input[name="quizMode"][value="revisao"]');
    if (radio) radio.checked = true;

    quizSelectedSubject = '';
    updateQuizSubjectPills();
    setQuizTopicFieldVisibility(true);
    quizTopicInput.value = topico;

    const countSelect = document.querySelector('#quiz-count-select');
    const alvo = [...countSelect.children].find((c) => c.dataset.value === String(quantidade)) || countSelect.children[1];
    [...countSelect.children].forEach((c) => c.classList.toggle('active', c === alvo));
    document.querySelector('#quiz-count').value = alvo.dataset.value;

    document.querySelector('#quiz-summary').hidden = true;
    document.querySelector('#quiz-setup-form').hidden = false;

    window.scrollTo({ top: 0, behavior: 'smooth' });
    const f = document.querySelector('#quiz-setup-form');
    if (f.requestSubmit) f.requestSubmit();
    else f.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  // ---------- sidebar ----------
  function renderSidebar() {
    if (!logado()) {
      historyList.innerHTML = '<p class="empty-history">Entre na sua conta pra cadastrar provas.</p>';
      return;
    }
    if (provasCache.length === 0) {
      historyList.innerHTML = '<p class="empty-history">Suas provas cadastradas vão aparecer aqui.</p>';
      return;
    }
    historyList.innerHTML = provasCache.map((prova) => {
      const palette = corDaMateria(prova.materia);
      const dias = diffDias(hojeLocal(), parseData(prova.data_prova));
      const label = dias < 0 ? 'encerrada' : dias === 0 ? 'hoje' : `${dias}d`;
      return `
        <button type="button" class="prova-sidebar-item" data-prova="${prova.id}" style="--tab-color:${palette.color}">
          <span class="prova-sidebar-titulo">${escapeHtml(prova.titulo || 'Prova')}</span>
          <span class="prova-sidebar-meta">${escapeHtml(prova.materia || '')} · ${label}</span>
        </button>`;
    }).join('');
    historyList.querySelectorAll('[data-prova]').forEach((b) => {
      b.addEventListener('click', () => abrirProva(b.dataset.prova));
    });
  }

  // ---------- entrada na aba ----------
  async function entrarNaAba() {
    document.querySelector('#history-caption').textContent = 'Suas provas cadastradas, salvas na sua conta.';
    clearHistory.hidden = true;

    if (!logado()) {
      renderDeslogado();
      renderSidebar();
      return;
    }

    if (!carregando && provasCache.length === 0) {
      carregando = true;
      paneProvas.innerHTML = '<section class="provas-card"><p class="provas-empty-copy">Carregando suas provas...</p></section>';
      await carregarProvas();
      carregando = false;
    }

    if (provaAbertaId && provasCache.some((p) => p.id === provaAbertaId)) abrirProva(provaAbertaId);
    else renderLista();
    renderSidebar();
  }

  // sobrescreve setMainTab pra tratar a aba nova sem editar app.js
  const setMainTabOriginal = window.setMainTab;
  window.setMainTab = function (name) {
    if (name !== 'provas') return setMainTabOriginal(name);
    document.querySelectorAll('.main-tab').forEach((tab) => {
      const ativa = tab.dataset.maintab === 'provas';
      tab.classList.toggle('active', ativa);
      tab.setAttribute('aria-selected', ativa);
    });
    document.querySelectorAll('.main-tab-pane').forEach((pane) => {
      pane.classList.toggle('active', pane.dataset.mainpane === 'provas');
    });
    document.body.classList.remove('maintab-simulados');
    clearHistory.dataset.mode = 'provas';
    entrarNaAba();
  };

  // recarrega as provas quando o usuário loga
  const atualizarUIOriginal = window.atualizarUI;
  if (typeof atualizarUIOriginal === 'function') {
    window.atualizarUI = function () {
      atualizarUIOriginal();
      provasCache = [];
      provaAbertaId = null;
      if (document.querySelector('.main-tab.active')?.dataset.maintab === 'provas') entrarNaAba();
    };
  }
})();
