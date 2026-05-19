/* =============================================
   TEGNE DASHBOARD — Kampanjer
   ============================================= */

const Campaigns = {

  state: {
    filterType:  null,
    filterStore: null,
  },

  getData() {
    return Utils.load(CONFIG.STORAGE_KEYS.CAMPAIGNS, []);
  },

  saveData(data) {
    Utils.save(CONFIG.STORAGE_KEYS.CAMPAIGNS, data);
    if (typeof Sheets !== 'undefined' && Sheets.isConfigured()) {
      Sheets.debouncedSave('local', CONFIG.STORAGE_KEYS.CAMPAIGNS, data);
    }
  },

  init() {},

  render() {
    const campaigns = this.getData();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const filtered = this.applyFilter(campaigns);
    const hasAny = campaigns.some(c => c.status !== 'ide');

    Utils.html('campaignContent', `
      ${this.renderTopSection(campaigns, today)}
      ${this.renderTimeline(campaigns, today)}
      ${this.renderControls()}
      ${hasAny ? this.renderList(filtered, today) : `<div class="card"><div class="card-body">
        <p class="text-muted text-small" style="text-align:center;padding:8px 0">
          Ingen kampanjer ennå. Trykk «+ Ny kampanje» for å komme i gang.
        </p></div></div>`}
      ${this.renderIdeaBank(filtered)}
    `);
    this.bindEvents();
  },

  applyFilter(campaigns) {
    return campaigns.filter(c => {
      if (this.state.filterType  && c.type !== this.state.filterType)                       return false;
      if (this.state.filterStore && !(c.stores || []).includes(this.state.filterStore))     return false;
      return true;
    });
  },

  /* ---- Top section: Active + Upcoming ---- */

  renderTopSection(campaigns, today) {
    const in14 = new Date(today); in14.setDate(in14.getDate() + 14);

    const active = campaigns.filter(c => c.status === 'aktiv');
    const upcoming = campaigns.filter(c => {
      if (!c.startDate || c.status === 'ide' || c.status === 'avsluttet') return false;
      const s = new Date(c.startDate);
      return s > today && s <= in14;
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    let html = '';
    if (active.length) {
      html += `<div class="card campaign-active-section">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.target}</span> Aktive nå</div>
        </div>
        <div class="card-body">
          <div class="campaign-row">${active.map(c => this.renderCard(c)).join('')}</div>
        </div>
      </div>`;
    }
    if (upcoming.length) {
      html += `<div class="card campaign-upcoming-section">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.bell}</span> Starter snart — innen 14 dager</div>
        </div>
        <div class="card-body">
          <div class="campaign-row">${upcoming.map(c => this.renderCard(c)).join('')}</div>
        </div>
      </div>`;
    }
    return html;
  },

  /* ---- Timeline (90 days) ---- */

  renderTimeline(campaigns, today) {
    const visible = campaigns.filter(c => c.status !== 'ide' && c.startDate && c.endDate);
    const windowEnd = new Date(today); windowEnd.setDate(windowEnd.getDate() + 90);
    const inWindow = visible.filter(c => new Date(c.endDate) >= today && new Date(c.startDate) <= windowEnd);
    if (!inWindow.length) return '';

    const windowMs = windowEnd - today;
    const typeColors = Object.fromEntries(CONFIG.CAMPAIGN_TYPES.map(t => [t.id, t.color]));

    // Month label positions
    const months = [];
    let cur = new Date(today.getFullYear(), today.getMonth(), 1);
    while (cur <= windowEnd) {
      const pct = Math.max(0, (cur - today) / windowMs * 100);
      if (pct <= 100) months.push({ label: `${CONFIG.MONTHS_SHORT[cur.getMonth()]} ${cur.getFullYear()}`, pct });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    const bars = inWindow.map(c => {
      const s = new Date(c.startDate);
      const e = new Date(c.endDate);
      const left  = Math.max(0,   (s - today)  / windowMs * 100);
      const right = Math.min(100, (e - today)   / windowMs * 100 + (86400000 / windowMs * 100));
      const width = Math.max(0.8, right - left);
      const color = typeColors[c.type] || 'var(--primary)';
      return `<div class="timeline-bar-row">
        <div class="timeline-bar-label" title="${Utils.esc(c.name)}">${Utils.esc(c.name)}</div>
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
            ${CONFIG.CAMPAIGN_TYPES.map(t =>
              `<span class="timeline-legend-dot" style="background:${t.color}"></span><span>${t.label}</span>`
            ).join('')}
          </div>
        </div>
      </div>
    </div>`;
  },

  /* ---- Filter + new button ---- */

  renderControls() {
    const typeOpts  = [{ id: '',      label: 'Alle typer' },    ...CONFIG.CAMPAIGN_TYPES];
    const storeOpts = [{ id: '',      label: 'Alle butikker' }, ...CONFIG.CAMPAIGN_STORES];

    return `<div class="campaign-controls">
      <div class="campaign-filters">
        <div class="filter-group">
          ${typeOpts.map(t => `<button class="filter-chip${this.state.filterType === (t.id || null) ? ' active' : ''}" data-filter-type="${t.id}">${t.label}</button>`).join('')}
        </div>
        <div class="filter-group">
          ${storeOpts.map(s => `<button class="filter-chip${this.state.filterStore === (s.id || null) ? ' active' : ''}" data-filter-store="${s.id}">${s.label}</button>`).join('')}
        </div>
      </div>
      <button class="btn-primary" id="newCampaignBtn">+ Ny kampanje</button>
    </div>`;
  },

  /* ---- Campaign list ---- */

  renderList(campaigns, today = new Date()) {
    // Aktive kampanjer vises allerede i renderTopSection — ikke gjenta dem her
    const listed = campaigns.filter(c => c.status === 'planlagt' || c.status === 'avsluttet');
    if (!listed.length) return '';

    const groups = [
      { id: 'planlagt',  label: 'Planlagte',  items: listed.filter(c => c.status === 'planlagt') },
      { id: 'avsluttet', label: 'Avsluttede', items: listed.filter(c => c.status === 'avsluttet') },
    ].filter(g => g.items.length);

    return groups.map(g => `
      <div class="campaign-group">
        <div class="campaign-group-label">${g.label} <span class="badge badge-primary" style="font-size:.65rem">${g.items.length}</span></div>
        <div class="campaign-row">${g.items.map(c => this.renderCard(c)).join('')}</div>
      </div>`
    ).join('');
  },

  /* ---- Idea bank ---- */

  renderIdeaBank(campaigns) {
    const ideas = campaigns.filter(c => c.status === 'ide');
    return `<div class="card">
      <div class="card-header">
        <div class="card-title"><span class="icon">${CONFIG.ICONS.bulb}</span> Idébank</div>
        <button class="btn-ai btn-sm" id="newIdeaBtn">+ Idé</button>
      </div>
      <div class="card-body">
        ${ideas.length
          ? ideas.map(c => this.renderIdeaRow(c)).join('')
          : '<p class="text-muted text-small">Ingen ideer ennå.</p>'
        }
      </div>
    </div>`;
  },

  renderIdeaRow(c) {
    const typeConf = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
    return `<div class="idea-row" data-id="${c.id}">
      <div class="idea-info">
        ${typeConf ? `<span class="campaign-type-badge" style="background:${typeConf.color};color:${typeConf.textColor}">${typeConf.label}</span>` : ''}
        <span class="idea-name">${Utils.esc(c.name)}</span>
        ${(c.stores || []).map(s => {
          const sc = CONFIG.CAMPAIGN_STORES.find(x => x.id === s);
          return sc ? `<span class="stag stag-sm">${sc.label}</span>` : '';
        }).join('')}
      </div>
      <div class="idea-actions">
        <button class="btn-ghost-sm promote-idea-btn" data-id="${c.id}">→ Aktivér</button>
        <button class="btn-icon edit-campaign-btn" data-id="${c.id}" title="Rediger">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon delete-campaign-btn" data-id="${c.id}" title="Slett">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    </div>`;
  },

  /* ---- Campaign card ---- */

  renderCard(c) {
    const typeConf   = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
    const statusConf = CONFIG.CAMPAIGN_STATUSES.find(s => s.id === c.status);
    const storeTags  = (c.stores || []).map(s => {
      const sc = CONFIG.CAMPAIGN_STORES.find(x => x.id === s);
      return sc ? `<span class="stag stag-sm">${sc.label}</span>` : '';
    }).join('');
    const dateStr = c.startDate && c.endDate
      ? `${Utils.formatDate(c.startDate)} – ${Utils.formatDate(c.endDate)}`
      : c.startDate ? `Fra ${Utils.formatDate(c.startDate)}` : '';

    return `<div class="campaign-card campaign-card--${c.status}" data-id="${c.id}">
      <div class="campaign-card-top">
        ${typeConf ? `<span class="campaign-type-badge" style="background:${typeConf.color};color:${typeConf.textColor}">${typeConf.label}</span>` : ''}
        <div class="campaign-card-actions">
          <button class="btn-icon edit-campaign-btn" data-id="${c.id}" title="Rediger">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon delete-campaign-btn" data-id="${c.id}" title="Slett">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="campaign-card-name">${Utils.esc(c.name)}</div>
      ${dateStr ? `<div class="campaign-card-date">${dateStr}</div>` : ''}
      ${c.goal ? `<div class="campaign-card-goal">${Utils.esc(c.goal)}</div>` : ''}
      <div class="campaign-card-footer">
        <div class="campaign-card-tags">${storeTags}</div>
        <span class="campaign-status-badge campaign-status--${c.status}">${statusConf?.label || ''}</span>
      </div>
    </div>`;
  },

  /* ---- Edit modal ---- */

  openEditModal(id, defaultStatus = 'planlagt') {
    const c = id ? this.getData().find(x => x.id === id) : null;

    Utils.el('cmpId').value          = id || '';
    Utils.el('cmpName').value        = c?.name      || '';
    Utils.el('cmpStatus').value      = c?.status    || defaultStatus;
    Utils.el('cmpStart').value       = c?.startDate || '';
    Utils.el('cmpEnd').value         = c?.endDate   || '';
    Utils.el('cmpGoal').value        = c?.goal      || '';
    Utils.el('cmpBudget').value      = c?.budget    || '';
    Utils.el('cmpResult').value      = c?.result    || '';

    Utils.qsa('.cmp-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === (c?.type || 'hoved'));
    });
    Utils.qsa('.cmp-store-cb').forEach(cb => {
      cb.checked = (c?.stores || []).includes(cb.dataset.store);
    });

    const title = Utils.el('campaignModalTitle');
    if (title) title.textContent = id ? 'Rediger kampanje' : 'Ny kampanje';

    App.openModal('campaignModal');
    setTimeout(() => Utils.el('cmpName')?.focus(), 150);
  },

  saveFromModal() {
    const name = Utils.el('cmpName')?.value.trim();
    if (!name) { Utils.toast('Kampanjenavn er påkrevd', 'error'); return; }

    const id      = Utils.el('cmpId')?.value || String(Date.now());
    const type    = document.querySelector('.cmp-type-btn.active')?.dataset.type || 'hoved';
    const stores  = [...Utils.qsa('.cmp-store-cb:checked')].map(cb => cb.dataset.store);

    const campaign = {
      id,
      name,
      type,
      status:    Utils.el('cmpStatus')?.value    || 'planlagt',
      startDate: Utils.el('cmpStart')?.value     || '',
      endDate:   Utils.el('cmpEnd')?.value       || '',
      stores,
      goal:      Utils.el('cmpGoal')?.value.trim()   || '',
      budget:    Utils.el('cmpBudget')?.value        || '',
      result:    Utils.el('cmpResult')?.value.trim() || '',
    };

    const campaigns = this.getData();
    const idx = campaigns.findIndex(c => c.id === campaign.id);
    if (idx >= 0) campaigns[idx] = campaign;
    else campaigns.push(campaign);

    this.saveData(campaigns);
    App.closeModal('campaignModal');
    this.render();
    Utils.toast(idx >= 0 ? 'Kampanje oppdatert' : 'Kampanje opprettet', 'success');
  },

  deleteCampaign(id) {
    if (!confirm('Slette denne kampanjen?')) return;
    this.saveData(this.getData().filter(c => c.id !== id));
    this.render();
    Utils.toast('Kampanje slettet', 'info');
  },

  /* ---- Bind events ---- */

  bindEvents() {
    Utils.on('newCampaignBtn', 'click', () => this.openEditModal(null, 'planlagt'));
    Utils.on('newIdeaBtn',     'click', () => this.openEditModal(null, 'ide'));
    Utils.on('saveCampaignBtn','click', () => this.saveFromModal());

    Utils.qsa('[data-filter-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.filterType || null;
        this.state.filterType = (val === this.state.filterType) ? null : val;
        this.render();
      });
    });
    Utils.qsa('[data-filter-store]').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.filterStore || null;
        this.state.filterStore = (val === this.state.filterStore) ? null : val;
        this.render();
      });
    });

    Utils.qsa('.edit-campaign-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.id));
    });
    Utils.qsa('.delete-campaign-btn').forEach(btn => {
      btn.addEventListener('click', () => this.deleteCampaign(btn.dataset.id));
    });
    Utils.qsa('.promote-idea-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openEditModal(btn.dataset.id, 'planlagt'));
    });

    // Type toggle in modal
    Utils.qsa('.cmp-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Utils.qsa('.cmp-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  },

};
