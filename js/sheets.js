/* =============================================
   TEGNE DASHBOARD — Data fra data.json
   (erstatter Google Sheets-integrasjon)

   Data oppdateres av Claude i Cowork.
   Push til Netlify for å deploye endringer.
   ============================================= */

const Sheets = {

  /* ---- Last inn all data fra data.json ---- */

  async loadFromFile() {
    try {
      const res = await fetch('/data.json?nc=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let count = 0;
      Object.entries(data).forEach(([key, value]) => {
        if (!key.startsWith('_')) {
          localStorage.setItem(key, JSON.stringify(value));
          count++;
        }
      });

      const updated = data._updated || '?';
      console.log(`data.json lastet (${updated}) — ${count} nøkler importert`);
      return { ok: true, updated };
    } catch (err) {
      console.warn('data.json ikke tilgjengelig:', err.message);
      return { ok: false };
    }
  },

  /* ---- Stubs for bakoverkompatibilitet ---- */

  isConfigured() { return false; },
  async request()  { return null; },
  async get()      { return null; },
  async set()      { return null; },
  async list()     { return []; },
  async syncAll()  { return; },
  async fetchAll() { return false; },
  debouncedSave()  { /* no-op — data skrives via Claude + git push */ },

};
