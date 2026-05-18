/* =============================================
   TEGNE DASHBOARD — Kvartalsvis visning
   ============================================= */

const Quarterly = {

  state: { year: 0, quarter: 0 },

  init() {
    const { year, quarter } = Utils.getCurrentQuarter();
    this.state.year    = year;
    this.state.quarter = quarter;
    this.render();
    this.bindNav();
  },

  bindNav() {
    Utils.on('prevQuarter', 'click', () => {
      const { year, quarter } = Utils.addQuarters(this.state.year, this.state.quarter, -1);
      this.state.year = year; this.state.quarter = quarter;
      this.render();
    });
    Utils.on('nextQuarter', 'click', () => {
      const { year, quarter } = Utils.addQuarters(this.state.year, this.state.quarter, 1);
      this.state.year = year; this.state.quarter = quarter;
      this.render();
    });
  },

  getKey()     { return Utils.getQuarterKey(this.state.year, this.state.quarter); },
  getPrevKey() {
    const { year, quarter } = Utils.addQuarters(this.state.year, this.state.quarter, -1);
    return Utils.getQuarterKey(year, quarter);
  },

  getData(key)     { return Utils.loadNested(CONFIG.STORAGE_KEYS.QUARTERLY, key, {}); },
  saveData(key, d) {
    Utils.saveNested(CONFIG.STORAGE_KEYS.QUARTERLY, key, d);
  },

  quarterMonths(year, quarter) {
    const start = (quarter - 1) * 3;
    return [
      CONFIG.MONTHS_NO[start]     + ' ' + year,
      CONFIG.MONTHS_NO[start + 1] + ' ' + year,
      CONFIG.MONTHS_NO[start + 2] + ' ' + year,
    ];
  },

  nextQuarterMonths() {
    const { year, quarter } = Utils.addQuarters(this.state.year, this.state.quarter, 1);
    const start = (quarter - 1) * 3;
    const y2 = quarter === 4 ? year + 1 : year;
    return [
      CONFIG.MONTHS_NO[start]     + ' ' + year,
      CONFIG.MONTHS_NO[start + 1] + ' ' + (start + 1 > 11 ? year + 1 : year),
      CONFIG.MONTHS_NO[(start + 2) % 12] + ' ' + y2,
    ];
  },

  render() {
    const key      = this.getKey();
    const prevKey  = this.getPrevKey();
    const data     = this.getData(key);
    const prev     = this.getData(prevKey);
    const label    = `Q${this.state.quarter} ${this.state.year}`;

    Utils.el('quarterLabel').textContent = label;
    AI.setContext({ view: 'quarterly', quarter: label });
    const badge = Utils.el('aiContextBadge');
    if (badge) badge.textContent = `Kvartalsvis · ${label}`;

    Utils.html('quarterContent', this.buildHTML(data, prev, key, label));
    this.bindEvents(key, data);
  },

  buildHTML(data, prev, key, label) {
    const months = this.quarterMonths(this.state.year, this.state.quarter);
    const nextMonths = this.nextQuarterMonths();

    const goalDefs = [
      { key: 'goalRevenue',    label: 'Omsetning mål',    prefix: 'kr' },
      { key: 'goalOrders',     label: 'Ordre mål',        prefix: '' },
      { key: 'goalAOV',        label: 'AOV mål',          prefix: 'kr' },
      { key: 'goalNewCustomers',label:'Nye kunder mål',   prefix: '' },
    ];

    return `<div class="section-stack">

      <!-- Kvartalsmål vs. faktisk -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🎯</span> Kvartalsmål vs. faktisk — ${label}</div>
        </div>
        <div class="card-body">
          <div class="grid-2">
            ${goalDefs.map(g => {
              const target = Number(data[g.key] || 0);
              const actual = Number(data[g.key + '_actual'] || 0);
              const pct    = target > 0 ? Math.min((actual / target) * 100, 150) : 0;
              const pctDisp = target > 0 ? ((actual / target) * 100).toFixed(0) : '–';
              const cls    = pct >= 100 ? 'met' : pct >= 75 ? 'close' : 'miss';
              return `<div class="goal-item">
                <div class="goal-label">${g.label}</div>
                <div class="goal-values">
                  <div>
                    <div style="font-size:.7rem;color:var(--text-muted)">Mål</div>
                    <input class="kpi-input goal-target-input" data-gkey="${g.key}" type="number"
                      value="${Utils.esc(data[g.key] || '')}" placeholder="0"
                      style="font-size:1rem;padding:4px 8px;width:110px">
                  </div>
                  <div>
                    <div style="font-size:.7rem;color:var(--text-muted)">Faktisk</div>
                    <input class="kpi-input goal-actual-input" data-gkey="${g.key + '_actual'}" type="number"
                      value="${Utils.esc(data[g.key + '_actual'] || '')}" placeholder="0"
                      style="font-size:1rem;padding:4px 8px;width:110px">
                  </div>
                  <div class="goal-pct ${cls}">${pctDisp}%</div>
                </div>
                <div class="goal-bar-track" style="margin-top:6px">
                  <div class="goal-bar-fill ${cls}" style="width:${Math.min(pct,100)}%"></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Sesong- og kampanjekalender 3 mnd frem -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📅</span> Sesong- og kampanjekalender — neste 3 måneder</div>
          <button class="btn-ai btn-sm" id="addSeasonEntry">+ Legg til</button>
        </div>
        <div class="card-body">
          <div class="season-cal" id="seasonCal"></div>
        </div>
      </div>

      <!-- SEO- og innholdsstrategi -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">🔍</span> SEO-strategi</div>
          </div>
          <div class="card-body">
            <textarea class="form-textarea" id="seoStrategy" rows="6"
              placeholder="Fokussøkeord, teknisk SEO-tiltak, innholdsluker, linkbuilding…">${Utils.esc(data.seoStrategy || '')}</textarea>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">✍️</span> Innholdsstrategi</div>
          </div>
          <div class="card-body">
            <textarea class="form-textarea" id="contentStrategy" rows="6"
              placeholder="Planlagte artikler, serier, kampanjeinnhold, sosiale medier-fokus…">${Utils.esc(data.contentStrategy || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Konkurrentobservasjoner -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">🔭</span> Konkurrentobservasjoner</div>
          <button class="btn-ai btn-sm" id="addCompetitorBtn">+ Legg til</button>
        </div>
        <div class="card-body">
          <div id="competitorList"></div>
        </div>
      </div>

      <!-- Ressurser & budsjett -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">💰</span> Ressurser &amp; budsjett</div>
        </div>
        <div class="card-body">
          <div class="grid-2" style="margin-bottom:12px">
            ${['Google Ads','Meta Ads','E-post','Innhold','Annet'].map(channel => `
              <div class="kpi-field">
                <label class="kpi-label">${channel}</label>
                <input class="kpi-input budget-input" data-bkey="budget_${channel.replace(/\s/g,'_')}"
                  type="number" placeholder="kr 0"
                  value="${Utils.esc(data['budget_' + channel.replace(/\s/g,'_')] || '')}">
              </div>`).join('')}
          </div>
          <textarea class="form-textarea" id="resourceNotes" rows="3"
            placeholder="Notater om ressurser, samarbeidspartnere, verktøy-abonnementer…">${Utils.esc(data.resourceNotes || '')}</textarea>
        </div>
      </div>

      <!-- AI-analyse -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">✨</span> AI-analyse — ${label} vs. forrige kvartal</div>
          <button class="btn-ai" id="generateQuarterlyAI">✨ Generer</button>
        </div>
        <div class="card-body">
          <div class="ai-diagnosis-content" id="quarterlyAIText" style="min-height:80px">
            ${data.aiAnalysis
              ? data.aiAnalysis.replace(/\n/g,'<br>')
              : '<span class="text-muted">Trykk «Generer» for kvartalsvis AI-analyse.</span>'}
          </div>
        </div>
      </div>

    </div>`;
  },

  bindEvents(key, initialData) {
    // Mål-inputs
    Utils.qsa('.goal-target-input, .goal-actual-input').forEach(input => {
      input.addEventListener('input', Utils.debounce(() => {
        const data = this.getData(key);
        Utils.qsa('.goal-target-input, .goal-actual-input').forEach(el => {
          data[el.dataset.gkey] = el.value;
        });
        this.saveData(key, data);
        this.render();
      }, 800));
    });

    // Budsjett-inputs
    Utils.qsa('.budget-input').forEach(input => {
      input.addEventListener('input', Utils.debounce(() => {
        const data = this.getData(key);
        Utils.qsa('.budget-input').forEach(el => { data[el.dataset.bkey] = el.value; });
        this.saveData(key, data);
      }, 800));
    });

    // Tekstfelter
    ['seoStrategy','contentStrategy','resourceNotes'].forEach(id => {
      const el = Utils.el(id);
      if (el) {
        el.addEventListener('input', Utils.debounce(() => {
          const data = this.getData(key);
          data[id] = el.value;
          this.saveData(key, data);
        }, 800));
      }
    });

    // Sesongkalender
    this.renderSeasonCal(key);
    Utils.on('addSeasonEntry', 'click', () => this.addSeasonEntry(key));

    // Konkurrenter
    this.renderCompetitors(key);
    Utils.on('addCompetitorBtn', 'click', () => this.addCompetitor(key));

    // AI
    Utils.on('generateQuarterlyAI', 'click', async () => {
      const btn = Utils.el('generateQuarterlyAI');
      const txt = Utils.el('quarterlyAIText');
      btn.textContent = '⏳ Analyserer…';
      btn.disabled = true;
      if (txt) txt.innerHTML = '<span class="text-muted">Sammenligner med forrige kvartal…</span>';
      const data     = this.getData(key);
      const prevData = this.getData(this.getPrevKey());
      const analysis = await AI.generateQuarterlyAnalysis(data, prevData);
      if (analysis) {
        data.aiAnalysis = analysis;
        this.saveData(key, data);
        if (txt) txt.innerHTML = analysis.replace(/\n/g,'<br>');
      }
      btn.textContent = '✨ Generer';
      btn.disabled = false;
    });
  },

  renderSeasonCal(key) {
    const container = Utils.el('seasonCal');
    if (!container) return;
    const data    = this.getData(key);
    const entries = data.seasonEntries || [];
    if (entries.length === 0) {
      container.innerHTML = '<p class="text-muted text-small">Ingen sesonghendelser lagt til ennå.</p>';
      return;
    }
    container.innerHTML = entries.map((e, i) => `
      <div class="season-item">
        <div class="cal-date" style="min-width:60px">${Utils.esc(e.month || '')}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:.875rem">${Utils.esc(e.title || '')}</div>
          <div class="text-small text-muted">${Utils.esc(e.notes || '')}</div>
        </div>
        <span class="badge badge-${e.type === 'kampanje' ? 'red' : e.type === 'sesong' ? 'yellow' : 'primary'}">
          ${Utils.esc(e.type || '')}
        </span>
        <button class="task-del season-del" data-si="${i}">✕</button>
      </div>`).join('');

    container.querySelectorAll('.season-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = this.getData(key);
        data.seasonEntries.splice(Number(btn.dataset.si), 1);
        this.saveData(key, data);
        this.renderSeasonCal(key);
      });
    });
  },

  addSeasonEntry(key) {
    const month = prompt('Måned (f.eks. Juni 2026):');
    if (!month) return;
    const title = prompt('Tittel (f.eks. Sommerkampanje):');
    if (!title) return;
    const notes = prompt('Notater (valgfritt):') || '';
    const typeInput = prompt('Type: sesong / kampanje / ferie') || 'kampanje';
    const data = this.getData(key);
    if (!data.seasonEntries) data.seasonEntries = [];
    data.seasonEntries.push({ month: month.trim(), title: title.trim(), notes, type: typeInput.trim() });
    this.saveData(key, data);
    this.renderSeasonCal(key);
    Utils.toast('Sesonghendelse lagt til', 'success');
  },

  renderCompetitors(key) {
    const container = Utils.el('competitorList');
    if (!container) return;
    const data  = this.getData(key);
    const items = data.competitors || [];
    if (items.length === 0) {
      container.innerHTML = '<p class="text-muted text-small">Ingen konkurrentobservasjoner ennå.</p>';
      return;
    }
    container.innerHTML = items.map((c, i) => `
      <div class="backlog-item" style="margin-bottom:6px">
        <div style="flex:1">
          <div style="font-weight:600;font-size:.85rem;margin-bottom:2px">${Utils.esc(c.name || '')}</div>
          <div class="text-small text-muted">${Utils.esc(c.observation || '')}</div>
          <div style="font-size:.7rem;color:var(--text-muted);margin-top:2px">${Utils.esc(c.date || '')}</div>
        </div>
        <button class="task-del comp-del" data-ci="${i}">✕</button>
      </div>`).join('');

    container.querySelectorAll('.comp-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = this.getData(key);
        data.competitors.splice(Number(btn.dataset.ci), 1);
        this.saveData(key, data);
        this.renderCompetitors(key);
      });
    });
  },

  addCompetitor(key) {
    const name = prompt('Konkurrent:');
    if (!name) return;
    const observation = prompt('Observasjon:');
    if (!observation) return;
    const data = this.getData(key);
    if (!data.competitors) data.competitors = [];
    data.competitors.push({
      name: name.trim(),
      observation: observation.trim(),
      date: Utils.formatDate(new Date(), 'short'),
    });
    this.saveData(key, data);
    this.renderCompetitors(key);
    Utils.toast('Observasjon lagret', 'success');
  },

};
