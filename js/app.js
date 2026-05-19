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

    this.setView('weekly');
    this.syncFromSheets();
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

    const s = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
    Object.assign(s, { sheetsUrl, anthropicKey, banner, bannerColor, bannerInput: banner, wellnessText });
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
    } else {
      badge.textContent = `Kvartalsvis · Q${Quarterly.state.quarter} ${Quarterly.state.year}`;
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

  /* ---- Google Sheets sync ---- */

  async syncFromSheets() {
    if (!Sheets.isConfigured()) return;

    const hasLocalData = Object.values(CONFIG.STORAGE_KEYS)
      .filter(k => k !== CONFIG.STORAGE_KEYS.SETTINGS)
      .some(k => {
        const d = Utils.load(k, null);
        return d !== null && Object.keys(d).length > 0;
      });

    if (hasLocalData) {
      await Sheets.syncAll();
      Utils.toast('Data lagret til Google Sheets ✓', 'success');
    } else {
      const ok = await Sheets.fetchAll();
      if (ok) {
        Utils.toast('Data hentet fra Google Sheets ✓', 'success');
        if (this.currentView === 'weekly')    Weekly.render();
        if (this.currentView === 'monthly')   Monthly.render();
        if (this.currentView === 'quarterly') Quarterly.render();
      }
    }
  },

  async forceSyncToSheets() {
    if (!Sheets.isConfigured()) {
      Utils.toast('Ingen Google Sheets-URL konfigurert', 'error');
      return;
    }
    Utils.toast('Synkroniserer…', 'info', 2000);
    await Sheets.syncAll();
    Utils.toast('All data pushet til Google Sheets ✓', 'success');
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
