/* =============================================
   TEGNE DASHBOARD — Ukentlig visning
   ============================================= */

const Weekly = {

  state: {
    year: 0,
    week: 0,
    dayIndex: 0,
    taskFilter: 'aktive',
    taskCategory: null,
  },

  init() {
    const { year, week } = Utils.getCurrentWeek();
    this.state.year = year;
    this.state.week = week;
    this.state.dayIndex = Utils.getCurrentDayIndex();
    this.render();
    this.bindWeekNav();
  },

  /* ---- Uke-navigasjon ---- */

  bindWeekNav() {
    Utils.on('prevWeek', 'click', () => {
      const { year, week } = Utils.addWeeks(this.state.year, this.state.week, -1);
      this.state.year = year;
      this.state.week = week;
      this.render();
    });
    Utils.on('nextWeek', 'click', () => {
      const { year, week } = Utils.addWeeks(this.state.year, this.state.week, 1);
      this.state.year = year;
      this.state.week = week;
      this.render();
    });
  },

  render() {
    this.renderWeekLabel();
    this.renderDayTabs();
    this.renderDay();
  },

  renderWeekLabel() {
    const { year, week } = this.state;
    const monday = Utils.getMonday(year, week);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const label = `Uke ${week}, ${year} · ${Utils.formatDate(monday, 'short')}–${Utils.formatDate(friday, 'short')}`;
    Utils.el('weekLabel').textContent = label;
  },

  renderDayTabs() {
    const tabs = Utils.qsa('.day-tab');
    tabs.forEach((tab, i) => {
      tab.classList.toggle('active', i === this.state.dayIndex);
      const dayDate = Utils.getDayDate(this.state.year, this.state.week, i);
      const weekKey = Utils.getWeekKey(this.state.year, this.state.week);
      const weekKpi = this.getWeekKpi(weekKey);
      // has-data vises kun på mandag-fanen (der KPI skrives inn)
      const hasKpi = i === 0 && Object.values(weekKpi).some(v => v !== '' && !v.toString().startsWith('_'));
      const dayData = this.getDayData(`${weekKey}-${CONFIG.DAYS[i]}`);
      const hasDay  = Object.values(dayData).some(v => v !== '');
      tab.classList.toggle('has-data', hasKpi || hasDay);
      tab.innerHTML = `${CONFIG.DAY_SHORT[i]}<span style="display:block;font-size:.65rem;color:inherit;opacity:.7">${Utils.formatDate(dayDate,'short')}</span>`;
      tab.onclick = () => {
        this.state.dayIndex = i;
        this.renderDayTabs();
        this.renderDay();
      };
    });
  },

  getWeekKey() {
    return Utils.getWeekKey(this.state.year, this.state.week);
  },

  getDayKey() {
    return `${this.getWeekKey()}-${CONFIG.DAYS[this.state.dayIndex]}`;
  },

  /* ---- KPI per uke (kun mandag fyller inn) ---- */

  getWeekKpi(weekKey) {
    return Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_kpi', {});
  },

  saveWeekKpi(weekKey, data) {
    Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_kpi', data);
  },

  /* ---- Dag-spesifikk data (notater o.l.) ---- */

  getDayData(dayKey) {
    return Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, dayKey, {});
  },

  saveDayData(dayKey, data) {
    Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, dayKey, data);
  },

  /* ---- Hoved-render per dag ---- */

  renderDay() {
    const dayIndex = this.state.dayIndex;
    const dayKey   = this.getDayKey();
    const weekKey  = this.getWeekKey();
    const dayLabel = CONFIG.DAY_LABELS[dayIndex];
    const dayDate  = Utils.getDayDate(this.state.year, this.state.week, dayIndex);
    const isMonday    = dayIndex === 0;
    const isTuesday   = dayIndex === 1;
    const isWednesday = dayIndex === 2;
    const isThursday  = dayIndex === 3;
    const isFriday    = dayIndex === 4;
    const isCurrentWeek = Utils.isCurrentWeek(this.state.year, this.state.week);
    const dayData  = this.getDayData(dayKey);           // notater, dag-spesifikt
    const kpiData  = this.getWeekKpi(weekKey);          // ukentlige KPIer
    const prevWeek = Utils.addWeeks(this.state.year, this.state.week, -1);
    const prevWeekKey = Utils.getWeekKey(prevWeek.year, prevWeek.week);
    const prevKpiData = this.getWeekKpi(prevWeekKey);

    // Update AI context
    AI.setContext({ view: 'weekly', day: dayLabel, week: `Uke ${this.state.week}` });
    const badge = Utils.el('aiContextBadge');
    if (badge) badge.textContent = `Ukentlig · ${dayLabel} · Uke ${this.state.week}`;

    let html = `
      <div class="section-stack">

        ${this.renderCampaignStrip()}
        ${this.renderEventStrip()}
        ${this.renderDueTasksAlert()}

        ${this.renderWeekContext(weekKey, dayIndex)}

        <!-- Ukens oppgaveliste -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">${CONFIG.ICONS.tasks}</span> Ukens oppgaver</div>
            <span class="badge badge-primary" id="taskCount"></span>
          </div>
          <div class="card-body" style="padding-top:8px">
            <div class="task-filter-row" id="taskFilterRow">
              <button class="task-filter-btn active" data-filter="aktive">Aktive</button>
              <button class="task-filter-btn" data-filter="alle">Alle</button>
              <button class="task-filter-btn" data-filter="fullfort">Fullført</button>
            </div>
            <div class="platform-tag-row" id="taskCategoryFilter" style="margin-bottom:4px;margin-top:4px">
              <button class="ctag-filter active" data-cat="">Alle</button>
              ${CONFIG.TASK_CATEGORIES.map(c => `<button class="ctag-filter" data-cat="${c.id}" style="--cat-color:${c.color}">${c.label}</button>`).join('')}
            </div>
            <div id="carryForwardPanel"></div>
            <div class="task-list" id="taskList"></div>
            <div class="add-task-row" style="margin-top:6px;flex-wrap:wrap;gap:4px">
              <select id="newTaskPriority" class="task-prio-select">
                <option value="lav" selected>🟢 Lav</option>
                <option value="middels">🟡 Middels</option>
                <option value="hoy">🟠 Høy</option>
                <option value="haster">🔴 Haster</option>
              </select>
              <select id="newTaskCategory" class="task-prio-select">
                <option value="">Kategori…</option>
                ${CONFIG.TASK_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
              </select>
              <input class="add-task-input" id="newTaskInput" placeholder="Ny oppgave…" style="flex:1;min-width:120px">
              <input type="date" id="newTaskDue" class="task-due-input" title="Frist (valgfritt)">
              <button class="btn-primary btn-sm" id="addTaskBtn">+</button>
            </div>
          </div>
        </div>

        ${isMonday ? `
        <!-- KPI-innlegging — kun mandag -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span class="icon">${CONFIG.ICONS.chart}</span> Ukentlige KPIer — Uke ${this.state.week}
            </div>
            <button class="btn-ai" id="runDiagnosisBtn">✨ Diagnose</button>
          </div>
          <div class="card-body">
            ${this.renderKpiGrid(kpiData, prevKpiData)}
            ${this.renderMondayCampaigns()}
            <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <div class="ai-diagnosis-title" style="margin:0;font-size:.8rem">✨ AI-diagnose</div>
                <div style="display:flex;gap:6px;align-items:center">
                  <button class="btn-ghost-sm" id="regenerateDiagnosis" style="background:transparent;border:1px solid var(--primary);color:var(--primary);font-size:.72rem;padding:2px 8px;border-radius:4px;cursor:pointer;">↻ Regenerer</button>
                  <button class="btn-icon ai-collapse-btn" data-target="diagnosisContent" style="font-size:.75rem">${kpiData._diagnosis ? '▶' : '▼'}</button>
                </div>
              </div>
              <div class="ai-diagnosis-content" id="diagnosisContent" ${kpiData._diagnosis ? 'style="display:none"' : ''}>
                ${kpiData._diagnosis || '<span style="color:var(--text-muted);font-size:.8rem">Legg inn KPIer og trykk «Diagnose» for AI-analyse.</span>'}
              </div>
              ${kpiData._diagnosis ? this.renderActionChips(kpiData._actions || []) : ''}
            </div>
          </div>
        </div>
        ` : this.renderKpiSummary(kpiData, prevKpiData)}

        <!-- Notater -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">${CONFIG.ICONS.notes}</span> Notater</div>
          </div>
          <div class="card-body">
            <textarea class="form-textarea" id="dayNotes" placeholder="Fri notater for dagen — observasjoner, tanker, ideer…" rows="3">${Utils.esc(dayData._notes || '')}</textarea>
          </div>
        </div>

        ${isMonday ? this.renderMondayTable(weekKey) : ''}
        ${isTuesday ? this.renderTuesdaySoMe(weekKey) : ''}
        ${isWednesday ? this.renderWednesdaySection(weekKey) : ''}
        ${isThursday ? this.renderThursdaySection(weekKey) : ''}
        ${isFriday ? this.renderFridaySection(weekKey) : ''}

        <!-- Hva funket / funket ikke — alltid nederst -->
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">${CONFIG.ICONS.bulb}</span> Hva funket / funket ikke</div>
          </div>
          <div class="card-body">
            <div class="winloss-list" id="winlossList"></div>
            <div class="winloss-add-row">
              <button class="btn-primary btn-sm" id="addWinBtn" style="background:var(--green);color:#0a7c45;border:none">+ Funket</button>
              <button class="btn-primary btn-sm" id="addLossBtn" style="background:var(--red-lt);color:#b91c1c;border:none">+ Funket ikke</button>
            </div>
          </div>
        </div>

      </div>`;

    Utils.html('dayContent', html);

    // Bind all events for this day
    this.bindDayEvents(dayKey, weekKey, kpiData, dayData);
    this.renderWeekContextData(weekKey, dayIndex);
    this.initCarryForward(weekKey);
    this.renderTasks(weekKey);
    this.renderWinLoss(dayKey);
    if (isMonday)    this.renderMondayTableData(weekKey);
    if (isTuesday)   this.renderTuesdayData(weekKey);
    if (isWednesday) this.renderWednesdayData(weekKey);
    if (isThursday)  this.renderThursdayData(weekKey);
    if (isFriday)    this.renderFridayData(weekKey);
  },

  /* ---- Ukens fokus (alle dager) ---- */

  renderWeekContext(weekKey, dayIndex) {
    const isMonday = dayIndex === 0;
    const dayFocus = ['', 'SoMe', 'Nyhetsbrev', 'SEO — Kategorier', 'SEO — Avslutning'][dayIndex] || '';

    return `
      <div class="card week-context-card">
        <div class="card-header">
          <div class="card-title">
            <span class="icon">${CONFIG.ICONS.compass}</span> Ukens fokus
            ${dayFocus ? `<span class="badge badge-primary" style="font-size:.68rem;margin-left:6px">${dayFocus}</span>` : ''}
          </div>
          ${!isMonday ? `<button class="btn-ai" id="generateDayBriefBtn">✨ Dagsbriefing</button>` : ''}
        </div>
        <div class="card-body">
          <textarea class="form-textarea" id="weekPriorities" rows="2"
            placeholder="Skriv inn ukens viktigste fokus og prioriteringer…" style="margin-bottom:10px"></textarea>
          <div style="margin-bottom:6px">
            <span class="form-label" style="margin:0">🔍 Søkeord-spotlight</span>
          </div>
          <div class="kw-chips" id="keywordGrid"></div>
          <div class="kw-add-row">
            <input class="kw-add-input" id="kwAddInput" placeholder="Legg til søkeord…">
            <select class="kw-trend-sel" id="kwAddTrend">
              <option value="↑">↑</option>
              <option value="→" selected>→</option>
              <option value="↓">↓</option>
            </select>
            <button class="btn-ghost-sm" id="kwAddBtn">+</button>
          </div>
          ${!isMonday ? `
          <div id="weekContextChips" style="margin-top:10px"></div>
          <div id="dayBriefResult" style="display:none;margin-top:10px">
            <div class="divider"></div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div class="ai-diagnosis-title" style="margin:0">✨ AI-briefing</div>
              <button class="btn-icon ai-collapse-btn" data-target="dayBriefContent" style="font-size:.75rem">▼</button>
            </div>
            <div class="ai-diagnosis-content text-small" id="dayBriefContent"></div>
          </div>` : ''}
        </div>
      </div>`;
  },

  renderWeekContextData(weekKey, dayIndex) {
    const isMonday = dayIndex === 0;

    // Priorities textarea
    const priEl = Utils.el('weekPriorities');
    if (priEl) {
      priEl.value = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_priorities', '');
      priEl.addEventListener('input', Utils.debounce(() => {
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_priorities', priEl.value);
      }, 600));
    }

    // Keywords (chip-based)
    this.renderKeywords(weekKey);
    const kwAddBtn = Utils.el('kwAddBtn');
    if (kwAddBtn) {
      const addKw = () => {
        const input    = Utils.el('kwAddInput');
        const trendSel = Utils.el('kwAddTrend');
        const text = input?.value.trim() || '';
        if (!text) return;
        const kws = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);
        kws.push({ id: Utils.uid(), text, trend: trendSel?.value || '→' });
        Utils.saveNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, kws);
        if (input) input.value = '';
        this.renderKeywords(weekKey);
      };
      kwAddBtn.onclick = addKw;
      const kwInput = Utils.el('kwAddInput');
      if (kwInput) kwInput.addEventListener('keydown', e => { if (e.key === 'Enter') addKw(); });
    }

    if (isMonday) return;

    // Trend chips (Tue–Fri)
    const chipsEl = Utils.el('weekContextChips');
    if (chipsEl) {
      const table   = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {});
      const settings = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
      const banner  = settings.banner || '';
      const chipRow = (label, items, color) => {
        if (!items?.length) return '';
        return `<div class="ctx-row"><span class="ctx-label">${label}</span><div class="ctx-chips">
          ${items.slice(0, 4).map(t => `<span class="ctx-chip" style="background:${color}22;color:${color}">${Utils.esc(t)}</span>`).join('')}
        </div></div>`;
      };
      const rows = [
        chipRow('📈 Innhold ↑', table.innhold_opp, '#0a7c45'),
        chipRow('📉 Innhold ↓', table.innhold_ned, '#b91c1c'),
        chipRow('🔍 Søkeord ↑', table.sokeord_opp, '#1a5f82'),
        chipRow('🔻 Søkeord ↓', table.sokeord_ned, '#92620a'),
        banner ? `<div class="ctx-row"><span class="ctx-label">🎯 Kampanje</span><span class="ctx-chip" style="background:var(--yellow-lt);color:#92620a">${Utils.esc(banner)}</span></div>` : '',
      ].filter(Boolean).join('');
      chipsEl.innerHTML = rows ? `<div class="ctx-grid">${rows}</div>` : '';
    }

    // Saved brief — show container but start content collapsed
    const saved = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_brief_' + dayIndex, null);
    if (saved) {
      const result = Utils.el('dayBriefResult');
      const content = Utils.el('dayBriefContent');
      if (result) result.style.display = '';
      if (content) content.innerHTML = saved.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      this.collapseAI('dayBriefContent');
    }
  },

  async generateDayBrief(weekKey, dayKey) {
    const btn = Utils.el('generateDayBriefBtn');
    if (btn) { btn.textContent = '⏳ Genererer…'; btn.disabled = true; }

    const dayIndex = this.state.dayIndex;
    const dayLabel = CONFIG.DAY_LABELS[dayIndex];
    const table    = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {});
    const keywords = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);
    const settings = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
    const kpi      = this.getWeekKpi(weekKey);

    const brief = await AI.generateDailyBrief(dayLabel, { mondayTable: table, keywords, banner: settings.banner, weekKpi: kpi });

    if (brief) {
      Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_brief_' + dayIndex, brief);
      const result = Utils.el('dayBriefResult');
      const content = Utils.el('dayBriefContent');
      if (result) result.style.display = '';
      if (content) content.innerHTML = brief.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      this.collapseAI('dayBriefContent');
    }

    if (btn) { btn.textContent = '✨ Dagsbriefing'; btn.disabled = false; }
  },

  /* ---- KPI Sammendrag (tirsdag–fredag, kun lesing) ---- */

  renderKpiSummary(kpiData, prevKpiData) {
    const hasData = CONFIG.KPI_FIELDS.some(f => kpiData[f.key] !== undefined && kpiData[f.key] !== '');
    if (!hasData) return `
      <div class="card kpi-summary-collapsible">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.chart}</span> Ukentlige KPIer</div>
        </div>
        <div class="card-body">
          <p class="text-muted text-small">KPIer fylles inn på mandag. Gå til mandag-fanen for å legge inn eller redigere.</p>
        </div>
      </div>`;

    return `
      <div class="card kpi-summary-collapsible">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.chart}</span> Ukentlige KPIer</div>
          <span class="badge badge-primary">Uke ${this.state.week}</span>
        </div>
        <div class="card-body">
          <div class="kpi-grid">
            ${CONFIG.KPI_FIELDS.map(f => {
              const val = kpiData[f.key];
              if (val === undefined || val === '') return '';
              const delta = (prevKpiData && prevKpiData[f.key] !== undefined && prevKpiData[f.key] !== '')
                ? Utils.deltaHTML(Number(val), Number(prevKpiData[f.key]), f.key === 'position')
                : '<span style="height:18px;display:block"></span>';
              const threshCls = this.getKpiThresholdClass(f.key, val);
              const sparklineKeys = ['revenue', 'clicks', 'position'];
              const sparkline = sparklineKeys.includes(f.key)
                ? this.renderSparkline(this.getSparklineData(f.key), f.key === 'position')
                : '';
              return `<div class="kpi-field ${threshCls}">
                <div class="kpi-label-row">
                  <span class="kpi-label">${f.label}</span>
                  ${f.auto ? '<span class="kpi-auto-badge">auto</span>' : ''}
                  ${threshCls ? `<span class="kpi-thresh-icon">${threshCls === 'kpi-err' ? '🔴' : '⚠️'}</span>` : ''}
                  ${f.tooltip ? `<button class="kpi-help" data-tooltip="${f.tooltip}" type="button" tabindex="-1">?</button>` : ''}
                </div>
                <div class="kpi-value-static">${f.prefix || ''}${val}${f.suffix || ''}</div>
                ${delta}
                ${sparkline}
              </div>`;
            }).join('')}
          </div>
          ${kpiData._diagnosis ? `
          <div style="margin-top:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div class="ai-diagnosis-title" style="margin:0;font-size:.8rem">✨ Ukens diagnose</div>
              <button class="btn-icon ai-collapse-btn" data-target="kpiDiagnosisContent" style="font-size:.75rem">▶</button>
            </div>
            <div class="ai-diagnosis-content" id="kpiDiagnosisContent" style="font-size:.8rem;display:none">${Utils.esc(kpiData._diagnosis)}</div>
          </div>` : ''}
        </div>
      </div>`;
  },

  /* ---- KPI Grid ---- */

  /* ---- Sparkline ---- */

  getSparklineData(kpiKey, weeks = 6) {
    const { year, week } = this.state;
    const values = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const w = Utils.addWeeks(year, week, -i);
      const wKey = Utils.getWeekKey(w.year, w.week);
      const kpi = this.getWeekKpi(wKey);
      const v = kpi[kpiKey];
      values.push(v !== undefined && v !== '' ? Number(v) : null);
    }
    return values;
  },

  renderSparkline(values, inverted = false, width = 80, height = 24) {
    const valid = values.filter(v => v !== null);
    if (valid.length < 2) return '';
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    const step = width / (values.length - 1);

    const points = values.map((v, i) => {
      const x = i * step;
      const norm = (v === null) ? null : (v - min) / range;
      const y = inverted
        ? height - 2 - norm * (height - 4)
        : 2 + (1 - norm) * (height - 4);
      return v === null ? null : `${x.toFixed(1)},${y.toFixed(1)}`;
    }).filter(Boolean);

    const last = values[values.length - 1];
    const prev = values[values.length - 2];
    const trending = (last !== null && prev !== null)
      ? (inverted ? last < prev : last > prev)
      : null;
    const color = trending === true ? '#0a7c45' : trending === false ? '#eb5857' : '#247ca7';

    return `<svg class="kpi-sparkline" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  },

  getKpiThresholdClass(key, val) {
    if (val === '' || val === undefined) return '';
    const thresh = (Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {}).thresholds) || {};
    const n = Number(val);
    if (key === 'position') {
      if (thresh.thresh_position_err && n > thresh.thresh_position_err) return 'kpi-err';
      if (thresh.thresh_position_warn && n > thresh.thresh_position_warn) return 'kpi-warn';
    }
    if (key === 'revenue' && thresh.thresh_revenue_warn && n < thresh.thresh_revenue_warn) return 'kpi-warn';
    if (key === 'ctr'     && thresh.thresh_ctr_warn     && n < thresh.thresh_ctr_warn)     return 'kpi-warn';
    return '';
  },

  renderKpiGrid(kpiData, prevKpiData) {
    return `<div class="kpi-grid">
      ${CONFIG.KPI_FIELDS.map(f => {
        const val = kpiData[f.key] !== undefined ? kpiData[f.key] : '';
        const delta = prevKpiData && prevKpiData[f.key] !== undefined && val !== ''
          ? Utils.deltaHTML(Number(val), Number(prevKpiData[f.key]), f.key === 'position')
          : '<span style="height:18px;display:block"></span>';
        const threshCls = this.getKpiThresholdClass(f.key, val);
        return `
        <div class="kpi-field ${threshCls}">
          <div class="kpi-label-row">
            <span class="kpi-label">${f.label}</span>
            ${f.auto ? '<span class="kpi-auto-badge">auto</span>' : ''}
            ${threshCls ? `<span class="kpi-thresh-icon" title="Utenfor terskelgrense">${threshCls === 'kpi-err' ? '🔴' : '⚠️'}</span>` : ''}
            ${f.tooltip ? `<button class="kpi-help" data-tooltip="${f.tooltip}" type="button" tabindex="-1">?</button>` : ''}
          </div>
          <input
            class="kpi-input"
            type="number"
            step="${f.step || '1'}"
            placeholder="${f.placeholder}"
            value="${Utils.esc(val)}"
            data-key="${f.key}"
            inputmode="decimal"
            autocomplete="off"
            ${f.auto ? 'readonly' : ''}
          >
          ${delta}
        </div>`;
      }).join('')}
    </div>`;
  },

  renderActionChips(actions) {
    if (!actions || actions.length === 0) return '';
    return `<div class="ai-diagnosis-actions">
      ${actions.map(a => `<span class="action-chip">→ ${Utils.esc(a)}</span>`).join('')}
    </div>`;
  },

  /* ---- Keyword Spotlight ---- */

  renderKeywordSpotlight(weekKey) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.search}</span> Søkeord-spotlight denne uka</div>
          <button class="btn-ai btn-sm" id="addKeywordBtn">+ Søkeord</button>
        </div>
        <div class="card-body">
          <div class="keyword-grid" id="keywordGrid"></div>
          <p class="text-small text-muted mt-8">Følg 3–5 søkeord tett denne uka. Noter posisjon og trend.</p>
        </div>
      </div>`;
  },

  renderKeywords(weekKey) {
    const grid = Utils.el('keywordGrid');
    if (!grid) return;
    const keywords = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);

    const trendStyle = {
      '↑': { bg: '#0a7c4520', color: '#0a7c45' },
      '→': { bg: '#1a5f8220', color: '#1a5f82' },
      '↓': { bg: '#b91c1c20', color: '#b91c1c' },
    };

    if (keywords.length === 0) {
      grid.innerHTML = '<span class="text-muted text-small" style="font-style:italic">Ingen søkeord lagt til ennå.</span>';
      return;
    }

    grid.innerHTML = keywords.map(kw => {
      const ts = trendStyle[kw.trend] || trendStyle['→'];
      return `<span class="kw-chip" data-kwid="${kw.id}" style="background:${ts.bg};color:${ts.color}">
        <span class="kw-chip-trend">${kw.trend}</span> ${Utils.esc(kw.text)}
        <button class="kw-chip-del" data-kwid="${kw.id}">✕</button>
      </span>`;
    }).join('');

    grid.querySelectorAll('.kw-chip-del').forEach(btn => {
      btn.addEventListener('click', () => {
        const kws = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);
        const updated = kws.filter(k => k.id !== btn.dataset.kwid);
        Utils.saveNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, updated);
        this.renderKeywords(weekKey);
      });
    });
  },

  saveKeyword(weekKey, kwId, grid) {
    const row = grid.querySelector(`[data-kwid="${kwId}"].keyword-row`) || grid;
    const kws = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);
    const idx = kws.findIndex(k => k.id === kwId);
    if (idx === -1) return;
    const textEl = grid.querySelector(`.kw-text[data-kwid="${kwId}"]`);
    const posEl  = grid.querySelector(`.kw-pos[data-kwid="${kwId}"]`);
    const trendEl= grid.querySelector(`.kw-trend[data-kwid="${kwId}"]`);
    if (textEl) kws[idx].text = textEl.value;
    if (posEl)  kws[idx].position = posEl.value;
    if (trendEl)kws[idx].trend = trendEl.value;
    Utils.saveNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, kws);
  },

  /* ---- Tirsdag — SoMe-dag ---- */

  renderTuesdaySoMe(weekKey) {
    return `
      <!-- Ukens innleggsplan -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.phone}</span> Ukens innleggsplan</div>
        </div>
        <div class="card-body">
          <div class="platform-tag-row" id="platformTags" style="margin-bottom:6px">
            <button class="ptag" data-p="Instagram">📸 Instagram</button>
            <button class="ptag" data-p="Facebook">👥 Facebook</button>
            <button class="ptag" data-p="TikTok">🎵 TikTok</button>
            <button class="ptag" data-p="Pinterest">📌 Pinterest</button>
          </div>
          <div class="platform-tag-row" id="postStoreTags" style="margin-bottom:6px">
            ${CONFIG.STORES.map(s => `<button class="stag" data-s="${s.id}">${s.icon} ${s.label}</button>`).join('')}
          </div>
          <div class="platform-tag-row" id="postCampaignTags" style="margin-bottom:8px">
            ${(() => {
              const list = this.getWeekCampaigns();
              if (!list.length) return '<span style="font-size:.72rem;color:var(--text-muted)">Ingen aktive kampanjer</span>';
              return list.map(c => {
                const tc = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
                return `<button class="ctag" data-c="${c.id}" style="--ctag-color:${tc?.color||'var(--primary)'};">${Utils.esc(c.name)}</button>`;
              }).join('');
            })()}
          </div>
          <div class="add-task-row" style="margin-bottom:10px">
            <input class="add-task-input" id="newPostInput" placeholder="Beskriv innlegget…">
            <button class="btn-primary btn-sm" id="addPostBtn">+</button>
          </div>
          <div id="postPlanList"></div>
          <div style="margin-top:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div class="ai-diagnosis-title" style="margin:0;font-size:.8rem">✨ AI-ideer til innlegg</div>
              <div style="display:flex;gap:6px;align-items:center">
                <button class="btn-ghost-sm" id="generatePostPlanBtn" style="background:transparent;border:1px solid var(--primary);color:var(--primary);font-size:.72rem;padding:2px 8px;border-radius:4px;cursor:pointer;">Generer</button>
                <button class="btn-icon ai-collapse-btn" data-target="postPlanAIContent" style="font-size:.75rem">▼</button>
              </div>
            </div>
            <div class="ai-diagnosis-content text-small" id="postPlanAIContent">
              <span class="text-muted" style="font-style:italic">Trykk «Generer» for AI-ideer til ukens innlegg.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- TikTok / Pinterest påminnelse -->
      <div class="card" style="border-left:4px solid var(--yellow)">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.target}</span> TikTok &amp; Pinterest — påminnelse</div>
        </div>
        <div class="card-body">
          <p class="text-small text-muted" style="margin-bottom:10px">Ikke aktive kanaler nå, men et godt tidspunkt å vurdere om noe er verdt å gjenbruke.</p>
          <textarea class="form-textarea" id="ttPinterestNotes" placeholder="Notater om TikTok/Pinterest — ideer, timing, hva som kan gjenbrukes fra IG…" rows="2"></textarea>
        </div>
      </div>`;
  },

  renderTuesdayData(weekKey) {
    const data = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', {});

    // Fyll inn SoMe-statistikk
    Utils.qsa('.some-stat').forEach(input => {
      const key = `${input.dataset.platform}_${input.dataset.stat}`;
      if (data[key] !== undefined) input.value = data[key];
    });

    // Fyll inn TT/Pinterest-notater
    const ttEl = Utils.el('ttPinterestNotes');
    if (ttEl && data.ttNotes) ttEl.value = data.ttNotes;

    // Fyll inn innleggsplan — legg til 3 tomme slots første gang
    const tuesdayMeta = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', {});
    if (!tuesdayMeta._postsInitialized) {
      const existingPosts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', []);
      if (existingPosts.length === 0) {
        const defaults = [
          { id: Utils.uid(), platform: 'Instagram', text: '', done: false },
          { id: Utils.uid(), platform: 'Facebook', text: '', done: false },
          { id: Utils.uid(), platform: 'Instagram', text: '', done: false },
        ];
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', defaults);
      }
      tuesdayMeta._postsInitialized = true;
      Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', tuesdayMeta);
    }
    this.renderPostPlan(weekKey);

    // Lagrede AI-innleggsideer
    if (data.postPlanIdeas) this.displayPostPlanIdeas(data.postPlanIdeas);

    // Lagre SoMe-statistikk ved endring
    const saveSoMe = Utils.debounce(() => {
      const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', {});
      Utils.qsa('.some-stat').forEach(input => {
        d[`${input.dataset.platform}_${input.dataset.stat}`] = input.value;
      });
      Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', d);
    }, 600);
    Utils.qsa('.some-stat').forEach(input => input.addEventListener('input', saveSoMe));

    // TT/Pinterest notater
    if (ttEl) {
      ttEl.addEventListener('input', Utils.debounce(() => {
        const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', {});
        d.ttNotes = ttEl.value;
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', d);
      }, 800));
    }

    // Legg til innlegg
    Utils.on('addPostBtn', 'click', () => this.addPost(weekKey));
    Utils.on('newPostInput', 'keydown', e => { if (e.key === 'Enter') this.addPost(weekKey); });

    // Generer innleggsplan med AI
    Utils.on('generatePostPlanBtn', 'click', async () => {
      const btn = Utils.el('generatePostPlanBtn');
      btn.textContent = '⏳…';
      btn.disabled = true;
      const kpi = this.getWeekKpi(weekKey);
      const keywords = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);
      const settings = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
      const suggestions = await AI.generatePostPlan({ kpi, keywords, banner: settings.banner });
      if (suggestions) {
        const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', {});
        d.postPlanIdeas = suggestions;
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_tuesday', d);
        this.displayPostPlanIdeas(suggestions);
      } else {
        Utils.toast('Fikk ikke svar fra AI — sjekk API-nøkkel i innstillinger', 'error');
      }
      btn.textContent = 'Generer';
      btn.disabled = false;
    });

  },

  renderPostPlan(weekKey) {
    const list = Utils.el('postPlanList');
    if (!list) return;
    const posts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', []);
    const platformColors = { Instagram: '#e1306c', Facebook: '#1877f2', TikTok: '#010101', Pinterest: '#e60023' };
    const allCampaigns = typeof Campaigns !== 'undefined' ? Campaigns.getData() : [];

    // Bind tag toggles
    Utils.qsa('.ptag').forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('active')));
    Utils.qsa('.ctag').forEach(btn => btn.addEventListener('click', () => {
      Utils.qsa('.ctag').forEach(b => b.classList.remove('active'));
      btn.classList.toggle('active');
    }));

    if (posts.length === 0) {
      list.innerHTML = '<p class="text-muted text-small">Ingen innlegg planlagt ennå.</p>';
      return;
    }
    list.innerHTML = posts.map(p => {
      const platforms = p.platforms || (p.platform ? [p.platform] : ['Instagram']);
      const platBadges = platforms.map(pl =>
        `<span class="badge" style="background:${platformColors[pl]||'#888'}22;color:${platformColors[pl]||'#888'};font-size:.68rem;margin-right:2px">${pl}</span>`
      ).join('');
      const storeBadges = (p.stores || []).map(sid => {
        const s = CONFIG.STORES.find(x => x.id === sid);
        return s ? `<span class="badge" style="background:#247ca715;color:var(--primary-dk);font-size:.65rem">${s.icon} ${s.label}</span>` : '';
      }).join('');
      const campaignBadge = (() => {
        if (!p.campaignId) return '';
        const c = allCampaigns.find(x => x.id === p.campaignId);
        if (!c) return '';
        const tc = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
        return `<span class="campaign-type-badge" style="background:${tc?.color||'var(--primary)'};color:${tc?.textColor||'#fff'};font-size:.62rem">${Utils.esc(c.name)}</span>`;
      })();
      return `
      <div class="task-item" data-pid="${p.id}">
        <div class="task-checkbox ${p.done ? 'checked' : ''}" data-pid="${p.id}">${p.done ? '✓' : ''}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:2px">${platBadges}${storeBadges}${campaignBadge}</div>
          <span class="task-text ${p.done ? 'done' : ''}" style="font-size:.85rem">${p.text ? Utils.esc(p.text) : '<span style="color:var(--text-muted);font-style:italic">Beskriv innlegget…</span>'}</span>
        </div>
        <button class="task-del post-del" data-pid="${p.id}">✕</button>
      </div>`;
    }).join('');

    list.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        const posts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', []);
        const p = posts.find(p => p.id === cb.dataset.pid);
        if (p) { p.done = !p.done; Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', posts); }
        this.renderPostPlan(weekKey);
      });
    });
    list.querySelectorAll('.post-del').forEach(btn => {
      btn.addEventListener('click', () => {
        let posts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', []);
        posts = posts.filter(p => p.id !== btn.dataset.pid);
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', posts);
        this.renderPostPlan(weekKey);
      });
    });
  },

  addPost(weekKey) {
    const input = Utils.el('newPostInput');
    if (!input || !input.value.trim()) return;
    const platforms   = [...Utils.qsa('.ptag.active')].map(b => b.dataset.p);
    const stores      = [...Utils.qsa('#postStoreTags .stag.active')].map(b => b.dataset.s);
    const campaignId  = Utils.qsa('#postCampaignTags .ctag.active')[0]?.dataset.c || null;
    const posts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', []);
    posts.push({ id: Utils.uid(), platforms: platforms.length ? platforms : ['Instagram'], stores, campaignId, text: input.value.trim(), done: false });
    Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_posts', posts);
    input.value = '';
    Utils.qsa('.ptag, .stag, .ctag').forEach(b => b.classList.remove('active'));
    this.renderPostPlan(weekKey);
  },

  displayPostPlanIdeas(text) {
    const content = Utils.el('postPlanAIContent');
    if (!content || !text) return;
    content.innerHTML = text
      .replace(/\[Instagram\]/g, '<strong>📸 Instagram</strong>')
      .replace(/\[Facebook\]/g,  '<strong>👥 Facebook</strong>')
      .replace(/\[TikTok\]/g,    '<strong>🎵 TikTok</strong>')
      .replace(/\[Pinterest\]/g, '<strong>📌 Pinterest</strong>')
      .replace(/\n/g, '<br>');
    this.collapseAI('postPlanAIContent');
  },

  displaySoMeSuggestions(suggestions) {
    const container = Utils.el('soMeSuggestions');
    if (!container || !suggestions?.length) return;
    const platformColors = { Instagram: '#e1306c', Facebook: '#1877f2' };
    container.innerHTML = suggestions.map(s => `
      <div class="friday-article-card" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span class="badge" style="background:${platformColors[s.platform] || '#888'}22;color:${platformColors[s.platform] || '#888'}">${s.platform}</span>
          <span class="text-small text-muted">${Utils.esc(s.format || '')}</span>
        </div>
        <div style="font-weight:600;font-size:.875rem;margin-bottom:4px">${Utils.esc(s.title)}</div>
        <div class="text-small text-muted" style="margin-bottom:6px">${Utils.esc(s.description)}</div>
        ${s.caption ? `<div style="font-size:.8rem;background:var(--gray);padding:8px;border-radius:6px;font-style:italic">"${Utils.esc(s.caption)}"</div>` : ''}
      </div>`).join('');
  },

  /* ---- Onsdag — Nyhetsbrev-dag ---- */

  renderWednesdaySection(weekKey) {
    return `
      <!-- AI nyhetsbrev-ideer -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.mail}</span> Nyhetsbrev-ideer</div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn-ai" id="generateNewsletterBtn">✨ AI-ideer</button>
            <button class="btn-icon ai-collapse-btn" data-target="newsletterIdeas" style="font-size:.75rem">▼</button>
          </div>
        </div>
        <div class="card-body" id="newsletterIdeas">
          <p class="text-muted text-small">Trykk «AI-ideer» for 3–4 nyhetsbrev-forslag basert på ukens fokus og trender.</p>
        </div>
      </div>

      <!-- Innholdsblokker -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.layout}</span> Innholdsblokker</div>
        </div>
        <div class="card-body">
          <div id="newsletterBlocks"></div>
        </div>
      </div>

      <!-- Statistikk forrige nyhetsbrev -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.chart}</span> Forrige nyhetsbrev — statistikk</div>
        </div>
        <div class="card-body">
          <div class="kpi-grid" style="grid-template-columns:1fr 1fr">
            <div class="kpi-field"><label class="kpi-label">Åpningsrate</label><div style="display:flex;align-items:center;gap:4px"><input class="kpi-input nl-stat" data-stat="open_rate" type="number" step="0.1" placeholder="0.0" style="flex:1"><span class="text-muted text-small">%</span></div></div>
            <div class="kpi-field"><label class="kpi-label">Klikkrate</label><div style="display:flex;align-items:center;gap:4px"><input class="kpi-input nl-stat" data-stat="click_rate" type="number" step="0.1" placeholder="0.0" style="flex:1"><span class="text-muted text-small">%</span></div></div>
            <div class="kpi-field"><label class="kpi-label">Abonnenter</label><input class="kpi-input nl-stat" data-stat="subscribers" type="number" placeholder="0"></div>
            <div class="kpi-field"><label class="kpi-label">Beste emne / lenke</label><input class="kpi-input nl-stat" data-stat="best" type="text" placeholder="…" style="font-size:.8rem"></div>
          </div>
        </div>
      </div>

`;
  },

  renderWednesdayData(weekKey) {
    const data = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', {});

    // Statistikk forrige nyhetsbrev
    Utils.qsa('.nl-stat').forEach(input => {
      if (data[input.dataset.stat] !== undefined) input.value = data[input.dataset.stat];
    });
    const saveNl = Utils.debounce(() => {
      const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', {});
      Utils.qsa('.nl-stat').forEach(input => { d[input.dataset.stat] = input.value; });
      Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', d);
    }, 600);
    Utils.qsa('.nl-stat').forEach(input => input.addEventListener('input', saveNl));

    // Innholdsblokker
    const blocksEl = Utils.el('newsletterBlocks');
    if (blocksEl) {
      const blocks = [
        { key: 'produktfokus', label: '🛍️ Produktfokus' },
        { key: 'blogglenke',   label: '✍️ Blogglenke' },
        { key: 'kampanje',     label: '🎯 Kampanje-CTA' },
        { key: 'tips',         label: '💡 Tips / inspirasjon' },
        { key: 'annet',        label: '📌 Annet' },
      ];
      blocksEl.innerHTML = blocks.map(b => `
        <div class="nl-block-row">
          <div class="task-checkbox nl-block-check ${data['blk_' + b.key] ? 'checked' : ''}" data-bkey="${b.key}">
            ${data['blk_' + b.key] ? '✓' : ''}
          </div>
          <label class="nl-block-label">${b.label}</label>
          <input class="nl-block-input" data-bkey="${b.key}" value="${Utils.esc(data['txt_' + b.key] || '')}" placeholder="Beskriv innholdet…">
        </div>`).join('');

      const saveBlocks = Utils.debounce(() => {
        const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', {});
        blocksEl.querySelectorAll('.nl-block-input').forEach(inp => { d['txt_' + inp.dataset.bkey] = inp.value; });
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', d);
      }, 600);
      blocksEl.querySelectorAll('.nl-block-input').forEach(inp => inp.addEventListener('input', saveBlocks));
      blocksEl.querySelectorAll('.nl-block-check').forEach(cb => {
        cb.addEventListener('click', () => {
          const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', {});
          d['blk_' + cb.dataset.bkey] = !d['blk_' + cb.dataset.bkey];
          Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', d);
          cb.classList.toggle('checked', d['blk_' + cb.dataset.bkey]);
          cb.textContent = d['blk_' + cb.dataset.bkey] ? '✓' : '';
        });
      });
    }

    // Lagrede AI-ideer
    if (data.nlIdeas) this.displayNewsletterIdeas(data.nlIdeas);

    // Generer AI-ideer
    Utils.on('generateNewsletterBtn', 'click', async () => {
      const btn = Utils.el('generateNewsletterBtn');
      btn.textContent = '⏳ Genererer…';
      btn.disabled = true;
      const table    = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {});
      const keywords = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);
      const settings = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
      const kpi      = this.getWeekKpi(weekKey);
      const priorities = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_priorities', '');
      const result = await AI.generateNewsletterIdeas({ mondayTable: table, keywords, banner: settings.banner, weekKpi: kpi, priorities });
      if (result) {
        const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', {});
        d.nlIdeas = result;
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_wednesday', d);
        this.displayNewsletterIdeas(result);
      }
      btn.textContent = '✨ AI-ideer';
      btn.disabled = false;
    });
  },

  displayNewsletterIdeas(ideas) {
    const container = Utils.el('newsletterIdeas');
    if (!container || !ideas?.length) return;
    container.innerHTML = ideas.map((idea, i) => `
      <div class="nl-idea-card">
        <div class="nl-idea-num">${i + 1}</div>
        <div>
          <div style="font-weight:700;font-size:.875rem;margin-bottom:2px">${Utils.esc(idea.emne)}</div>
          <div class="text-small text-muted" style="margin-bottom:4px">${Utils.esc(idea.vinkel)}</div>
          ${idea.emnelinje ? `<div style="font-size:.78rem;background:var(--primary-lt);color:var(--primary);padding:3px 8px;border-radius:4px;display:inline-block">✉️ ${Utils.esc(idea.emnelinje)}</div>` : ''}
        </div>
      </div>`).join('');
    this.collapseAI('newsletterIdeas');
  },

  /* ---- Mandagsanalyse ---- */

  renderMondayTable(weekKey) {
    return `
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.trending}</span> Ukeoversikt — Mandagsanalyse</div>
          <button class="btn-ai" id="generateMondayAI">✨ AI-analyse</button>
        </div>
        <div class="card-body">
          <div class="monday-table" id="mondayTable"></div>
          <div class="ai-diagnosis mt-12" id="mondayAIComment" style="display:none">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <div class="ai-diagnosis-title" style="margin:0">✨ AI-observasjon</div>
              <button class="btn-icon ai-collapse-btn" data-target="mondayAIText" style="font-size:.75rem">▼</button>
            </div>
            <div class="ai-diagnosis-content" id="mondayAIText"></div>
          </div>
        </div>
      </div>`;
  },

  renderMondayTableData(weekKey) {
    const table = Utils.el('mondayTable');
    if (!table) return;
    const data = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {
      innhold_opp: [], innhold_ned: [], sokeord_opp: [], sokeord_ned: []
    });
    const cols = [
      { key: 'innhold_opp', label: '📈 Innhold på vei opp',  cls: 'col-up' },
      { key: 'innhold_ned', label: '📉 Innhold på vei ned',  cls: 'col-down' },
      { key: 'sokeord_opp', label: '🔍 Søkeord på vei opp',  cls: 'col-prod' },
      { key: 'sokeord_ned', label: '🔻 Søkeord på vei ned',  cls: 'col-care' },
    ];
    table.innerHTML = cols.map(col => `
      <div class="monday-col ${col.cls}">
        <div class="monday-col-header">${col.label}</div>
        <div class="monday-col-body">
          <div class="monday-tag-list" id="tags-${col.key}">
            ${(data[col.key] || []).map(tag => `
              <span class="monday-tag" data-col="${col.key}" data-tag="${Utils.esc(tag)}">
                ${Utils.esc(tag)}
                <button class="tag-remove" data-col="${col.key}" data-tag="${Utils.esc(tag)}" style="background:none;border:none;cursor:pointer;font-size:.8rem;padding:0 2px;line-height:1">✕</button>
              </span>`).join('')}
          </div>
          <input class="monday-tag-input" data-col="${col.key}" placeholder="+ Legg til…">
        </div>
      </div>`).join('');

    // Events
    table.querySelectorAll('.monday-tag-input').forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && input.value.trim()) {
          const d = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {innhold_opp:[],innhold_ned:[],sokeord_opp:[],sokeord_ned:[]});
          d[input.dataset.col] = [...(d[input.dataset.col] || []), input.value.trim()];
          Utils.saveNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, d);
          input.value = '';
          this.renderMondayTableData(weekKey);
        }
      });
    });
    table.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const d = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {innhold_opp:[],innhold_ned:[],sokeord_opp:[],sokeord_ned:[]});
        d[btn.dataset.col] = (d[btn.dataset.col] || []).filter(t => t !== btn.dataset.tag);
        Utils.saveNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, d);
        this.renderMondayTableData(weekKey);
      });
    });

    const savedComment = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey + '_comment', null);
    if (savedComment) {
      const commentBox = Utils.el('mondayAIComment');
      const commentText = Utils.el('mondayAIText');
      if (commentBox) commentBox.style.display = '';
      if (commentText) commentText.textContent = savedComment;
      this.collapseAI('mondayAIText');
    }

    Utils.on('generateMondayAI', 'click', async () => {
      const btn = Utils.el('generateMondayAI');
      btn.textContent = '⏳ Analyserer…';
      btn.disabled = true;
      const tableData = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {});
      const prevWeek = Utils.addWeeks(this.state.year, this.state.week, -1);
      const prevWeekKey = Utils.getWeekKey(prevWeek.year, prevWeek.week);
      const allDaysData = CONFIG.DAYS.map(d => this.getDayData(`${weekKey}-${d}`));
      const prevAllDays = CONFIG.DAYS.map(d => this.getDayData(`${prevWeekKey}-${d}`));
      const result = await AI.generateMondayAnalysis({ table: tableData, kpis: allDaysData }, { kpis: prevAllDays });
      if (result) {
        ['innhold_opp', 'innhold_ned', 'sokeord_opp', 'sokeord_ned'].forEach(col => {
          if (result[col]) {
            const d = Utils.loadNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, {innhold_opp:[],innhold_ned:[],sokeord_opp:[],sokeord_ned:[]});
            d[col] = [...new Set([...(d[col] || []), ...result[col]])];
            Utils.saveNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey, d);
          }
        });
        this.renderMondayTableData(weekKey);
      }
      // Bruk analyse-feltet fra samme respons i stedet for et ekstra AI-kall
      const comment = result?.analyse || null;
      if (comment) {
        Utils.saveNested(CONFIG.STORAGE_KEYS.MONDAY_TABLE, weekKey + '_comment', comment);
        const commentBox = Utils.el('mondayAIComment');
        const commentText = Utils.el('mondayAIText');
        if (commentBox) commentBox.style.display = '';
        if (commentText) commentText.textContent = comment;
        this.collapseAI('mondayAIText');
      }
      btn.textContent = '✨ AI-analyse';
      btn.disabled = false;
    });
  },

  /* ---- Torsdagseksjon (SEO dag 1) ---- */

  renderThursdaySection(weekKey) {
    const checks = [
      { key: 'chk_kategori',  label: 'Kategoritekst skrevet / oppdatert' },
      { key: 'chk_meta',      label: 'Meta-titler og -beskrivelser sjekket' },
      { key: 'chk_linking',   label: 'Intern linking gjennomgått' },
      { key: 'chk_teknisk',   label: 'Teknisk sjekk (404, sidehastiget)' },
    ];
    return `
      <!-- SEO-sjekkliste -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.check}</span> SEO-sjekkliste denne uka</div>
        </div>
        <div class="card-body">
          <div id="seoChecklist">
            ${checks.map(c => `
              <div class="nl-block-row">
                <div class="task-checkbox seo-check" data-ckey="${c.key}"></div>
                <label class="nl-block-label">${c.label}</label>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Kategorier denne uka -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.folder}</span> Kategorier denne uka</div>
        </div>
        <div class="card-body">
          <div id="seoCategoryList"></div>
          <div class="add-task-row" style="margin-top:10px">
            <input class="add-task-input" id="newCatInput" placeholder="Kategorinavn…">
            <button class="btn-primary btn-sm" id="addCatBtn">+</button>
          </div>
        </div>
      </div>

      <!-- Teknisk SEO-notater -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.tool}</span> Teknisk SEO — funn og notater</div>
        </div>
        <div class="card-body">
          <textarea class="form-textarea" id="technicalSeoNotes" rows="3"
            placeholder="404-sider, crawl-feil, sidehastiget, schema-markup, andre tekniske funn…"></textarea>
        </div>
      </div>`;
  },

  renderThursdayData(weekKey) {
    const data = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_thursday', {});
    const checks = ['chk_kategori', 'chk_meta', 'chk_linking', 'chk_teknisk'];

    // Sjekkliste
    const checklistEl = Utils.el('seoChecklist');
    if (checklistEl) {
      checks.forEach(key => {
        const cb = checklistEl.querySelector(`[data-ckey="${key}"]`);
        if (cb && data[key]) { cb.classList.add('checked'); cb.textContent = '✓'; }
      });
      checklistEl.querySelectorAll('.seo-check').forEach(cb => {
        cb.addEventListener('click', () => {
          const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_thursday', {});
          d[cb.dataset.ckey] = !d[cb.dataset.ckey];
          Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_thursday', d);
          cb.classList.toggle('checked', d[cb.dataset.ckey]);
          cb.textContent = d[cb.dataset.ckey] ? '✓' : '';
        });
      });
    }

    // Kategoriliste
    this.renderSeoCategories(weekKey);
    Utils.on('addCatBtn', 'click', () => this.addSeoCategory(weekKey));
    Utils.on('newCatInput', 'keydown', e => { if (e.key === 'Enter') this.addSeoCategory(weekKey); });

    // Teknisk SEO-notater
    const notesEl = Utils.el('technicalSeoNotes');
    if (notesEl) {
      if (data.technicalNotes) notesEl.value = data.technicalNotes;
      notesEl.addEventListener('input', Utils.debounce(() => {
        const d = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_thursday', {});
        d.technicalNotes = notesEl.value;
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_thursday', d);
      }, 600));
    }
  },

  renderSeoCategories(weekKey) {
    const list = Utils.el('seoCategoryList');
    if (!list) return;
    const cats = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_cats', []);
    const statuses = ['Planlagt', 'Under arbeid', 'Ferdig'];
    const statusColors = {
      'Planlagt':     { bg: 'var(--gray)',       color: 'var(--text-soft)' },
      'Under arbeid': { bg: 'var(--primary-lt)', color: 'var(--primary)' },
      'Ferdig':       { bg: 'var(--green-lt)',   color: '#0a7c45' },
    };

    if (cats.length === 0) {
      list.innerHTML = '<p class="text-muted text-small">Ingen kategorier lagt til ennå.</p>';
      return;
    }

    list.innerHTML = cats.map(cat => {
      const sc = statusColors[cat.status] || statusColors['Planlagt'];
      return `
        <div class="task-item-v2" data-catid="${cat.id}">
          <div class="task-prio-bar" style="background:var(--primary)"></div>
          <span class="task-text-v2" style="flex:1">${Utils.esc(cat.name)}</span>
          <select class="task-status-sel" data-catid="${cat.id}" style="background:${sc.bg};color:${sc.color}">
            ${statuses.map(s => `<option ${cat.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="task-del cat-del" data-catid="${cat.id}" style="opacity:1">✕</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.task-status-sel').forEach(sel => {
      sel.addEventListener('change', () => {
        const cats = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_cats', []);
        const cat = cats.find(c => c.id === sel.dataset.catid);
        if (cat) { cat.status = sel.value; Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_cats', cats); }
        this.renderSeoCategories(weekKey);
      });
    });
    list.querySelectorAll('.cat-del').forEach(btn => {
      btn.addEventListener('click', () => {
        let cats = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_cats', []);
        cats = cats.filter(c => c.id !== btn.dataset.catid);
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_cats', cats);
        this.renderSeoCategories(weekKey);
      });
    });
  },

  addSeoCategory(weekKey) {
    const input = Utils.el('newCatInput');
    if (!input || !input.value.trim()) return;
    const cats = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_cats', []);
    cats.push({ id: Utils.uid(), name: input.value.trim(), status: 'Planlagt' });
    Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_cats', cats);
    input.value = '';
    this.renderSeoCategories(weekKey);
  },

  /* ---- Fredagseksjon ---- */

  renderFridaySection(weekKey) {
    return `
      <!-- Ukens oppgavepåminnelse -->
      <div class="card" style="border-left:4px solid var(--green)">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.tasks}</span> Har du rukket alt denne uken?</div>
        </div>
        <div class="card-body" id="fridayTaskSummary">
          <p class="text-muted text-small">Laster oppgaveoversikt…</p>
        </div>
      </div>

      <!-- Ukens funn oppsummering -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.bulb}</span> Ukens funn — hva funket?</div>
        </div>
        <div class="card-body" id="fridayWinLossSummary">
          <p class="text-muted text-small">Laster ukens funn…</p>
        </div>
      </div>

      <!-- Artikler denne uka -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.filetext}</span> Artikler denne uka</div>
        </div>
        <div class="card-body">
          <div id="seoArticleList"></div>
          <div class="add-task-row" style="margin-top:10px">
            <input class="add-task-input" id="newArticleInput" placeholder="Artikkeltittel eller keyword…" style="flex:2">
            <button class="btn-primary btn-sm" id="addArticleBtn">+</button>
          </div>
        </div>
      </div>

      <!-- Kampanjeresultater fredag -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.target}</span> Kampanjeresultater — Uke ${this.state.week}</div>
        </div>
        <div class="card-body" id="fridayCampaignResults">
          <p class="text-muted text-small">Laster kampanjeresultater…</p>
        </div>
      </div>

      <!-- Fredagsforslag -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.forward}</span> Neste ukes SEO-prioriteringer</div>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn-ai" id="generateFridayBtn">✨ Generer forslag</button>
            <button class="btn-icon ai-collapse-btn" data-target="fridayContent" style="font-size:.75rem">▼</button>
          </div>
        </div>
        <div class="card-body" id="fridayContent">
          <p class="text-muted text-small">Trykk «Generer» for AI-forslag til neste ukes SEO-arbeid basert på ukens data.</p>
        </div>
      </div>`;
  },

  renderFridayData(weekKey) {
    this.renderFridayTaskSummary(weekKey);
    this.renderFridayWinLossSummary(weekKey);
    this.renderFridayCampaignResults(weekKey);
    this.renderSeoArticles(weekKey);
    Utils.on('addArticleBtn', 'click', () => this.addSeoArticle(weekKey));
    Utils.on('newArticleInput', 'keydown', e => { if (e.key === 'Enter') this.addSeoArticle(weekKey); });
    const saved = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_friday', null);
    if (saved) this.displayFridayData(saved);

    Utils.on('generateFridayBtn', 'click', async () => {
      const btn = Utils.el('generateFridayBtn');
      btn.textContent = '⏳ Genererer…';
      btn.disabled = true;
      const weekKpi = this.getWeekKpi(weekKey);
      const keywords = Utils.loadNested(CONFIG.STORAGE_KEYS.KEYWORDS, weekKey, []);
      const result = await AI.generateFridaySuggestions({ kpis: weekKpi, keywords });
      if (result) {
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_friday', result);
        this.displayFridayData(result);
      }
      btn.textContent = '✨ Generer forslag';
      btn.disabled = false;
    });
  },

  renderSeoArticles(weekKey) {
    const list = Utils.el('seoArticleList');
    if (!list) return;
    const articles = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_articles', []);
    const statuses = ['Utkast', 'Under arbeid', 'Publisert'];
    const statusColors = {
      'Utkast':       { bg: 'var(--gray)',       color: 'var(--text-soft)' },
      'Under arbeid': { bg: 'var(--primary-lt)', color: 'var(--primary)' },
      'Publisert':    { bg: 'var(--green-lt)',   color: '#0a7c45' },
    };

    if (articles.length === 0) {
      list.innerHTML = '<p class="text-muted text-small">Ingen artikler denne uka.</p>';
      return;
    }

    list.innerHTML = articles.map(a => {
      const sc = statusColors[a.status] || statusColors['Utkast'];
      return `
        <div class="task-item-v2" data-aid="${a.id}">
          <div class="task-prio-bar" style="background:var(--yellow)"></div>
          <span class="task-text-v2" style="flex:1">${Utils.esc(a.title)}</span>
          <select class="task-status-sel" data-aid="${a.id}" style="background:${sc.bg};color:${sc.color}">
            ${statuses.map(s => `<option ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="task-del art-del" data-aid="${a.id}" style="opacity:1">✕</button>
        </div>`;
    }).join('');

    list.querySelectorAll('.task-status-sel').forEach(sel => {
      sel.addEventListener('change', () => {
        const arts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_articles', []);
        const a = arts.find(a => a.id === sel.dataset.aid);
        if (a) { a.status = sel.value; Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_articles', arts); }
        this.renderSeoArticles(weekKey);
      });
    });
    list.querySelectorAll('.art-del').forEach(btn => {
      btn.addEventListener('click', () => {
        let arts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_articles', []);
        arts = arts.filter(a => a.id !== btn.dataset.aid);
        Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_articles', arts);
        this.renderSeoArticles(weekKey);
      });
    });
  },

  addSeoArticle(weekKey) {
    const input = Utils.el('newArticleInput');
    if (!input || !input.value.trim()) return;
    const arts = Utils.loadNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_articles', []);
    arts.push({ id: Utils.uid(), title: input.value.trim(), status: 'Utkast' });
    Utils.saveNested(CONFIG.STORAGE_KEYS.WEEKLY, weekKey + '_seo_articles', arts);
    input.value = '';
    this.renderSeoArticles(weekKey);
  },

  renderFridayTaskSummary(weekKey) {
    const container = Utils.el('fridayTaskSummary');
    if (!container) return;
    const tasks = this.getWeekTasks(weekKey);
    const total = tasks.length;
    const done  = tasks.filter(t => t.status === 'fullfort').length;
    const pct   = total ? Math.round(done / total * 100) : 0;

    const msg = pct === 100 ? '🎉 Alle oppgaver fullført denne uken!' :
                pct >= 75  ? '👏 Bra jobba — nesten i mål!' :
                pct >= 50  ? '⚡ Halvveis — hold fokus til slutt!' :
                             '💪 Noen oppgaver gjenstår — prioriter det viktigste!';

    const prioColors = { 'ikke-startet': '#d1d9e0', haster: '#eb5857', hoy: '#f97316', middels: '#f7c855', lav: '#acf5ca' };
    const remaining = tasks.filter(t => t.status !== 'fullfort');

    container.innerHTML = `
      <p class="text-small" style="margin-bottom:8px;font-weight:600">${msg}</p>
      <div style="background:var(--gray);border-radius:4px;height:8px;margin-bottom:10px">
        <div style="background:var(--primary);width:${pct}%;height:8px;border-radius:4px;transition:width .3s"></div>
      </div>
      <p class="text-small text-muted" style="margin-bottom:${remaining.length ? '8px' : '0'}">${done}/${total} fullført</p>
      ${remaining.length ? `<div style="font-size:.75rem;font-weight:700;color:var(--text-muted);margin-bottom:6px">Gjenstående:</div>
        ${remaining.map(t => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <div style="width:8px;height:8px;border-radius:2px;background:${prioColors[t.priority]||prioColors.middels};flex-shrink:0"></div>
          <span style="font-size:.82rem">${Utils.esc(t.text)}</span>
        </div>`).join('')}` : ''}`;
  },

  renderFridayWinLossSummary(weekKey) {
    const container = Utils.el('fridayWinLossSummary');
    if (!container) return;
    const wins = [], losses = [];
    CONFIG.DAYS.slice(0, 4).forEach((day, i) => {
      const dayKey = `${weekKey}-${day}`;
      const items = Utils.loadNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, []);
      items.forEach(item => {
        const entry = { text: item.text, day: CONFIG.DAY_LABELS[i] };
        if (item.type === 'win') wins.push(entry);
        else losses.push(entry);
      });
    });

    if (wins.length === 0 && losses.length === 0) {
      container.innerHTML = '<p class="text-muted text-small">Ingen funn registrert man–tor. Bruk «Hva funket / funket ikke» på de andre dagene.</p>';
      return;
    }

    const renderEntries = arr => arr.map(e =>
      `<div style="display:flex;gap:6px;align-items:baseline;margin-bottom:3px">
        <span style="font-size:.65rem;color:var(--text-muted);flex-shrink:0">${e.day}</span>
        <span style="font-size:.85rem">${Utils.esc(e.text || '(ingen tekst)')}</span>
      </div>`).join('');

    container.innerHTML = `
      <div class="grid-2" style="gap:12px">
        <div>
          <div style="font-weight:700;font-size:.75rem;color:#0a7c45;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">✅ Funket</div>
          ${wins.length ? renderEntries(wins) : '<p class="text-muted text-small">Ingen registrert</p>'}
        </div>
        <div>
          <div style="font-weight:700;font-size:.75rem;color:#b91c1c;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">❌ Funket ikke</div>
          ${losses.length ? renderEntries(losses) : '<p class="text-muted text-small">Ingen registrert</p>'}
        </div>
      </div>`;
  },

  displayFridayData(data) {
    const container = Utils.el('fridayContent');
    if (!container) return;
    const articles = (data.articles || []).map(a => `
      <div class="friday-article-card">
        <span class="article-type-badge ${a.type === 'ny' ? 'ny' : 'vedlikehold'}">
          ${a.type === 'ny' ? '✨ Ny artikkel' : '🔧 Vedlikehold'}
        </span>
        <div style="font-weight:600;font-size:.9rem;margin-bottom:4px">${Utils.esc(a.title)}</div>
        <div class="text-small text-muted">${Utils.esc(a.reason || '')}</div>
      </div>`).join('');
    const cats = (data.categories || []).map(c =>
      `<span class="badge badge-primary" style="margin-right:4px">${Utils.esc(c)}</span>`).join('');
    container.innerHTML = `
      <div style="margin-bottom:12px">
        <div class="form-label" style="margin-bottom:8px">Artikkelforslag</div>
        ${articles || '<p class="text-muted text-small">Ingen forslag generert ennå.</p>'}
      </div>
      ${cats ? `<div><div class="form-label" style="margin-bottom:8px">Kategorier å løfte neste uke</div>${cats}</div>` : ''}`;
    this.collapseAI('fridayContent');
  },

  collapseAI(contentId) {
    const content = Utils.el(contentId);
    const btn = document.querySelector(`.ai-collapse-btn[data-target="${contentId}"]`);
    if (content) content.style.display = 'none';
    if (btn) btn.textContent = '▶';
  },

  /* ---- Kampanje-hjelpere ---- */

  getWeekCampaigns() {
    if (typeof Campaigns === 'undefined') return [];
    const monday = Utils.getMonday(this.state.year, this.state.week);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return Campaigns.getData().filter(c => {
      if (c.status === 'ide') return false;
      if (!c.startDate || !c.endDate) return c.status === 'aktiv';
      const s = new Date(c.startDate), e = new Date(c.endDate);
      return s <= sunday && e >= monday;
    });
  },

  renderCampaignStrip() {
    const list = this.getWeekCampaigns();
    if (!list.length) return '';
    return `<div class="campaign-week-strip">
      <span class="campaign-strip-label">Denne uken:</span>
      ${list.map(c => {
        const tc = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
        return `<span class="campaign-strip-badge" style="background:${tc?.color||'var(--primary)'};color:${tc?.textColor||'#fff'}">${Utils.esc(c.name)}</span>`;
      }).join('')}
    </div>`;
  },

  /* ---- Arrangement-strip (kommende 7 dager) ---- */

  getWeekEvents() {
    if (typeof Events === 'undefined') return [];
    const monday = Utils.getMonday(this.state.year, this.state.week);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return Events.getData().filter(e => {
      if (e.status === 'ide' || !e.date) return false;
      const d = new Date(e.date);
      return d >= monday && d <= sunday;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  renderEventStrip() {
    const list = this.getWeekEvents();
    if (!list.length) return '';
    return `<div class="event-week-strip">
      <span class="campaign-strip-label">📅 Arrangement:</span>
      ${list.map(e => {
        const tc = CONFIG.EVENT_TYPES.find(t => t.id === e.type);
        const dateStr = Utils.formatDate(e.date, 'short');
        const timeStr = e.time ? ` kl.${e.time}` : '';
        return `<span class="event-strip-badge" style="background:${tc?.color||'var(--primary)'}22;color:${tc?.color||'var(--primary)'};border:1px solid ${tc?.color||'var(--primary)'}44">
          ${dateStr}${timeStr} · ${Utils.esc(e.name)}
          ${e.location ? `<span style="opacity:.7"> · ${Utils.esc(e.location)}</span>` : ''}
        </span>`;
      }).join('')}
    </div>`;
  },

  /* ---- Frist-varsling ---- */

  renderDueTasksAlert() {
    const weekKey = this.getWeekKey();
    const tasks = Utils.loadNested(CONFIG.STORAGE_KEYS.TASKS, weekKey + '_v2', []);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    const urgent = tasks.filter(t => {
      if (!t.dueDate || t.status === 'fullfort') return false;
      const d = new Date(t.dueDate);
      return d <= tomorrow;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (!urgent.length) return '';

    return `<div class="due-alert-strip">
      <span class="due-alert-icon">⏰</span>
      <div class="due-alert-items">
        ${urgent.map(t => {
          const d = new Date(t.dueDate);
          const isToday = d.getTime() === today.getTime();
          const isOverdue = d < today;
          const label = isOverdue ? 'Forfalt' : isToday ? 'I dag' : 'I morgen';
          const cls   = isOverdue || isToday ? 'due-alert-item--red' : 'due-alert-item--yellow';
          return `<span class="due-alert-item ${cls}"><strong>${label}:</strong> ${Utils.esc(t.text)}</span>`;
        }).join('')}
      </div>
    </div>`;
  },

  renderMondayCampaigns() {
    const list = this.getWeekCampaigns();
    if (!list.length) return '';
    return `<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
      <div class="kpi-label" style="margin-bottom:8px">KAMPANJER DENNE UKEN</div>
      ${list.map(c => {
        const tc = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
        const sc = CONFIG.CAMPAIGN_STATUSES.find(s => s.id === c.status);
        const dateStr = c.startDate && c.endDate
          ? `${Utils.formatDate(c.startDate)} – ${Utils.formatDate(c.endDate)}` : '';
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
          <span class="campaign-type-badge" style="background:${tc?.color||'var(--primary)'};color:${tc?.textColor||'#fff'}">${tc?.label||c.type}</span>
          <span style="font-size:.85rem;font-weight:600;flex:1">${Utils.esc(c.name)}</span>
          ${dateStr ? `<span style="font-size:.7rem;color:var(--text-muted)">${dateStr}</span>` : ''}
          <span class="campaign-status-badge campaign-status--${c.status}">${sc?.label||''}</span>
        </div>`;
      }).join('')}
    </div>`;
  },

  renderFridayCampaignResults(weekKey) {
    const container = Utils.el('fridayCampaignResults');
    if (!container) return;
    const list = this.getWeekCampaigns();
    if (!list.length) {
      container.innerHTML = '<p class="text-muted text-small">Ingen aktive kampanjer denne uken.</p>';
      return;
    }
    container.innerHTML = list.map(c => {
      const tc = CONFIG.CAMPAIGN_TYPES.find(t => t.id === c.type);
      const saved = (c.weeklyResults || {})[weekKey] || '';
      return `<div class="campaign-result-item">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span class="campaign-type-badge" style="background:${tc?.color||'var(--primary)'};color:${tc?.textColor||'#fff'}">${tc?.label||c.type}</span>
          <span style="font-size:.85rem;font-weight:600">${Utils.esc(c.name)}</span>
        </div>
        <textarea class="form-textarea campaign-result-ta" data-cid="${c.id}" rows="2"
          placeholder="Resultater og observasjoner for uke ${this.state.week}…">${Utils.esc(saved)}</textarea>
      </div>`;
    }).join('');

    container.querySelectorAll('.campaign-result-ta').forEach(ta => {
      ta.addEventListener('input', Utils.debounce(() => {
        const all = Campaigns.getData();
        const c = all.find(x => x.id === ta.dataset.cid);
        if (!c) return;
        if (!c.weeklyResults) c.weeklyResults = {};
        c.weeklyResults[weekKey] = ta.value;
        Campaigns.saveData(all);
      }, 800));
    });
  },

  /* ---- Bind daglige events ---- */

  bindDayEvents(dayKey, weekKey, kpiData, dayData) {
    // KPI-inputs — kun synlige på mandag, lagres per uke
    const dayContent = Utils.el('dayContent');
    const kpiInputs = dayContent
      ? [...dayContent.querySelectorAll('.kpi-input[data-key]')]
      : [];
    const saveKpi = Utils.debounce(() => {
      const data = this.getWeekKpi(weekKey);
      kpiInputs.forEach(input => { data[input.dataset.key] = input.value; });
      this.saveWeekKpi(weekKey, data);
      this.renderDayTabs();
    }, 600);
    kpiInputs.forEach(input => input.addEventListener('input', saveKpi));

    // Auto-beregn AOV og CTR
    const calcAuto = () => {
      const revenue = parseFloat(dayContent?.querySelector('.kpi-input[data-key="revenue"]')?.value || 0);
      const orders  = parseFloat(dayContent?.querySelector('.kpi-input[data-key="orders"]')?.value || 0);
      const clicks  = parseFloat(dayContent?.querySelector('.kpi-input[data-key="clicks"]')?.value || 0);
      const impr    = parseFloat(dayContent?.querySelector('.kpi-input[data-key="impressions"]')?.value || 0);
      const aovEl   = dayContent?.querySelector('.kpi-input[data-key="aov"]');
      const ctrEl   = dayContent?.querySelector('.kpi-input[data-key="ctr"]');
      if (aovEl && orders > 0) aovEl.value = (revenue / orders).toFixed(0);
      if (ctrEl && impr > 0)   ctrEl.value = (clicks / impr * 100).toFixed(2);
      saveKpi();
    };
    kpiInputs.filter(i => ['revenue','orders','clicks','impressions'].includes(i.dataset.key))
      .forEach(i => i.addEventListener('input', calcAuto));

    // Diagnoser (bruker weekKey)
    Utils.on('runDiagnosisBtn', 'click', () => this.runDiagnosis(weekKey));
    Utils.on('regenerateDiagnosis', 'click', () => this.runDiagnosis(weekKey));

    // Notater — per dag
    const notesEl = Utils.el('dayNotes');
    if (notesEl) {
      notesEl.addEventListener('input', Utils.debounce(() => {
        const data = this.getDayData(dayKey);
        data._notes = notesEl.value;
        this.saveDayData(dayKey, data);
      }, 800));
    }

    // Oppgaveliste
    Utils.on('addTaskBtn', 'click', () => this.addWeekTask(weekKey));
    Utils.on('newTaskInput', 'keydown', e => { if (e.key === 'Enter') this.addWeekTask(weekKey); });

    // Dagsbriefing
    Utils.on('generateDayBriefBtn', 'click', () => this.generateDayBrief(weekKey, dayKey));

    // Hva funket / funket ikke
    Utils.on('addWinBtn',  'click', () => this.addWinLoss(dayKey, 'win'));
    Utils.on('addLossBtn', 'click', () => this.addWinLoss(dayKey, 'loss'));

    // Keywords handled in renderWeekContextData

    // AI collapse toggles
    Utils.qsa('.ai-collapse-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = Utils.el(btn.dataset.target);
        if (!target) return;
        const isHidden = target.style.display === 'none';
        target.style.display = isHidden ? '' : 'none';
        btn.textContent = isHidden ? '▼' : '▶';
      });
    });
  },

  /* ---- Diagnose ---- */

  async runDiagnosis(weekKey) {
    const btn = Utils.el('runDiagnosisBtn');
    const content = Utils.el('diagnosisContent');
    if (!content) return;

    if (btn) { btn.textContent = '⏳ Analyserer…'; btn.disabled = true; }
    content.textContent = 'Analyserer KPIer…';
    content.classList.add('loading');

    // Les direkte fra DOM-inputs + det som allerede er lagret
    const kpiData = this.getWeekKpi(weekKey);
    const dayContent = Utils.el('dayContent');
    if (dayContent) {
      dayContent.querySelectorAll('.kpi-input[data-key]').forEach(input => {
        kpiData[input.dataset.key] = input.value;
      });
    }
    this.saveWeekKpi(weekKey, kpiData);

    const prevWeek = Utils.addWeeks(this.state.year, this.state.week, -1);
    const prevKpiData = this.getWeekKpi(Utils.getWeekKey(prevWeek.year, prevWeek.week));

    const diagnosis = await AI.generateDiagnosis(kpiData, prevKpiData);
    content.textContent = diagnosis;
    content.classList.remove('loading');

    kpiData._diagnosis = diagnosis;
    this.saveWeekKpi(weekKey, kpiData);

    if (btn) { btn.textContent = '✨ Diagnose'; btn.disabled = false; }
  },

  /* ---- Oppgaveliste ---- */

  /* ---- Ukentlig oppgaveliste (ny) ---- */

  getWeekTasks(weekKey) {
    return Utils.loadNested(CONFIG.STORAGE_KEYS.TASKS, weekKey + '_v2', []);
  },

  saveWeekTasks(weekKey, tasks) {
    Utils.saveNested(CONFIG.STORAGE_KEYS.TASKS, weekKey + '_v2', tasks);
  },

  initCarryForward(weekKey) {
    const initKey = weekKey + '_v2_init';
    const already = Utils.loadNested(CONFIG.STORAGE_KEYS.TASKS, initKey, false);
    if (already) return;

    const prevWeek    = Utils.addWeeks(this.state.year, this.state.week, -1);
    const prevWeekKey = Utils.getWeekKey(prevWeek.year, prevWeek.week);
    const prevTasks   = this.getWeekTasks(prevWeekKey);
    const candidates  = prevTasks.filter(t => t.status !== 'fullfort');

    if (candidates.length === 0) {
      Utils.saveNested(CONFIG.STORAGE_KEYS.TASKS, initKey, true);
      return;
    }

    this.renderCarryForwardPanel(weekKey, candidates, initKey);
  },

  renderCarryForwardPanel(weekKey, candidates, initKey) {
    const panel = Utils.el('carryForwardPanel');
    if (!panel) return;

    const highPrio = new Set(['haster', 'hoy']);
    const prioColors = { haster: '#eb5857', hoy: '#f97316', middels: '#f7c855', lav: '#acf5ca' };

    panel.innerHTML = `
      <div class="carry-forward-panel">
        <div class="carry-forward-header">
          <span>📋 Fra forrige uke — ${candidates.length} ufullendte oppgaver</span>
        </div>
        <div class="carry-forward-list">
          ${candidates.map(t => {
            const cat    = CONFIG.TASK_CATEGORIES.find(c => c.id === t.category);
            const pColor = prioColors[t.priority] || '#d1d9e0';
            const checked = highPrio.has(t.priority) ? 'checked' : '';
            return `
            <label class="carry-item" data-tid="${t.id}">
              <input type="checkbox" class="carry-check" data-tid="${t.id}" ${checked}>
              <span class="carry-prio-dot" style="background:${pColor}"></span>
              <span class="carry-text">${Utils.esc(t.text)}</span>
              ${cat ? `<span class="badge" style="background:${cat.bg};color:${cat.color};font-size:.6rem;flex-shrink:0">${cat.label}</span>` : ''}
            </label>`;
          }).join('')}
        </div>
        <div class="carry-forward-actions">
          <button class="btn-primary btn-sm" id="carryConfirmBtn">Ta med valgte</button>
          <button class="btn-ghost-sm" id="carryDismissBtn">Avvis alle</button>
        </div>
      </div>`;

    Utils.on('carryConfirmBtn', 'click', () => {
      const selected = [...panel.querySelectorAll('.carry-check:checked')].map(cb => cb.dataset.tid);
      if (selected.length > 0) {
        const current    = this.getWeekTasks(weekKey);
        const existingIds = new Set(current.map(t => t.id));
        candidates
          .filter(t => selected.includes(t.id))
          .forEach(t => {
            if (!existingIds.has(t.id)) current.push({ ...t, status: 'ikke-startet' });
          });
        this.saveWeekTasks(weekKey, current);
        Utils.toast(`${selected.length} oppgave${selected.length > 1 ? 'r' : ''} videreført ✓`, 'success');
      }
      Utils.saveNested(CONFIG.STORAGE_KEYS.TASKS, initKey, true);
      panel.innerHTML = '';
      this.renderTasks(weekKey);
    });

    Utils.on('carryDismissBtn', 'click', () => {
      Utils.saveNested(CONFIG.STORAGE_KEYS.TASKS, initKey, true);
      panel.innerHTML = '';
    });
  },

  renderTasks(weekKey) {
    const list    = Utils.el('taskList');
    const counter = Utils.el('taskCount');
    if (!list) return;

    const filter   = this.state.taskFilter   || 'aktive';
    const catFilter = this.state.taskCategory || null;
    const allTasks  = this.getWeekTasks(weekKey);
    const active    = allTasks.filter(t => t.status !== 'fullfort');
    const done      = allTasks.filter(t => t.status === 'fullfort');
    if (counter) counter.textContent = `${done.length}/${allTasks.length}`;

    // Filterknappar status
    Utils.qsa('.task-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
      btn.onclick = () => { this.state.taskFilter = btn.dataset.filter; this.renderTasks(weekKey); };
    });

    // Filterknappar kategori
    Utils.qsa('.ctag-filter').forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.cat || null) === catFilter);
      btn.onclick = () => {
        this.state.taskCategory = btn.dataset.cat || null;
        this.renderTasks(weekKey);
      };
    });

    const prioOrder = { haster: 0, hoy: 1, middels: 2, lav: 3 };
    const prioColors = { haster: '#eb5857', hoy: '#f97316', middels: '#f7c855', lav: '#acf5ca' };
    const statusColors = {
      'ikke-startet': { bg: 'var(--gray)',       color: 'var(--text-soft)' },
      startet:        { bg: 'var(--gray)',       color: 'var(--text-soft)' }, // bakoverkompatibilitet
      pagar:          { bg: 'var(--primary-lt)', color: 'var(--primary)' },
      fullfort:       { bg: 'var(--green-lt)',   color: '#0a7c45' },
    };

    let visible = allTasks;
    if (filter === 'aktive')   visible = active;
    if (filter === 'fullfort') visible = done;
    if (catFilter) visible = visible.filter(t => t.category === catFilter);

    // Sorter: forfalt øverst, deretter prioritet, deretter kategori
    const today = new Date(); today.setHours(0,0,0,0);
    const dueScore = t => {
      if (!t.dueDate) return 2;
      const d = new Date(t.dueDate); d.setHours(0,0,0,0);
      if (d < today) return 0;  // forfalt
      if ((d - today) / 86400000 <= 3) return 1; // snart
      return 2;
    };
    visible = [...visible].sort((a, b) => {
      const da = dueScore(a), db = dueScore(b);
      if (da !== db) return da - db;
      const pa = prioOrder[a.priority] ?? 99;
      const pb = prioOrder[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      return (a.category || '').localeCompare(b.category || '');
    });

    if (visible.length === 0) {
      list.innerHTML = `<p class="text-muted text-small" style="padding:8px 0">${
        filter === 'fullfort' ? 'Ingen fullførte oppgaver denne uken.' :
        filter === 'aktive'   ? 'Ingen aktive oppgaver — legg til nedenfor.' :
        'Ingen oppgaver denne uken.'}</p>`;
    } else {
      list.innerHTML = visible.map(t => {
        const sc  = statusColors[t.status] || statusColors['ikke-startet'];
        const cat = CONFIG.TASK_CATEGORIES.find(c => c.id === t.category);
        const catBadge = cat
          ? `<span class="badge" style="background:${cat.bg};color:${cat.color};font-size:.62rem">${cat.label}</span>`
          : '';
        const prioBar = prioColors[t.priority] || '#d1d9e0';
        const normalizedStatus = t.status === 'startet' ? 'ikke-startet' : t.status;

        // Frist-badge
        let dueBadge = '';
        if (t.dueDate) {
          const due = new Date(t.dueDate); due.setHours(0,0,0,0);
          const diff = Math.round((due - today) / 86400000);
          const dueStr = due.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
          if (diff < 0)      dueBadge = `<span class="task-due-badge overdue">⚠ ${dueStr}</span>`;
          else if (diff <= 3) dueBadge = `<span class="task-due-badge soon">⏰ ${dueStr}</span>`;
          else                dueBadge = `<span class="task-due-badge">${dueStr}</span>`;
        }

        return `
        <div class="task-item-v2" data-tid="${t.id}">
          <div class="task-prio-bar" style="background:${prioBar}"></div>
          <div style="flex:1;min-width:0">
            <span class="task-text-v2 ${t.status === 'fullfort' ? 'done' : ''}" contenteditable="true" data-tid="${t.id}">${Utils.esc(t.text)}</span>
            ${(catBadge || dueBadge) ? `<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${catBadge}${dueBadge}</div>` : ''}
          </div>
          <select class="task-status-sel" data-tid="${t.id}" style="background:${sc.bg};color:${sc.color}">
            <option value="ikke-startet" ${normalizedStatus==='ikke-startet'?'selected':''}>Ikke startet</option>
            <option value="pagar"        ${normalizedStatus==='pagar'       ?'selected':''}>Pågår</option>
            <option value="fullfort"     ${normalizedStatus==='fullfort'    ?'selected':''}>Fullført</option>
          </select>
          <button class="task-del" data-tid="${t.id}" style="opacity:1">✕</button>
        </div>`;
      }).join('');
    }

    list.querySelectorAll('.task-status-sel').forEach(sel => {
      sel.addEventListener('change', () => {
        const tasks = this.getWeekTasks(weekKey);
        const t = tasks.find(t => t.id === sel.dataset.tid);
        if (t) { t.status = sel.value; this.saveWeekTasks(weekKey, tasks); }
        this.renderTasks(weekKey);
      });
    });
    list.querySelectorAll('.task-text-v2[contenteditable]').forEach(el => {
      el.addEventListener('blur', () => {
        const tasks = this.getWeekTasks(weekKey);
        const t = tasks.find(t => t.id === el.dataset.tid);
        if (t && el.textContent !== t.text) { t.text = el.textContent.trim(); this.saveWeekTasks(weekKey, tasks); }
      });
    });
    list.querySelectorAll('.task-del').forEach(btn => {
      btn.addEventListener('click', () => {
        let tasks = this.getWeekTasks(weekKey);
        tasks = tasks.filter(t => t.id !== btn.dataset.tid);
        this.saveWeekTasks(weekKey, tasks);
        this.renderTasks(weekKey);
      });
    });
  },

  addWeekTask(weekKey) {
    const input    = Utils.el('newTaskInput');
    const prio     = Utils.el('newTaskPriority')?.value || 'lav';
    const category = Utils.el('newTaskCategory')?.value || null;
    const dueDate  = Utils.el('newTaskDue')?.value || null;
    if (!input || !input.value.trim()) return;
    const tasks = this.getWeekTasks(weekKey);
    tasks.unshift({ id: Utils.uid(), text: input.value.trim(), priority: prio, category: category || null, dueDate: dueDate || null, status: 'ikke-startet', created: new Date().toISOString() });
    this.saveWeekTasks(weekKey, tasks);
    input.value = '';
    const dueEl = Utils.el('newTaskDue');
    if (dueEl) dueEl.value = '';
    this.renderTasks(weekKey);
  },

  /* ---- Vinn/Taper ---- */

  renderWinLoss(dayKey) {
    const list = Utils.el('winlossList');
    if (!list) return;
    const items = Utils.loadNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, []);
    list.innerHTML = items.map(item => `
      <div class="winloss-item" data-wid="${item.id}">
        <span class="winloss-badge ${item.type}">${item.type === 'win' ? '✅ Funket' : '❌ Funket ikke'}</span>
        <textarea class="winloss-text" data-wid="${item.id}" rows="1">${Utils.esc(item.text)}</textarea>
        <button class="task-del" data-wid="${item.id}">✕</button>
      </div>`).join('');

    list.querySelectorAll('.winloss-text').forEach(ta => {
      ta.addEventListener('input', Utils.debounce(() => {
        const items = Utils.loadNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, []);
        const i = items.find(i => i.id === ta.dataset.wid);
        if (i) { i.text = ta.value; Utils.saveNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, items); }
      }, 600));
    });
    list.querySelectorAll('.task-del').forEach(btn => {
      btn.addEventListener('click', () => {
        let items = Utils.loadNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, []);
        items = items.filter(i => i.id !== btn.dataset.wid);
        Utils.saveNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, items);
        this.renderWinLoss(dayKey);
      });
    });
  },

  addWinLoss(dayKey, type) {
    const items = Utils.loadNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, []);
    items.push({ id: Utils.uid(), type, text: '' });
    Utils.saveNested(CONFIG.STORAGE_KEYS.WINLOSS, dayKey, items);
    this.renderWinLoss(dayKey);
    setTimeout(() => {
      const textareas = Utils.qsa('.winloss-text');
      if (textareas.length) textareas[textareas.length - 1].focus();
    }, 50);
  },


  /* ---- Innholdskalender ---- */

  renderCalendar(weekKey) {
    const list = Utils.el('calendarList');
    if (!list) return;
    const channels = ['Blogg', 'E-post', 'Google Ads', 'Instagram', 'Facebook', 'Annet'];
    const entries = Utils.loadNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, []);

    const save = () => {};

    list.innerHTML = `
      ${entries.length === 0 ? '<p class="text-muted text-small" style="margin-bottom:8px">Ingen innhold planlagt. Trykk "+ Legg til".</p>' : ''}
      ${entries.map(e => `
        <div class="pub-entry" data-eid="${e.id}">
          <select class="pub-channel-sel" data-eid="${e.id}">
            ${channels.map(ch => `<option ${e.channel===ch?'selected':''}>${ch}</option>`).join('')}
          </select>
          <input class="pub-entry-input" data-eid="${e.id}" value="${Utils.esc(e.text||'')}" placeholder="Hva går ut denne uka…">
          <button class="task-del pub-del" data-eid="${e.id}" style="opacity:1">✕</button>
        </div>`).join('')}
      <button class="btn-ghost-sm" id="addCalEntryBtn" style="margin-top:6px;font-size:.8rem">+ Legg til</button>`;

    list.querySelectorAll('.pub-channel-sel').forEach(sel => {
      sel.addEventListener('change', Utils.debounce(() => {
        const es = Utils.loadNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, []);
        const e = es.find(e => e.id === sel.dataset.eid);
        if (e) { e.channel = sel.value; Utils.saveNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, es); save(); }
      }, 300));
    });
    list.querySelectorAll('.pub-entry-input').forEach(input => {
      input.addEventListener('input', Utils.debounce(() => {
        const es = Utils.loadNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, []);
        const e = es.find(e => e.id === input.dataset.eid);
        if (e) { e.text = input.value; Utils.saveNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, es); save(); }
      }, 600));
    });
    list.querySelectorAll('.pub-del').forEach(btn => {
      btn.addEventListener('click', () => {
        let es = Utils.loadNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, []);
        es = es.filter(e => e.id !== btn.dataset.eid);
        Utils.saveNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, es);
        this.renderCalendar(weekKey);
      });
    });
    const addBtn = Utils.el('addCalEntryBtn');
    if (addBtn) addBtn.onclick = () => this.addCalendarEntry(weekKey);
  },

  addCalendarEntry(weekKey) {
    const es = Utils.loadNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, []);
    es.push({ id: Utils.uid(), channel: 'Blogg', text: '' });
    Utils.saveNested(CONFIG.STORAGE_KEYS.CALENDAR, weekKey, es);
    this.renderCalendar(weekKey);
    setTimeout(() => {
      const inputs = Utils.qsa('.pub-entry-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
  },

};
