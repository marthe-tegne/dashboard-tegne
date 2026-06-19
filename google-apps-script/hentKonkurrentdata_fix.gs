// ── Konkurrentdata (FIKSET – parallell henting med timeout) ──────────────
function hentKonkurrentdata() {
  // Bygg alle forespørsler på én gang
  const requests = CONFIG.KONKURRENTER.map(k => ({
    url: k.url,
    muteHttpExceptions: true,
    followRedirects: true,
    headers: { "User-Agent": "Mozilla/5.0" },
    deadline: 10,   // maks 10 sek per nettside — stopper henging
  }));

  let svar;
  try {
    svar = UrlFetchApp.fetchAll(requests);  // alle 15 hentes parallelt
  } catch(e) {
    Logger.log("fetchAll feilet: " + e.message);
    return CONFIG.KONKURRENTER.map(k => ({ navn: k.navn, status: "feil" }));
  }

  return CONFIG.KONKURRENTER.map((k, i) => {
    try {
      const resp = svar[i];
      if (!resp || resp.getResponseCode() >= 400) return { navn: k.navn, status: "feil" };
      const tekst  = resp.getContentText().substring(0, 6000);
      const h1     = (tekst.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [])
                       .map(h => h.replace(/<[^>]+>/g, "").trim()).slice(0, 3);
      const kamp   = [...new Set((tekst.match(/salg|rabatt|tilbud|kampanje|%\s*off/gi) || []))]
                       .slice(0, 4);
      return { navn: k.navn, h1, kampanjer: kamp, status: "ok" };
    } catch(e) {
      return { navn: k.navn, status: "feil" };
    }
  });
}
