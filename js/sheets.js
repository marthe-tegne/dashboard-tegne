/* =============================================
   TEGNE DASHBOARD — Data-lag

   Lese: henter fra /data.json (pushet via git)
   Skrive: POST til Google Apps Script (backup)

   Hvis Apps Script ikke er konfigurert eller
   svarer, fortsetter appen normalt uten feil.
   ============================================= */

const Sheets = {

  _saveTimers: {},

  getUrl() {
    const s = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
    return s.sheetsUrl || '';
  },

  isConfigured() {
    return !!this.getUrl();
  },

  /* ---- Last inn fra data.json (seed) ---- */

  async loadFromFile() {
    try {
      const res = await fetch('/data.json?nc=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let count = 0;
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('_')) return;
        const isEmpty = (Array.isArray(value) && value.length === 0) ||
                        (value !== null && typeof value === 'object' && Object.keys(value).length === 0);
        if (isEmpty) return;
        localStorage.setItem(key, JSON.stringify(value));
        count++;
      });

      const updated = data._updated || '?';
      console.log(`data.json lastet (${updated}) — ${count} nøkler importert`);
      return { ok: true, updated };
    } catch (err) {
      console.warn('data.json ikke tilgjengelig:', err.message);
      return { ok: false };
    }
  },

  /* ---- Skriv til Google Sheets (backup) ---- */

  async set(key, value) {
    const url = this.getUrl();
    if (!url) return null;
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringif