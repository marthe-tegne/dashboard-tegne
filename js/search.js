/* =============================================
   TEGNE DASHBOARD — Søk
   ============================================= */

const Search = {

  overlay: null,

  init() {
    Utils.on('searchBtn', 'click', () => this.open());
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && this.overlay) this.close();
    });
  },

  open() {
    if (this.overlay) return;

    this.overlay = document.createElement('div');
    this.overlay.className = 'search-overlay';
    this.overlay.innerHTML = `
      <div class="search-box">
        <div class="search-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="searchInput" placeholder="Søk i oppgaver, notater og arrangement…" autocomplete="off">
          <button class="btn-icon" id="searchCloseBtn" style="flex-shrink:0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="search-results" id="searchResults">
          <div class="search-no-results">Skriv for å søke…</div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });
    document.getElementById('searchCloseBtn').addEventListener('click', () => this.close());

    const input = document.getElementById('searchInput');
    input.focus();
    input.addEventListener('input', () => this.search(input.value.trim()));
  },

  close() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  },

  search(query) {
    const resultsEl = document.getElementById('searchResults');
    if (!resultsEl) return;

    if (!query || query.length < 2) {
      resultsEl.innerHTML = '<div class="search-no-results">Skriv for å søke…</div>';
      return;
    }

    const q = query.toLowerCase();
    const results = [];

    // Søk i alle ukers oppgaver
    const tasks = Utils.load(CONFIG.STORAGE_KEYS.TASKS, {});
    Object.entries(tasks).forEach(([key, val]) => {
      if (!key.endsWith('_v2') || key.endsWith('_init')) return;
      const weekKey = key.replace('_v2', '');
      if (!Array.isArray(val)) return;
      val.forEach(t => {
        if (!t.text) return;
        if (t.text.toLowerCase().includes(q)) {
          results.push({
            type: 'task',
            title: t.text,
            meta: `Oppgave · ${weekKey} · ${this.statusLabel(t.status)} · ${this.prioLabel(t.priority)}`,
            week: weekKey,
          });
        }
      });
    });

    // Søk i ukes-notater
    const weekly = Utils.load(CONFIG.STORAGE_KEYS.WEEKLY, {});
    Object.entries(weekly).forEach(([key, val]) => {
      if (typeof val !== 'object' || !val._notes) return;
      if (val._notes.toLowerCase().includes(q)) {
        const weekKey = key.replace(/-(monday|tuesday|wednesday|thursday|friday)$/, '');
        const dayName = key.split('-').pop();
        results.push({
          type: 'note',
          title: val._notes.substring(0, 80) + (val._notes.length > 80 ? '…' : ''),
          meta: `Notat · ${weekKey} · ${dayName}`,
          week: weekKey,
        });
      }
    });

    // Søk i arrangement
    const events = Utils.load(CONFIG.STORAGE_KEYS.EVENTS, []);
    events.forEach(e => {
      const haystack = `${e.name} ${e.location || ''} ${e.description || ''}`.toLowerCase();
      if (haystack.includes(q)) {
        const tc = CONFIG.EVENT_TYPES.find(t => t.id === e.type);
        results.push({
          type: 'event',
          title: e.name,
          meta: `Arrangement · ${tc?.label || e.type}${e.date ? ' · ' + Utils.formatDate(e.date) : ''}${e.location ? ' · ' + e.location : ''}`,
        });
      }
    });

    // Søk i kampanjer
    const campaigns = Utils.load(CONFIG.STORAGE_KEYS.CAMPAIGNS, []);
    campaigns.forEach(c => {
      if (`${c.name} ${c.goal || ''}`.toLowerCase().includes(q)) {
        const tc = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
        results.push({
          type: 'campaign',
          title: c.name,
          meta: `Kampanje · ${tc?.label || c.type}${c.startDate ? ' · ' + Utils.formatDate(c.startDate) : ''}`,
        });
      }
    });

    if (!results.length) {
      resultsEl.innerHTML = `<div class="search-no-results">Ingen treff på «${Utils.esc(query)}»</div>`;
      return;
    }

    const icons = { task: '✅', note: '📝', event: '📅', campaign: '🎯' };

    resultsEl.innerHTML = results.slice(0, 30).map(r => `
      <div class="search-result-item" data-week="${r.week || ''}">
        <div class="search-result-title">${icons[r.type] || ''} ${Utils.esc(r.title)}</div>
        <div class="search-result-meta">${Utils.esc(r.meta)}</div>
      </div>
    `).join('');

    // Klikk på oppgave/notat → naviger til den uken
    resultsEl.querySelectorAll('.search-result-item[data-week]').forEach(item => {
      item.addEventListener('click', () => {
        const week = item.dataset.week;
        if (week && typeof Weekly !== 'undefined') {
          const [year, w] = week.replace('W', '').split('-W').map(Number);
          if (year && w) {
            Weekly.state.year = year;
            Weekly.state.week = w;
            App.setView('weekly');
          }
        }
        this.close();
      });
    });
  },

  statusLabel(s) {
    const map = { 'fullfort': 'Fullført', 'pagar': 'Pågår', 'startet': 'Startet', 'ikke-startet': 'Ikke startet' };
    return map[s] || s || '';
  },

  prioLabel(p) {
    const map = { 'haster': '🔴 Haster', 'hoy': '🟠 Høy', 'middels': '🟡 Middels', 'lav': '🟢 Lav' };
    return map[p] || p || '';
  },

};
