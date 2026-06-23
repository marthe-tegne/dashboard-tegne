/* =============================================
   TEGNE DASHBOARD — Arrangement
   ============================================= */

const Events = {

  state: {
    filterType:  null,
    filterStore: null,
  },

  getData() {
    return Utils.load(CONFIG.STORAGE_KEYS.EVENTS, []);
  },

  saveData(data) {
    Utils.save(CONFIG.STORAGE_KEYS.EVENTS, data);
    Sheets.debouncedSave('local', CONFIG.STORAGE_KEYS.EVENTS, data);
  },

  init() {},

  render() {
    const events  = this.getData();
    const today   = new Date(); today.setHours(0, 0, 0, 0);
    const filtered = this.applyFilter(events);
    const hasAny  = events.some(e => e.status !== 'ide');

    Utils.html('eventContent', `
      ${this.renderTopSection(events, today)}
      ${this.renderTimeline(events, today)}
      ${this.renderControls()}
      ${hasAny ? this.renderList(filtered, today) : `<div class="card"><div class="card-body">
        <p class="text-muted text-small" style="text-align:center;padding:8px 0">
          Ingen arrangement ennå. Trykk «+ Nytt arrangement» for å legge til.
        </p></div></div>`}
      ${this.renderIdeaBank(filtered)}
    `);
    this.bindEvents();
  },

  applyFilter(events) {
    return events.filter(e => {
      if (this.state.filterType  && e.type !== this.state.filterType)                       return false;
      if (this.state.filterStore && !(e.stores || []).includes(this.state.filterStore))     return false;
      return true;
    });
  },

  /* ---- Top section: kommende og aktive ---- */

  renderTopSection(events, today) {
    const in30 = new Date(today); in30.setDate(in30.getDate() + 30);

    const upcoming = events.filter(e => {
      if (!e.date || e.status === 'ide' || e.status === 'avsluttet') return false;
      const d = new Date(e.date);
      return d >= today && d <= in30;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (!upcoming.length) return '';

    return `<div class="card campaign-active-section">
      <div class="card-header">
        <div class="card-title"><span class="icon">${CONFIG.ICONS.bell}</span> Kommende — innen 30 dager</div>
      </div>
      <div class="card-body">
        <div class="campaign-row">${upcoming.map(e => this.renderCard(e)).join('')}</div>
      </div>
    </div>`;
  },

  /* ---- Timeline (90 dager) ---- */

  renderTimeline(events, today) {
    const visible = events.filter(e => e.status !== 'ide' && e.date);
    const windowEnd = new Date(today); windowEnd.setDate(windowEnd.getDate() + 90);
    const inWindow  = visible.filter(e => {
      const d   = new Date(e.date);
      const end = e.endDate ? new Date(e.endDate) : d;
      return end >= today && d <= windowEnd;
    });
    if (!inWindow.length) return '';

    const windowMs = windowEnd - today;
    const typeColors = Object.fromEntries(CONFIG.EVENT_TYPES.map(t => [t.id, t.color]));

    const months = [];
    let cur = new Date(today.getFullYear(), today.getMonth(), 1);
    while (cur <= windowEnd) {
      const pct = Math.max(0, (cur - today) / windowMs * 100);
      if (pct <= 100) months.push({ label: `${CONFIG.MONTHS_SHORT[cur.getMonth()]} ${cur.getFullYear()}`, pct });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    const bars = inWindow.map(e => {
      const s   = new Date(e.date);
      const end = e.endDate ? new Date(e.endDate) : s;
      const left  = Math.max(0,   (s   - today) / windowMs * 100);
      const right = Math.min(100, (end - today)  / windowMs * 100 + (86400000 / windowMs * 100));
      const width = Math.max(0.8, right - left);
      const color = typeColors[e.type] || 'var(--primary)';
      return `<div class="timeline-bar-row">
        <div class="timeline-bar-label" title="${Utils.esc(e.name)}">${Utils.esc(e.name)}</div>
        <div class="timeline-bar-track">
          <div class="timeline-bar-fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${color}"></div>
        </div>
      </div>`;
    });

    return `<div class="card">
      <div class="card-header">
        <div class="card-title"><span class="icon">${CONFIG.ICONS.trending}</span> Tidslinje — 90 dager</div>
      </div>
      <div class="card-body" style="overflow-x:auto">
        <div class="timeline-container">
          <div class="timeline-month-row">
            ${months.map(m => `<div class="timeline-month" style="left:${m.pct.toFixed(1)}%">${m.label}</div>`).join('')}
          </div>
          <div class="timeline-bars">${bars.join('')}</div>
          <div class="timeline-legend">
            ${CONFIG.EVENT_TYPES.map(t =>
              `<span class="timeline-legend-dot" style="background:${t.color}"></span><span>${t.label}</span>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>`;
  },

  /* ---- Filter + ny-knapp ---- */

  renderControls() {
    const typeOpts  = [{ id: '', label: 'Alle typer' }, ...CONFIG.EVENT_TYPES];
    const storeOpts = [{ id: '', label: 'Alle steder' }, ...CONFIG.CAMPAIGN_STORES];

    return `<div class="campaign-controls">
      <div class="campaign-filters">
        <div class="filter-group">
          ${typeOpts.map(t => `<button class="filter-chip${this.state.filterType === (t.id || null) ? ' active' : ''}" data-evt-filter-type="${t.id}">${t.label}</button>`).join('')}
        </div>
        <div class="filter-group">
          ${storeOpts.map(s => `<button class="filter-chip${this.state.filterStore === (s.id || null) ? ' active' : ''}" data-evt-filter-store="${s.id}">${s.label}</button>`).join('')}
        </div>
      </div>
      <button class="btn-primary" id="newEventBtn">+ Nytt arrangement</button>
    </div>`;
  },

  /* ---- Liste ---- */

  renderList(events, today = new Date()) {
    const listed = events.filter(e => e.status === 'planlagt' || e.status === 'bekreftet' || e.status === 'avsluttet');
    if (!listed.length) return '';

    const groups = [
      { id: 'bekreftet', label: 'Bekreftet',  items: listed.filter(e => e.status === 'bekreftet') },
      { id: 'planlagt',  label: 'Planlagt',   items: listed.filter(e => e.status === 'planlagt') },
      { id: 'avsluttet', label: 'Avsluttet',  items: listed.filter(e => e.status === 'avsluttet') },
    ].filter(g => g.items.length);

    return groups.map(g => `
      <div class="campaign-group">
        <div class="campaign-group-label">${g.label} <span class="badge badge-primary" style="font-size:.65rem">${g.items.length}</span></div>
        <div class="campaign-row">${g.items.map(e => this.renderCard(e)).join('')}</div>
      </div>`
    ).join('');
  },

  /* ---- Idébank ---- */

  renderIdeaBank(events) {
    const ideas = events.filter(e => e.status === 'ide');
    return `<div class="card">
      <div class="card-header">
        <div class="card-title"><span class="icon">${CONFIG.ICONS.bulb}</span> Idébank</div>
        <button class="btn-ai btn-sm" id="newEventIdeaBtn">+ Idé</button>
      </div>
      <div class="card-body">
        ${ideas.length
          ? ideas.map(e => this.renderIdeaRow(e)).join('')
          : '<p class="text-muted text-small">Ingen ideer ennå.</p>'
        }
      </div>
    </div>`;
  },

  renderIdeaRow(e) {
    const typeConf = CONFIG.EVENT_TYPES.find(t => t.id === e.type);
    return `<div class="idea-row" data-id="${e.id}">
      <div class="idea-info">
        ${typeConf ? `<span class="campaign-type-badge" style="background:${typeConf.color};color:${typeConf.textColor}">${typeConf.label}</span>` : ''}
        <span class="idea-name">${Utils.esc(e.name)}</span>
        ${e.location ? `<span class="event-location-tag">📍 ${Utils.esc(e.location)}</span>` : ''}
      </div>
      <div class="idea-actions">
        <button class="btn-ghost-sm promote-event-btn" data-id="${e.id}">→ Planlegg</button>
        <button class="btn-icon edit-event-btn" data-id="${e.id}" title="Rediger">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon delete-event-btn" data-id="${e.id}" title="Slett">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    </div>`;
  },

  /* ---- Arrangement-kort ---- */

  renderCard(e) {
    const typeConf   = CONFIG.EVENT_TYPES.find(t => t.id === e.type);
    const statusConf = CONFIG.EVENT_STATUSES.find(s => s.id === e.status);
    const storeTags  = (e.stores || []).map(s => {
      const sc = CONFIG.CAMPAIGN_STORES.find(x => x.id === s);
      return sc ? `<span class="stag stag-sm">${sc.label}</span>` : '';
    }).join('');

    const dateStr = e.date
      ? (e.endDate && e.endDate !== e.date
          ? `${Utils.formatDate(e.date)} – ${Utils.formatDate(e.endDate)}`
          : Utils.formatDate(e.date))
      : '';
    const timeStr = e.time ? ` kl. ${e.time}` : '';

    return `<div class="campaign-card campaign-card--${e.status}" data-id="${e.id}">
      <div class="campaign-card-top">
        ${typeConf ? `<span class="campaign-type-badge" style="background:${typeConf.color};color:${typeConf.textColor}">${typeConf.label}</span>` : ''}
        <div class="campaign-card-actions">
          <button class="btn-icon edit-event-btn" data-id="${e.id}" title="Rediger">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete-event-btn" data-id="${e.id}" title="Slett">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="campaign-card-name">${Utils.esc(e.name)}</div>
      ${dateStr ? `<div class="campaign-card-date">${dateStr}${timeStr}</div>` : ''}
      ${e.location ? `<div class="event-location-tag">📍 ${Utils.esc(e.location)}</div>` : ''}
      ${e.expectedAttendees ? `<div class="event-attendees">👥 ${e.expectedAttendees} deltakere</div>` : ''}
      ${e.description ? `<div class="campaign-card-goal">${Utils.esc(e.description)}</div>` : ''}
      <div class="campaign-card-footer">
        <div class="campaign-card-tags">${storeTags}</div>
        <span class="campaign-status-badge campaign-status--${e.status}">${statusConf?.label || ''}</span>
      </div>
    </div>`;
  },

  /* ---- Rediger-modal ---- */

  openEditModal(id, defaultStatus = 'planlagt') {
    const e = id ? this.getData().find(x => x.id === id) : null;

    Utils.el('evtId').value                  = id || '';
    Utils.el('evtName').value                = e?.name               || '';
    Utils.el('evtStatus').value              = e?.status             || defaultStatus;
    Utils.el('evtDate').value                = e?.date               || '';
    Utils.el('evtEndDate').value             = e?.endDate            || '';
    Utils.el('evtTime').value                = e?.time               || '';
    Utils.el('evtLocation').value            = e?.location           || '';
    Utils.el('evtExpectedAttendees').value   = e?.expectedAttendees  || '';
    Utils.el('evtDescription').value         = e?.description        || '';
    Utils.el('evtResult').value              = e?.result             || '';

    Utils.qsa('.evt-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === (e?.type || 'workshop'));
    });
    Utils.qsa('.evt-store-cb').forEach(cb => {
      cb.checked = (e?.stores || []).includes(cb.dataset.store);
    });

    const title = Utils.el('eventModalTitle');
    if (title) title.textContent = id ? 'Rediger arrangement' : 'Nytt arrangement';

    App.openModal('eventModal');
    setTimeout(() => Utils.el('evtName')?.focus(), 150);
  },

  saveFromModal() {
    const name = Utils.el('evtName')?.value.trim();
    if (!name) { Utils.toast('Navn er påkrevd', 'error'); return; }

    const id     = Utils.el('evtId')?.value || String(Date.now());
    const type   = document.querySelector('.evt-type-btn.active')?.dataset.type || 'workshop';
    const stores = [...Utils.qsa('.evt-store-cb:checked')].map(cb => cb.dataset.store);

    const event = {
      id,
      name,
      type,
      status:             Utils.el('evtStatus')?.value              || 'planlagt',
      date:               Utils.el('evtDate')?.value                || '',
      endDate:            Utils.el('evtEndDate')?.value             || '',
      time:               Utils.el('evtTime')?.value                || '',
      location:           Utils.el('evtLocation')?.value.trim()     || '',
      stores,
      expectedAttendees:  Utils.el('evtExpectedAttendees')?.value   || '',
      description:        Utils.el('evtDescription')?.value.trim()  || '',
      result:             Utils.el('evtResult')?.value.trim()        || '',
    };

    const events = this.getData();
    const idx = events.findIndex(x => x.id === event.id);
    if (idx >= 0) events[idx] = event;
    else events.push(event);

    this.saveData(events);
    App.closeModal('eventModal');
    this.render();
    Utils.toast(idx >= 0 ? 'Arrangement oppdatert' : 'Arrangement opprettet', 'success');
  },

  deleteEvent(id) {
    if (!confirm('Slette dette arrangementet?')) return;
    this.saveData(this.getData().filter(e => e.id !== id));
    this.render();
    Utils.toast('Arrangement slettet', 'info');
  },

  /* ---- Bind events ---- */

  bindEvents() {
    Utils.on('newEventBtn',      'click', () => this.openEditModal(null, 'planlagt'));
    Utils.on('newEventIdeaBtn',  'click', () => this.openEditModal(null, 'ide'));
    Utils.on('saveEventBtn',     'click', () => this.saveFromModal());

    Utils.qsa('[data-evt-filter-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.evtFilterType || null;
        this.state.filterType = (val === this.state.filterType) ? null : val;
        this.render();
      });
    });
    Utils.qsa('[data-evt-filter-store]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.evtFilterStore || null;
        this.state.filterStore = (val === this.state.filterStore) ? null : val;
        this.render();
      });
    });

    Utils.qsa('.edit-event-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.id));
    });
    Utils.qsa('.delete-event-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteEvent(btn.dataset.id));
    });
    Utils.qsa('.promote-event-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.id, 'planlagt'));
    });

    Utils.qsa('.evt-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.evt-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },

};
