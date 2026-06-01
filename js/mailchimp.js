/* =============================================
   TEGNE DASHBOARD — Mailchimp-integrasjon
   ============================================= */

const Mailchimp = {

  async fetchStats(year, month) {
    try {
      const res = await fetch(`/api/mailchimp?year=${year}&month=${month}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    } catch (err) {
      return { error: err.message };
    }
  },

};
