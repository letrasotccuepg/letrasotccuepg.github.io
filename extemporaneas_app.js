/**
 * PORTAL DE DEFESAS EXTEMPORÂNEAS DE TCC 2026 - UEPG DELEM
 * Application Logic & Interactivity
 */

(function () {
  'use strict';

  // --- Estado da Aplicação ---
  let bancasData = [];
  const state = {
    search: '',
    selectedDay: 'all',
    theme: localStorage.getItem('uepg_tcc_theme') || 'light'
  };

  // --- Elementos do DOM ---
  const bancasContainer = document.getElementById('bancasContainer');
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearch');
  const resultsCount = document.getElementById('resultsCount');
  const resetFiltersBtn = document.getElementById('resetFilters');
  const themeToggleBtn = document.getElementById('themeToggle');
  const printBtn = document.getElementById('printBtn');
  const toast = document.getElementById('toast');
  const dayChips = document.querySelectorAll('.chip[data-filter="dia"]');

  // --- Inicialização ---
  function init() {
    initTheme();
    loadData();
    bindEvents();
  }

  // --- Gerenciamento de Tema ---
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
  }

  function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('uepg_tcc_theme', state.theme);
    initTheme();
  }

  // --- Carregamento de Dados ---
  function loadData() {
    if (window.EXTEMPORANEAS_DATA && Array.isArray(window.EXTEMPORANEAS_DATA)) {
      bancasData = window.EXTEMPORANEAS_DATA;
      onDataLoaded();
    } else {
      fetch('extemporaneas.json')
        .then(res => res.json())
        .then(data => {
          bancasData = data;
          onDataLoaded();
        })
        .catch(err => {
          console.error('Erro ao carregar extemporaneas.json:', err);
          if (resultsCount) resultsCount.textContent = 'Erro ao carregar dados do cronograma.';
        });
    }
  }

  function onDataLoaded() {
    render();
  }

  // --- Utilitários de Normalização e Escape ---
  function normalizeText(text) {
    if (!text) return '';
    return text.toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Filtragem ---
  function getFilteredBancas() {
    const q = normalizeText(state.search);

    return bancasData.filter(b => {
      // Filtro por dia
      if (state.selectedDay !== 'all') {
        if (b.data !== state.selectedDay && b.dia_curto !== state.selectedDay) {
          return false;
        }
      }

      // Busca textual
      if (q) {
        const matchAluno = normalizeText(b.aluno).includes(q);
        const matchOri = normalizeText(b.orientador).includes(q);
        const matchCoori = normalizeText(b.coorientador).includes(q);
        const matchTitulo = normalizeText(b.titulo).includes(q);
        const matchSala = normalizeText(b.sala).includes(q);
        const matchArea = normalizeText(b.area).includes(q);
        const matchMembros = b.membros && b.membros.some(m => normalizeText(m).includes(q));

        if (!matchAluno && !matchOri && !matchCoori && !matchTitulo && !matchSala && !matchArea && !matchMembros) {
          return false;
        }
      }

      return true;
    });
  }

  // --- Renderização dos Cards Agrupados por Data ---
  function render() {
    const filtered = getFilteredBancas();
    
    if (resultsCount) {
      resultsCount.textContent = `${filtered.length} de ${bancasData.length} bancas extemporâneas`;
    }

    const hasFilters = state.search || state.selectedDay !== 'all';
    if (resetFiltersBtn) {
      resetFiltersBtn.style.display = hasFilters ? 'inline-block' : 'none';
    }

    if (filtered.length === 0) {
      bancasContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 3rem 1rem; text-align: center;">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3>Nenhuma banca encontrada</h3>
          <p>Tente ajustar o dia selecionado ou os termos da busca.</p>
        </div>
      `;
      return;
    }

    // Agrupar por data
    const groups = {};
    filtered.forEach(b => {
      const key = `${b.dia} • ${b.data_br}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });

    let html = '';
    for (const [dayHeader, list] of Object.entries(groups)) {
      html += `
        <section class="date-group-section">
          <div class="date-group-header">
            <h2 class="date-group-title">
              <span>📅</span>
              <span>${escapeHTML(dayHeader)}</span>
            </h2>
            <span class="date-badge-pill">${list.length} banca${list.length > 1 ? 's' : ''}</span>
          </div>
          <div class="cards-grid">
            ${list.map(b => createBancaCardHTML(b)).join('')}
          </div>
        </section>
      `;
    }

    bancasContainer.innerHTML = html;
  }

  function createBancaCardHTML(b) {
    const areaClass = `tag-area-${normalizeText(b.area)}`;
    const modTag = b.hibrida 
      ? '<span class="tag tag-hibrida">Híbrida 💻</span>' 
      : '<span class="tag tag-presencial">Presencial 🏫</span>';

    const coorientadorHTML = b.coorientador ? `
      <div class="person-row">
        <span class="person-label">Coorientador(a):</span>
        <span class="person-name">${escapeHTML(b.coorientador)}</span>
      </div>
    ` : '';

    const membrosHTML = b.membros && b.membros.length > 0
      ? b.membros.map(m => `
          <div class="person-row">
            <span class="person-label">Avaliador(a):</span>
            <span class="person-name">${escapeHTML(m)}</span>
          </div>
        `).join('')
      : '';

    return `
      <article class="banca-card" data-banca-id="${b.id}">
        <div>
          <div class="card-header">
            <div class="time-slot">
              <span class="day-badge">${b.dia_curto}</span>
              <span>${b.horario}</span>
            </div>
            <div class="room-badge">${b.sala}</div>
          </div>

          <div class="card-tags">
            <span class="tag ${areaClass}">${b.area}</span>
            ${modTag}
          </div>

          <h3 class="tcc-title" title="${escapeHTML(b.titulo)}">${escapeHTML(b.titulo)}</h3>

          <div class="people-block">
            <div class="person-row">
              <span class="person-label">Aluno(a):</span>
              <span class="person-name student">${escapeHTML(b.aluno)}</span>
            </div>
            <div class="person-row">
              <span class="person-label">Orientador(a):</span>
              <span class="person-name">${escapeHTML(b.orientador)}</span>
            </div>
            ${coorientadorHTML}
            ${membrosHTML}
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-action btn-copy" onclick="window.copyBancaInfo(${b.id})" title="Copiar informações para WhatsApp">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copiar</span>
          </button>
          <a class="btn-action" href="${createGoogleCalendarUrl(b)}" target="_blank" rel="noopener noreferrer" title="Adicionar no Google Agenda">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>Agenda</span>
          </a>
          <button class="btn-action" onclick="window.downloadIcs(${b.id})" title="Baixar arquivo .ics para calendário">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>.ICS</span>
          </button>
        </div>
      </article>
    `;
  }

  // --- Calendário e Exportações ---
  function getStartEndTimes(b) {
    const dateStr = b.data; // Formato YYYY-MM-DD
    const [h, m] = b.horario.split(':').map(Number);
    const start = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    const end = new Date(start.getTime() + 50 * 60 * 1000); // 50 minutos de duração padrão

    const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return { startStr: fmt(start), endStr: fmt(end) };
  }

  function createGoogleCalendarUrl(b) {
    const { startStr, endStr } = getStartEndTimes(b);
    const title = encodeURIComponent(`Defesa TCC (Extemporânea): ${b.aluno}`);
    
    let details = `Defesa de TCC (Extemporânea) - UEPG Letras\n\n`;
    details += `Aluno(a): ${b.aluno}\n`;
    details += `Título: "${b.titulo}"\n`;
    details += `Orientador(a): ${b.orientador}\n`;
    if (b.coorientador) details += `Coorientador(a): ${b.coorientador}\n`;
    if (b.membros && b.membros.length > 0) details += `Banca Examinadora: ${b.membros.join(', ')}\n`;
    details += `Modalidade: ${b.hibrida ? 'Híbrida' : 'Presencial'}\n`;

    const location = encodeURIComponent(`Sala ${b.sala}, Bloco B, Campus Central UEPG`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&location=${location}`;
  }

  window.downloadIcs = function (bancaId) {
    const b = bancasData.find(x => x.id === bancaId);
    if (!b) return;

    const { startStr, endStr } = getStartEndTimes(b);
    let desc = `Defesa de TCC Extemporânea - UEPG Letras\\n`;
    desc += `Aluno(a): ${b.aluno}\\n`;
    desc += `Título: ${b.titulo}\\n`;
    desc += `Orientador(a): ${b.orientador}\\n`;
    if (b.membros && b.membros.length > 0) desc += `Banca: ${b.membros.join(', ')}\\n`;
    desc += `Modalidade: ${b.hibrida ? 'Híbrida' : 'Presencial'}`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UEPG DELEM//Defesas TCC Extemporaneas 2026//PT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:tcc-ext-2026-${b.id}@uepg.br`,
      `DTSTAMP:${startStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:Defesa TCC (Extemporânea): ${b.aluno}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:Sala ${b.sala}, Bloco B, Campus Central UEPG`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Defesa_TCC_Extemporanea_${normalizeText(b.aluno).replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Arquivo .ics baixado com sucesso!');
  };

  window.copyBancaInfo = function (bancaId) {
    const b = bancasData.find(x => x.id === bancaId);
    if (!b) return;

    let text = `🎓 *DEFESA DE TCC EXTEMPORÂNEA - LETRAS UEPG 2026*\n\n`;
    text += `👤 *Aluno(a):* ${b.aluno}\n`;
    text += `📖 *Título:* "${b.titulo}"\n`;
    text += `📅 *Data:* ${b.dia} (${b.data_br})\n`;
    text += `⏰ *Horário:* ${b.horario}\n`;
    text += `📍 *Sala:* ${b.sala} (${b.hibrida ? '💻 Híbrida' : '🏫 Presencial'})\n`;
    text += `🏛️ *Área:* ${b.area}\n`;
    text += `👨‍🏫 *Orientador(a):* ${b.orientador}\n`;
    if (b.coorientador) text += `👩‍🏫 *Coorientador(a):* ${b.coorientador}\n`;
    if (b.membros && b.membros.length > 0) {
      text += `👥 *Banca Examinadora:* ${b.membros.join(', ')}\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
      showToast('Informações copiadas para o WhatsApp!');
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      showToast('Não foi possível copiar automaticamente.');
    });
  };

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // --- Event Listeners ---
  function bindEvents() {
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', toggleTheme);
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        state.search = e.target.value;
        if (clearSearchBtn) {
          clearSearchBtn.style.display = state.search ? 'block' : 'none';
        }
        render();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        state.search = '';
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        render();
      });
    }

    if (dayChips) {
      dayChips.forEach(chip => {
        chip.addEventListener('click', () => {
          dayChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          state.selectedDay = chip.dataset.value;
          render();
        });
      });
    }

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        state.search = '';
        state.selectedDay = 'all';
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        dayChips.forEach(c => {
          c.classList.toggle('active', c.dataset.value === 'all');
        });
        render();
      });
    }
  }

  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

