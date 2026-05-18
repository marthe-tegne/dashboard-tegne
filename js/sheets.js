/* =============================================
   TEGNE DASHBOARD — Google Sheets integrasjon
   Apps Script fungerer som REST API
   ============================================= */

const Sheets = {

  get url() {
    return Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {}).sheetsUrl || '';
  },

  isConfigured() {
    return !!this.url;
  },

  /* ---- Generisk fetch mot Apps Script ---- */

  async request(action, payload = {}) {
    if (!this.isConfigured()) return null;
    try {
      const body = JSON.stringify({ action, ...payload });
      const res = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (err) {
      console.warn('Sheets feil:', err.message);
      return null;
    }
  },

  /* ---- Hent data ---- */

  async get(type, key) {
    const res = await this.request('get', { type, key });
    return res ? res.value : null;
  },

  /* ---- Lagre data ---- */

  async set(type, key, value) {
    return await this.request('set', { type, key, value: JSON.stringify(value) });
  },

  /* ---- Hent alle nøkler for en type ---- */

  async list(type) {
    const res = await this.request('list', { type });
    return res ? res.keys : [];
  },

  /* ---- Synkroniser alle lokale data til Sheets ---- */

  async syncAll() {
    if (!this.isConfigured()) return;
    const keys = Object.values(CONFIG.STORAGE_KEYS);
    const syncJobs = keys.map(async key => {
      const data = Utils.load(key, null);
      if (data !== null) {
        await this.set('local', key, data);
      }
    });
    await Promise.allSettled(syncJobs);
  },

  /* ---- Last ned alle data fra Sheets ---- */

  async fetchAll() {
    if (!this.isConfigured()) return false;
    try {
      const res = await this.request('getAll');
      if (!res || !res.data) return false;
      Object.entries(res.data).forEach(([key, value]) => {
        try {
          Utils.save(key, typeof value === 'string' ? JSON.parse(value) : value);
        } catch {}
      });
      return true;
    } catch {
      return false;
    }
  },

  /* ---- Lagre enkelt datapunkt med debounce ---- */

  _saveTimers: {},

  debouncedSave(type, key, value, delay = 2000) {
    const timerKey = `${type}:${key}`;
    clearTimeout(this._saveTimers[timerKey]);
    this._saveTimers[timerKey] = setTimeout(() => {
      this.set(type, key, value);
    }, delay);
  },

};
