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
    // Auto-beregn AOV og CTR
    const aovVal = (data.revenue && data.orders && Number(data.orders) > 0)
      ? (Number(data.revenue) / Number(data.orders))
      : null;
    const ctrVal = (data.clicks && data.impressions && Number(data.impressions) > 0)
      ? (Number(data.clicks) / Number(data.impressions) * 100)
      : null;
    const prevAov = (prev.revenue && prev.orders && Number(prev.orders) > 0)
      ? (Number(prev.revenue) / Number(prev.orders))
      : null;
    const prevCtr = (prev.clicks && prev.impressions && Number(prev.impressions) > 0)
      ? (Number(prev.clicks) / Number(prev.impressions) * 100)
      : null;

    const kpiDefs = [
      { key: 'revenue',     label: 'Net Revenue',  fmt: v => Utils.formatKr(v) },
      { key: 'orders',      label: 'Ordre',         fmt: v => Utils.formatNum(v) },
      { key: 'aov',         label: 'Snitt AOV',     fmt: v => Utils.formatKr(v),  auto: true, autoVal: aovVal, prevAutoVal: prevAov },
      { key: 'clicks',      label: 'Klikk',         fmt: v => Utils.formatNum(v) },
      { key: 'impressions', label: 'Visninger',     fmt: v => Utils.formatNum(v) },
      { key: 'ctr',         label: 'CTR (snitt)',   fmt: v => (Number(v).toFixed(2) + ' %'), auto: true, autoVal: ctrVal, prevAutoVal: prevCtr },
      { key: 'position',    label: 'Snittposisjon', fmt: v => v ? Number(v).toFixed(1) : '–' },
    ];

    return `<div class="section-stack">

      <!-- AI-analyse -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.stars}</span> AI-analyse</div>
          <button class="btn-ai" id="generateMonthlyAI">✨ Analyser måneden</button>
        </div>
        <div class="card-body">
          <div class="ai-diagnosis-content" id="monthlyAIText" style="min-height:60px">
            ${data.aiComment ? Utils.esc(data.aiComment) : '<span class="text-muted">Fyll inn månedstall og trykk «Analyser måneden» for en AI-gjennomgang.</span>'}
          </div>
        </div>
      </div>

      <!-- Månedstall vs forrige måned -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.chart}</span> Månedstall</div>
          <span class="text-muted text-small">Manuell innlegging</span>
        </div>
        <div class="card-body">
          <div class="month-stat-row">
            ${kpiDefs.map(f => {
              if (f.auto) {
                const val  = f.autoVal;
                const pval = f.prevAutoVal;
                const delta = (val !== null && pval !== null) ? Utils.delta(val, pval) : null;
                const deltaHtml = delta !== null
                  ? `<div class="stat-delta ${delta >= 0 ? 'pos' : 'neg'}">${delta > 0 ? '↑' : '↓'} ${Math.abs(delta).toFixed(1)}% vs forrige mnd</div>`
                  : `<div class="stat-delta" style="color:var(--text-muted);font-size:.7rem">–</div>`;
                const displayVal = val !== null ? f.fmt(val) : '–';
                return `<div class="stat-card">
                  <div class="stat-label">${f.label} <span style="font-size:.65rem;color:var(--text-muted);font-style:italic">auto</span></div>
                  <div class="kpi-auto-value" style="font-size:1.2rem;font-weight:600;padding:6px 0;color:var(--text)">${displayVal}</div>
                  ${deltaHtml}
                </div>`;
              }
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

      <!-- SoMe-resultater -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.phone}</span> SoMe-resultater</div>
          <span class="text-muted text-small">Instagram & Facebook</span>
        </div>
        <div class="card-body">
          <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Instagram</div>
          <div class="month-stat-row" style="margin-bottom:16px">
            ${[
              { key: 'ig_impressions',   label: 'Visninger' },
              { key: 'ig_interactions',  label: 'Samhandlinger' },
              { key: 'ig_new_followers', label: 'Nye følgere' },
              { key: 'ig_posts_shared',  label: 'Innhold delt' },
            ].map(f => {
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
          <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Facebook</div>
          <div class="month-stat-row">
            ${[
              { key: 'fb_impressions',        label: 'Visninger' },
              { key: 'fb_reach_followers',    label: 'Visn. av følgere' },
              { key: 'fb_reach_nonfollowers', label: 'Visn. av ikke-følgere' },
            ].map(f => {
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
          <div class="form-group" style="margin-top:12px">
            <label class="form-label" style="font-size:.75rem">Beste innlegg denne måneden</label>
            <textarea class="form-textarea" id="bestPost" placeholder="Beskriv innlegget som presterte best — plattform, tema, rekkevidde…" rows="2">${Utils.esc(data.bestPost || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Mailchimp e-post -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">${CONFIG.ICONS.mail}</span> E-post (Mailchimp)</div>
          <button class="btn-secondary btn-sm" id="fetchMailchimpBtn">↻ Hent statistikk</button>
        </div>
        <div class="card-body">
          <div id="mailchimpStatus" style="display:none;font-size:.8rem;color:var(--text-muted);margin-bottom:12px"></div>

          <!-- Totaltall -->
          <div class="month-stat-row" id="mailchimpTotals" style="margin-bottom:16px">
            <div class="stat-card">
              <div class="stat-label">Totalt sendt</div>
              <div class="kpi-auto-value" id="mc_totalSent" style="font-size:1.2rem;font-weight:600;padding:6px 0;color:var(--text)">–</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Åpningsrate</div>
              <div class="kpi-auto-value" id="mc_openRate" style="font-size:1.2rem;font-weight:600;padding:6px 0;color:var(--text)">–</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Klikkrate</div>
              <div class="kpi-auto-value" id="mc_clickRate" style="font-size:1.2rem;font-weight:600;padding:6px 0;color:var(--text)">–</div>
            </div>
          </div>

          <!-- Topp 5 nyhetsbrev -->
          <div style="font-size:.75rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Topp 5 nyhetsbrev denne måneden</div>
          <div id="mailchimpTop5">
            <p class="text-muted text-small">Trykk «Hent statistikk» for å laste inn data fra Mailchimp.</p>
          </div>

          <!-- Notatfelt for popularitet -->
          <div class="form-group" style="margin-top:16px">
            <label class="form-label" style="font-size:.75rem">Notater — hvorfor tror jeg disse presterte godt?</label>
            <textarea class="form-textarea" id="emailNotes" placeholder="Hva tror du er grunnen til at disse nyhetsbrevene gikk bra? Tidspunkt, tema, tilbud, emnelinje…" rows="3">${Utils.esc(data.emailNotes || '')}</textarea>
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

    </div>`;
  },

  bindEvents(key, initialData) {
    // KPI inputs
    Utils.qsa('.month-kpi').forEach(input => {
      input.addEventListener('input', Utils.debounce(() => {
        const data = this.getData(key);
        Utils.qsa('.month-kpi').forEach(el => { data[el.dataset.key] = el.value; });
        // Lagre auto-beregnede verdier
        if (data.revenue && data.orders && Number(data.orders) > 0)
          data.aov = (Number(data.revenue) / Number(data.orders)).toFixed(2);
        if (data.clicks && data.impressions && Number(data.impressions) > 0)
          data.ctr = (Number(data.clicks) / Number(data.impressions) * 100).toFixed(4);
        this.saveData(key, data);
        this.render(); // oppdater delta og auto-verdier
      }, 800));
    });

    // Tekstfelter
    ['whatWorked','whatDidnt','bestContent','keywordMoves','campaignEval','bestPost','emailNotes'].forEach(id => {
      const el = Utils.el(id);
      if (el) {
        el.addEventListener('input', Utils.debounce(() => {
          const data = this.getData(key);
          data[id] = el.value;
          this.saveData(key, data);
        }, 800));
      }
    });

    // Mailchimp
    this.restoreMailchimpUI(key);
    Utils.on('fetchMailchimpBtn', 'click', () => this.fetchMailchimp(key));

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

  async fetchMailchimp(key) {
    const btn    = Utils.el('fetchMailchimpBtn');
    const status = Utils.el('mailchimpStatus');
    if (btn) { btn.textContent = '⏳ Henter…'; btn.disabled = true; }
    if (status) { status.style.display = 'block'; status.textContent = 'Kobler til Mailchimp…'; }

    const stats = await Mailchimp.fetchStats(this.state.year, this.state.month);

    if (stats.error) {
      if (status) status.textContent = `Feil: ${stats.error}`;
      if (btn) { btn.textContent = '↻ Hent statistikk'; btn.disabled = false; }
      return;
    }

    // Lagre til data
    const data = this.getData(key);
    data.mailchimp = stats;
    this.saveData(key, data);

    if (status) status.textContent = `Sist hentet: ${new Date().toLocaleString('no-NO')}`;
    this.renderMailchimpUI(stats);
    if (btn) { btn.textContent = '↻ Hent statistikk'; btn.disabled = false; }
  },

  restoreMailchimpUI(key) {
    const data = this.getData(key);
    if (data.mailchimp) {
      const status = Utils.el('mailchimpStatus');
      if (status) { status.style.display = 'block'; status.textContent = 'Viser lagret data — trykk «Hent statistikk» for å oppdatere.'; }
      this.renderMailchimpUI(data.mailchimp);
    }
  },

  renderMailchimpUI(stats) {
    const fmt = v => Utils.formatNum(Math.round(v));
    const pct = v => (v * 100).toFixed(1) + ' %';

    const totalEl     = Utils.el('mc_totalSent');
    const openRateEl  = Utils.el('mc_openRate');
    const clickRateEl = Utils.el('mc_clickRate');
    const top5El      = Utils.el('mailchimpTop5');

    if (totalEl)     totalEl.textContent     = fmt(stats.totalSent);
    if (openRateEl)  openRateEl.textContent  = pct(stats.openRate);
    if (clickRateEl) clickRateEl.textContent = pct(stats.clickRate);

    if (top5El) {
      if (!stats.top5 || stats.top5.length === 0) {
        top5El.innerHTML = '<p class="text-muted text-small">Ingen sendte kampanjer funnet for denne måneden.</p>';
        return;
      }
      top5El.innerHTML = `
        <table style="width:100%;border-collapse:collapse;font-size:.8rem">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted)">
              <th style="text-align:left;padding:4px 8px 4px 0;font-weight:500">Emnelinje</th>
              <th style="text-align:right;padding:4px 4px;font-weight:500;white-space:nowrap">Åpnet</th>
              <th style="text-align:right;padding:4px 4px;font-weight:500;white-space:nowrap">Klikk</th>
              <th style="text-align:right;padding:4px 0 4px 4px;font-weight:500;white-space:nowrap">Åpn.rate</th>
            </tr>
          </thead>
          <tbody>
            ${stats.top5.map((c, i) => `
              <tr style="border-bottom:1px solid var(--border)">
                <td style="padding:6px 8px 6px 0;color:var(--text)">
                  <span style="color:var(--text-muted);margin-right:6px">${i + 1}.</span>${Utils.esc(c.subject)}
                </td>
                <td style="text-align:right;padding:6px 4px;color:var(--text)">${fmt(c.opens)}</td>
                <td style="text-align:right;padding:6px 4px;color:var(--text)">${fmt(c.clicks)}</td>
                <td style="text-align:right;padding:6px 0 6px 4px;color:var(--primary)">${pct(c.openRate)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    }
  },

};
