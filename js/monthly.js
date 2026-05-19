/* =============================================
   TEGNE DASHBOARD — Månedlig visning
   ============================================= */

const Monthly = {

  state: { year: 0, month: 0 },

  init() {
    const { year, month } = Utils.getCurrentMonth();
    this.state.year  = year;
    this.state.month = month;
    this.render();
    this.bindNav();
  },

  bindNav() {
    Utils.on('prevMonth', 'click', () => {
      const { year, month } = Utils.addMonths(this.state.year, this.state.month, -1);
      this.state.year = year; this.state.month = month;
      this.render();
    });
    Utils.on('nextMonth', 'click', () => {
      const { year, month } = Utils.addMonths(this.state.year, this.state.month, 1);
      this.state.year = year; this.state.month = month;
      this.render();
    });
  },

  getKey()     { return Utils.getMonthKey(this.state.year, this.state.month); },
  getPrevKey() {
    const { year, month } = Utils.addMonths(this.state.year, this.state.month, -1);
    return Utils.getMonthKey(year, month);
  },

  getData(key)     { return Utils.loadNested(CONFIG.STORAGE_KEYS.MONTHLY, key, {}); },
  saveData(key, d) {
    Utils.saveNested(CONFIG.STORAGE_KEYS.MONTHLY, key, d);
  },

  render() {
    const key      = this.getKey();
    const prevKey  = this.getPrevKey();
    const data     = this.getData(key);
    const prev     = this.getData(prevKey);
    const monthName = CONFIG.MONTHS_NO[this.state.month - 1] + ' ' + this.state.year;

    Utils.el('monthLabel').textContent = monthName;
    AI.setContext({ view: 'monthly', month: monthName });
    const badge = Utils.el('aiContextBadge');
    if (badge) badge.textContent = `Månedlig · ${monthName}`;

    Utils.html('monthContent', this.buildHTML(data, prev, key));
    this.bindEvents(key, data);
  },

  buildHTML(data, prev, key) {
    const kpiDefs = [
      { key: 'revenue',    label: 'Net Revenue',   fmt: v => Utils.formatKr(v) },
      { key: 'orders',     label: 'Ordre',          fmt: v => Utils.formatNum(v) },
      { key: 'aov',        label: 'Snitt AOV',      fmt: v => Utils.formatKr(v) },
      { key: 'clicks',     label: 'Klikk',          fmt: v => Utils.formatNum(v) },
      { key: 'impressions',label: 'Visninger',      fmt: v => Utils.formatNum(v) },
      { key: 'ctr',        label: 'CTR (snitt)',    fmt: v => Utils.formatPct(v) },
      { key: 'position',   label: 'Snittposisjon',  fmt: v => v ? Number(v).toFixed(1) : '–' },
    ];

    return `<div class="section-stack">

      <!-- Månedstall vs forrige måned -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.chart}</span> Månedstall</div>
          <span class="text-muted text-small">Manuell innlegging</span>
        </div>
        <div class="card-body">
          <div class="month-stat-row">
            ${kpiDefs.map(f => {
              const val  = data[f.key] || '';
              const pval = prev[f.key] || '';
              const delta = (val && pval) ? Utils.delta(Number(val), Number(pval)) : null;
              const deltaHtml = delta !== null
                ? `<div class="stat-delta ${delta >= 0 ? 'pos' : 'neg'}">${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}% vs forrige mnd</div>`
                : `<div class="stat-delta" style="color:var(--text-muted);font-size:.7rem">–</div>`;
              return `<div class="stat-card">
                <div class="stat-label">${f.label}</div>
                <input class="kpi-input month-kpi" data-key="${f.key}" type="number" value="${Utils.esc(val)}" placeholder="0" style="font-size:1.2rem">
                ${deltaHtml}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- SoMe-resultater forrige måned -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.phone}</span> SoMe-resultater forrige måned</div>
          <span class="text-muted text-small">Instagram & Facebook</span>
        </div>
        <div class="card-body">
          <div class="month-stat-row">
            ${[
              { key: 'ig_followers', label: 'IG Følgere', icon: '📸' },
              { key: 'ig_reach',     label: 'IG Rekkevidde', icon: '👁️' },
              { key: 'ig_engagement',label: 'IG Engasjement', icon: '❤️' },
              { key: 'fb_followers', label: 'FB Følgere', icon: '👥' },
              { key: 'fb_reach',     label: 'FB Rekkevidde', icon: '👁️' },
              { key: 'fb_engagement',label: 'FB Engasjement', icon: '❤️' },
            ].map(f => {
              const val  = data[f.key] || '';
              const pval = prev[f.key] || '';
              const delta = (val && pval) ? Utils.delta(Number(val), Number(pval)) : null;
              const deltaHtml = delta !== null
                ? `<div class="stat-delta ${delta >= 0 ? 'pos' : 'neg'}">${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}% vs forrige mnd</div>`
                : `<div class="stat-delta" style="color:var(--text-muted);font-size:.7rem">–</div>`;
              return `<div class="stat-card">
                <div class="stat-label">${f.icon} ${f.label}</div>
                <input class="kpi-input month-kpi" data-key="${f.key}" type="number" value="${Utils.esc(val)}" placeholder="0" style="font-size:1.2rem">
                ${deltaHtml}
              </div>`;
            }).join('')}
          </div>
          <div class="form-group" style="margin-top:12px">
            <label class="form-label" style="font-size:.75rem">Beste innlegg denne måneden</label>
            <textarea class="form-textarea" id="bestPost" placeholder="Beskriv innlegget som presterte best — plattform, tema, rekkevidde…" rows="2">${Utils.esc(data.bestPost || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Hva funket / ikke funket -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">${CONFIG.ICONS.check}</span> Hva funket</div>
          </div>
          <div class="card-body">
            <textarea class="form-textarea" id="whatWorked" placeholder="Kampanjer, innhold, kanaler som ga resultater denne måneden…" rows="5">${Utils.esc(data.whatWorked || '')}</textarea>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">${CONFIG.ICONS.xcircle}</span> Hva funket ikke</div>
          </div>
          <div class="card-body">
            <textarea class="form-textarea" id="whatDidnt" placeholder="Hva skuffet? Hva bør justeres?…" rows="5">${Utils.esc(data.whatDidnt || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Beste innhold & søkeordbevegelser -->
      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">${CONFIG.ICONS.award}</span> Beste innhold</div>
          </div>
          <div class="card-body">
            <textarea class="form-textarea" id="bestContent" placeholder="Hvilket innhold presterte best denne måneden? URL, tittel, plattform…" rows="4">${Utils.esc(data.bestContent || '')}</textarea>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">${CONFIG.ICONS.search}</span> Søkeordbevegelser</div>
          </div>
          <div class="card-body">
            <textarea class="form-textarea" id="keywordMoves" placeholder="Søkeord som klatret ↑ eller falt ↓ denne måneden…" rows="4">${Utils.esc(data.keywordMoves || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Kampanjeevaluering -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.target}</span> Kampanjeevaluering</div>
        </div>
        <div class="card-body">
          <textarea class="form-textarea" id="campaignEval" placeholder="Evaluer månedets kampanjer: mål vs. resultat, hva fungerte, hva bør endres…" rows="4">${Utils.esc(data.campaignEval || '')}</textarea>
        </div>
      </div>

      <!-- Fokus neste måned (maks 3) -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.forward}</span> Fokus neste måned</div>
          <span class="badge badge-primary">Maks 3</span>
        </div>
        <div class="card-body">
          <div class="focus-list" id="focusList"></div>
          <button class="btn-secondary btn-sm mt-8" id="addFocusBtn" style="width:100%">+ Legg til fokusområde</button>
        </div>
      </div>

      <!-- AI-kommentar -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.stars}</span> AI-kommentar</div>
          <button class="btn-ai" id="generateMonthlyAI">✨ Generer</button>
        </div>
        <div class="card-body">
          <div class="ai-diagnosis-content" id="monthlyAIText" style="min-height:60px">
            ${data.aiComment ? Utils.esc(data.aiComment) : '<span class="text-muted">Trykk «Generer» for AI-analyse av måneden.</span>'}
          </div>
        </div>
      </div>

    </div>`;
  },

  bindEvents(key, initialData) {
    // KPI inputs
    Utils.qsa('.month-kpi').forEach(input => {
      input.addEventListener('input', Utils.debounce(() => {
        const data = this.getData(key);
        Utils.qsa('.month-kpi').forEach(el => { data[el.dataset.key] = el.value; });
        this.saveData(key, data);
        this.render(); // oppdater delta
      }, 800));
    });

    // Tekstfelter
    ['whatWorked','whatDidnt','bestContent','keywordMoves','campaignEval','bestPost'].forEach(id => {
      const el = Utils.el(id);
      if (el) {
        el.addEventListener('input', Utils.debounce(() => {
          const data = this.getData(key);
          data[id] = el.value;
          this.saveData(key, data);
        }, 800));
      }
    });

    // Fokus
    this.renderFocus(key);
    Utils.on('addFocusBtn', 'click', () => this.addFocus(key));

    // AI
    Utils.on('generateMonthlyAI', 'click', async () => {
      const btn = Utils.el('generateMonthlyAI');
      const txt = Utils.el('monthlyAIText');
      btn.textContent = '⏳ Analyserer…';
      btn.disabled = true;
      if (txt) txt.innerHTML = '<span class="text-muted">Analyserer måneden…</span>';
      const data = this.getData(key);
      const comment = await AI.generateMonthlyComment(data);
      if (comment) {
        data.aiComment = comment;
        this.saveData(key, data);
        if (txt) txt.textContent = comment;
      }
      btn.textContent = '✨ Generer';
      btn.disabled = false;
    });
  },

  renderFocus(key) {
    const list = Utils.el('focusList');
    if (!list) return;
    const data  = this.getData(key);
    const items = data.focus || [];
    list.innerHTML = items.length === 0
      ? '<p class="text-muted text-small">Ingen fokusområder ennå (maks 3).</p>'
      : items.map((f, i) => `
        <div class="focus-item">
          <div class="focus-num">${i + 1}</div>
          <input class="focus-text" value="${Utils.esc(f)}" data-fi="${i}"
            style="flex:1;border:none;background:transparent;font-family:var(--font);font-size:.875rem;color:var(--text)">
          <button class="task-del focus-del" data-fi="${i}">✕</button>
        </div>`).join('');

    list.querySelectorAll('.focus-text').forEach(el => {
      el.addEventListener('change', () => {
        const data = this.getData(key);
        data.focus[Number(el.dataset.fi)] = el.value;
        this.saveData(key, data);
      });
    });
    list.querySelectorAll('.focus-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = this.getData(key);
        data.focus.splice(Number(btn.dataset.fi), 1);
        this.saveData(key, data);
        this.renderFocus(key);
      });
    });
  },

  addFocus(key) {
    const data = this.getData(key);
    if (!data.focus) data.focus = [];
    if (data.focus.length >= 3) {
      Utils.toast('Maks 3 fokusområder per måned', 'warning');
      return;
    }
    data.focus.push('');
    this.saveData(key, data);
    this.renderFocus(key);
    setTimeout(() => {
      const inputs = Utils.qsa('.focus-text');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
  },

};
