/* =============================================
   TEGNE DASHBOARD — Hoved-app logikk
   ============================================= */

const App = {

  currentView: 'weekly',

  init() {
    this.loadSettings();
    this.bindMainNav();
    this.bindAIPanel();
    this.bindSettingsModal();
    this.initWellness();
    this.bindHomeBtn();
    this.registerSW();

    // Start med ukentlig visning
    Weekly.init();
    Monthly.init();
    Quarterly.init();
    Campaigns.init();
    Events.init();

    this.setView('weekly');
    this.checkPeriodicReminders();
  },

  /* ---- Innstillinger ---- */

  loadSettings() {
    const s = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
    if (s.banner) this.applyBanner(s.banner, s.bannerColor || 'primary');
    if (s.anthropicKey) {
      const el = Utils.el('anthropicKey');
      if (el) el.value = s.anthropicKey;
    }
    if (s.sheetsUrl) {
      const el = Utils.el('sheetsUrl');
      if (el) el.value = s.sheetsUrl;
    }
    const thresh = s.thresholds || {};
    ['thresh_position_warn','thresh_position_err','thresh_revenue_warn','thresh_ctr_warn'].forEach(id => {
      const el = Utils.el(id);
      if (el && thresh[id] !== undefined) el.value = thresh[id];
    });
    if (s.bannerInput) {
      const el = Utils.el('bannerInput');
      if (el) el.value = s.bannerInput;
    }
  },

  saveSettings() {
    const sheetsUrl    = Utils.el('sheetsUrl')?.value.trim() || '';
    const anthropicKey = Utils.el('anthropicKey')?.value.trim() || '';
    const banner       = Utils.el('bannerInput')?.value.trim() || '';
    const bannerColor  = document.querySelector('input[name="bannerColor"]:checked')?.value || 'primary';
    const wellnessText = Utils.el('wellnessText')?.value.trim() || '';

    const thresholds = {};
    ['thresh_position_warn','thresh_position_err','thresh_revenue_warn','thresh_ctr_warn'].forEach(id => {
      const v = Utils.el(id)?.value.trim();
      if (v !== '') thresholds[id] = parseFloat(v);
    });

    const s = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
    Object.assign(s, { sheetsUrl, anthropicKey, banner, bannerColor, bannerInput: banner, wellnessText, thresholds });
    Utils.save(CONFIG.STORAGE_KEYS.SETTINGS, s);

    if (banner) this.applyBanner(banner, bannerColor);
    else this.hideBanner();

    if (wellnessText) {
      const pill = Utils.el('wellnessPill');
      if (pill) pill.title = wellnessText;
    }

    this.closeModal('settingsModal');
    Utils.toast('Innstillinger lagret', 'success');
  },

  /* ---- Campaign Banner ---- */

  applyBanner(text, color = 'primary') {
    const banner  = Utils.el('campaignBanner');
    const textEl  = Utils.el('bannerText');
    if (!banner || !textEl) return;
    banner.style.display = '';
    textEl.textContent   = text;
    banner.className     = `campaign-banner banner-${color}`;
  },

  hideBanner() {
    const banner = Utils.el('campaignBanner');
    if (banner) banner.style.display = 'none';
  },

  bindHomeBtn() {
    Utils.on('homeBtn', 'click', () => {
      const { year, week } = Utils.getCurrentWeek();
      Weekly.state.year = year;
      Weekly.state.week = week;
      Weekly.state.dayIndex = Utils.getCurrentDayIndex();
      this.setView('weekly');
    });
  },

  /* ---- Hoved-navigasjon ---- */

  bindMainNav() {
    Utils.qsa('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        if (view) this.setView(view);
      });
    });
  },

  setView(view) {
    this.currentView = view;

    // Oppdater nav-tabs
    Utils.qsa('.nav-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });

    // Vis riktig section
    Utils.qsa('.view').forEach(section => {
      section.classList.toggle('active', section.id === view + 'View');
    });

    // Trigger render for den aktive visningen
    if (view === 'weekly')    Weekly.render();
    if (view === 'monthly')   Monthly.render();
    if (view === 'quarterly') Quarterly.render();
    if (view === 'campaigns') Campaigns.render();

    // Oppdater AI kontekst-badge
    this.updateAIContext(view);
  },

  updateAIContext(view) {
    const badge = Utils.el('aiContextBadge');
    if (!badge) return;
    if (view === 'weekly') {
      const day = CONFIG.DAY_LABELS[Weekly.state.dayIndex] || '';
      badge.textContent = `Ukentlig · ${day} · Uke ${Weekly.state.week}`;
    } else if (view === 'monthly') {
      badge.textContent = `Månedlig · ${CONFIG.MONTHS_NO[Monthly.state.month - 1]} ${Monthly.state.year}`;
    } else if (view === 'quarterly') {
      badge.textContent = `Kvartalsvis · Q${Quarterly.state.quarter} ${Quarterly.state.year}`;
    } else {
      badge.textContent = 'Kampanjer';
    }
  },

  /* ---- AI Panel ---- */

  bindAIPanel() {
    const panel    = Utils.el('aiPanel');
    const backdrop = Utils.el('aiBackdrop');

    Utils.on('aiBtn', 'click', () => this.toggleAIPanel(true));
    Utils.on('closeAiBtn', 'click', () => this.toggleAIPanel(false));
    Utils.on('clearAiBtn', 'click', () => AI.clearHistory());

    if (backdrop) backdrop.addEventListener('click', () => this.toggleAIPanel(false));

    // Send melding
    Utils.on('aiSend', 'click', () => this.sendAIMessage());
    Utils.on('aiInput', 'keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendAIMessage();
      }
    });

    // Quick prompts
    Utils.qsa('.quick-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = Utils.el('aiInput');
        if (input) { input.value = btn.dataset.prompt; this.sendAIMessage(); }
      });
    });
  },

  toggleAIPanel(open) {
    const panel    = Utils.el('aiPanel');
    const backdrop = Utils.el('aiBackdrop');
    if (!panel) return;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    if (backdrop) backdrop.classList.toggle('visible', open);
    if (open) {
      this.updateAIContext(this.currentView);
      setTimeout(() => Utils.el('aiInput')?.focus(), 200);
    }
  },

  async sendAIMessage() {
    const input = Utils.el('aiInput');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();
    input.value = '';
    input.style.height = '';

    // Bygg KPI-kontekst fra aktiv visning
    let kpiCtx = null;
    if (this.currentView === 'weekly') {
      const dayKey = Weekly.getDayKey ? Weekly.getDayKey() : null;
      if (dayKey) {
        const kpiData = Weekly.getDayData(dayKey);
        const lines = CONFIG.KPI_FIELDS
          .filter(f => kpiData[f.key] !== undefined && kpiData[f.key] !== '')
          .map(f => `${f.label}: ${kpiData[f.key]}`);
        if (lines.length) kpiCtx = lines.join('\n');
      }
    }

    await AI.send(msg, kpiCtx);
  },

  /* ---- Settings Modal ---- */

  bindSettingsModal() {
    Utils.on('settingsBtn', 'click', () => this.openModal('settingsModal'));
    Utils.on('saveSettings', 'click', () => this.saveSettings());
    Utils.on('forceSyncBtn', 'click', () => this.forceSyncToSheets());
    Utils.qsa('.modal-close, [data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal || btn.closest('.modal-overlay')?.id;
        if (modalId) this.closeModal(modalId);
      });
    });
    // Lukk ved klikk utenfor modal
    Utils.qsa('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this.closeModal(overlay.id);
      });
    });
  },

  openModal(id) {
    const el = Utils.el(id);
    if (el) { el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); }
  },

  closeModal(id) {
    const el = Utils.el(id);
    if (el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }
  },

  /* ---- Wellness påminnelse ---- */

  initWellness() {
    const msgs = CONFIG.DEFAULTS.wellnessMessages;
    // Bruker årets dag-nummer som indeks → ny melding hver dag
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    const msg = msgs[dayOfYear % msgs.length];

    const pill = Utils.el('wellnessPill');
    if (pill) {
      pill.title = msg;
      pill.addEventListener('click', () => {
        Utils.toast(msg, 'info', 5000);
      });
    }
  },

  checkPeriodicReminders() {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const lastKey = Utils.load('tegne_reminder_last', '');
    const todayKey = `${now.getFullYear()}-${month}-${day}`;
    if (lastKey === todayKey) return;

    const isQuarterStart = day === 1 && [1, 4, 7, 10].includes(month);

    if (day === 1) {
      setTimeout(() => {
        Utils.toast('📅 Det er den 1. — husk å legge inn månedstall i Månedlig-fanen!', 'info', 8000);
      }, 2000);
    }
    if (isQuarterStart) {
      setTimeout(() => {
        Utils.toast('📊 Nytt kvartal! Husk å oppdatere Kvartalsvis-fanen.', 'info', 8000);
      }, 4000);
    }

    Utils.save('tegne_reminder_last', todayKey);
  },

  /* ---- Last inn data fra data.json ---- */

  async syncFromSheets() {
    const result = await Sheets.loadFromFile();
    if (result.ok) {
      Weekly.render();
      Monthly.render();
      Quarterly.render();
      Campaigns.render();
      Utils.toast(`Data lastet (${result.updated}) ✓`, 'success');
    }
  },

  async forceSyncToSheets() {
    Utils.toast('Laster inn data fra data.json…', 'info', 2000);
    const result = await Sheets.loadFromFile();
    if (result.ok) {
      Weekly.render();
      Monthly.render();
      Quarterly.render();
      Campaigns.render();
      Utils.toast(`Data oppdatert (${result.updated}) ✓`, 'success');
    } else {
      Utils.toast('Kunne ikke laste data.json', 'error');
    }
  },

  /* ---- PWA Service Worker ---- */

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('SW registrert'))
        .catch(err => console.warn('SW feil:', err));
    }
  },

};

// ---- Start app ----
document.addEventListener('DOMContentLoaded', () => App.init());
