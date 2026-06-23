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
        body: JSON.stringify({ action: 'set', key, value }),
      });
      const json = await res.json().catch(() => null);
      console.log(`Sheets.set(${key}) →`, json?.status || 'ok');
      return json;
    } catch (err) {
      console.warn(`Sheets.set(${key}) feilet:`, err.message);
      return null;
    }
  },

  async get(key) {
    const url = this.getUrl();
    if (!url) return null;
    try {
      const res = await fetch(`${url}?action=get&key=${encodeURIComponent(key)}`);
      return await res.json().catch(() => null);
    } catch (err) {
      console.warn(`Sheets.get(${key}) feilet:`, err.message);
      return null;
    }
  },

  /* ---- Debounced save (kaller set etter 2 sek) ---- */

  debouncedSave(type, key, value) {
    const timerKey = `${type}__${key}`;
    clearTimeout(this._saveTimers[timerKey]);
    this._saveTimers[timerKey] = setTimeout(() => {
      this.set(key, value);
    }, 2000);
  },

  /* ---- Synk alt til Sheets ---- */

  async syncAll() {
    const url = this.getUrl();
    if (!url) return;
    const keys = Object.values(CONFIG.STORAGE_KEYS);
    for (const key of keys) {
      const val = Utils.load(key, null);
      if (val !== null) await this.set(key, val);
    }
    console.log('Synk til Sheets fullført');
  },

  /* ---- Stubs ---- */
  async request()  { return null; },
  async list()     { return []; },
  async fetchAll() { return false; },

};
