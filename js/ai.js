/* =============================================
   TEGNE DASHBOARD — AI-assistent (Anthropic)
   Kaller via Netlify-proxy /api/claude
   ============================================= */

const AI = {

  // Samtalehistorikk for gjeldende økt
  history: [],

  // Kontekst fra gjeldende visning
  context: { view: 'weekly', day: 'Mandag', week: '' },

  systemPrompt: `Du er en erfaren markedsføringsstrateg og AI-assistent for TEGNE — en norsk nettbutikk og kjede med tre fysiske butikker (Bergen sentrum, Horisont Åsane, Oslo) som selger kunst- og hobbyartikler.

Brukeren heter Marthe. Hun jobber alene med markedsføring og trenger din hjelp til å analysere KPIer, planlegge innhold, vurdere kampanjer og prioritere oppgaver.

TEGNE sine kanaler inkluderer: Google Ads, organisk søk/SEO, e-post, sosiale medier (Instagram, Facebook), blogg og fysiske butikker.

Svar alltid på norsk. Vær konkret, handlingsorientert og kortfattet. Bruk bullet points der det er naturlig. Unngå vage råd — gi Marthe spesifikke neste steg.

Kontekst: Du ser på ${this?.context?.view || 'ukentlig'} visning${this?.context?.day ? ` – ${this.context.day}` : ''}.`,

  /* ---- Oppdater kontekst fra app ---- */

  setContext(ctx) {
    Object.assign(this.context, ctx);
  },

  buildSystemPrompt() {
    return `Du er en erfaren markedsføringsstrateg og AI-assistent for TEGNE — en norsk nettbutikk og kjede med tre fysiske butikker (Bergen sentrum, Horisont Åsane, Oslo) som selger kunst- og hobbyartikler.

Brukeren heter Marthe. Hun jobber alene med markedsføring og trenger din hjelp til å analysere KPIer, planlegge innhold, vurdere kampanjer og prioritere oppgaver.

TEGNEs kanaler: Google Ads, organisk søk/SEO, e-post, Instagram, Facebook, blogg, fysiske butikker.

Svar alltid på norsk. Vær konkret, handlingsorientert og kortfattet. Bruk strekpunkter (–) for lister. Ikke bruk markdown-formatering: ingen # overskrifter, ingen **bold**, ingen *kursiv*, ingen hashtags.

Nåværende kontekst: ${this.context.view === 'weekly' ? `Ukentlig visning – ${this.context.day || ''} ${this.context.week || ''}` : this.context.view === 'monthly' ? `Månedlig visning – ${this.context.month || ''}` : `Kvartalsvis visning – ${this.context.quarter || ''}`}`;
  },

  /* ---- Hent API-konfigurasjon ---- */

  getApiConfig() {
    const s = Utils.load(CONFIG.STORAGE_KEYS.SETTINGS, {});
    if (s.anthropicKey) {
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': s.anthropicKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      };
    }
    return {
      url: CONFIG.AI_ENDPOINT,
      headers: { 'Content-Type': 'application/json' },
    };
  },

  async callAPI(payload) {
    const { url, headers } = this.getApiConfig();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || err.error || `HTTP ${response.status}`);
    }
    return response.json();
  },

  /* ---- Send melding ---- */

  async send(userMessage, kpiContext = null) {
    this.history.push({ role: 'user', content: userMessage });
    this.renderMessage('user', userMessage);

    const typingId = this.renderTyping();

    let fullContent = '';
    try {
      const messages = this.history.map(m => ({ role: m.role, content: m.content }));
      if (kpiContext) {
        messages[messages.length - 1].content =
          `[KPI-data denne uken:\n${kpiContext}]\n\n${userMessage}`;
      }

      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 1024,
        system: this.buildSystemPrompt(),
        messages,
      });
      fullContent = data.content?.[0]?.text || 'Ingen respons fra AI.';

    } catch (err) {
      fullContent = `Kunne ikke koble til AI-assistenten. Sjekk Netlify-funksjonen og API-nøkkelen. (${err.message})`;
    }

    this.removeTyping(typingId);
    this.history.push({ role: 'assistant', content: fullContent });
    this.renderMessage('assistant', fullContent);
    return fullContent;
  },

  /* ---- Streaming (uten SSE — bruker vanlig fetch) ---- */

  /* ---- Generer diagnose basert på KPI-data ---- */

  async generateDiagnosis(kpiData, previousKpiData = null) {
    const lines = [];
    const fields = CONFIG.KPI_FIELDS;

    fields.forEach(f => {
      const val = kpiData[f.key];
      const prev = previousKpiData?.[f.key];
      if (val !== undefined && val !== '') {
        let line = `${f.label}: ${f.prefix || ''}${val}${f.suffix || ''}`;
        if (prev !== undefined && prev !== '') {
          const d = Utils.delta(Number(val), Number(prev));
          if (d !== null) line += ` (${d > 0 ? '+' : ''}${d.toFixed(1)}% vs forrige uke)`;
        }
        lines.push(line);
      }
    });

    if (lines.length === 0) {
      return 'Ingen KPI-data er lagt inn ennå. Legg inn tall over for å få diagnose.';
    }

    const prompt = `Analyser disse KPIene for TEGNE og gi en kort diagnose på 3-5 linjer, etterfulgt av 2-3 konkrete tiltak. Skriv ren tekst uten overskrifter eller formatering.\n\n${lines.join('\n')}`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 512,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      return data.content?.[0]?.text || 'Ingen diagnose tilgjengelig.';
    } catch (err) {
      return `Kunne ikke generere diagnose: ${err.message}`;
    }
  },

  /* ---- Generer mandagsanalyse ---- */

  async generateMondayAnalysis(thisWeekData, lastWeekData) {
    const prompt = `Det er mandag. Analyser KPI-data for TEGNE og gi en ukeoversikt.

Forrige uke: ${JSON.stringify(lastWeekData || {})}
Denne uke: ${JSON.stringify(thisWeekData || {})}

Svar med JSON som har disse nøklene:
- innhold_opp: array med MAKS 3 STIKKORD (1–3 ord hver) for innhold/kategorier med positiv trend
- innhold_ned: array med MAKS 3 STIKKORD (1–3 ord hver) for innhold som taper trafikk
- sokeord_opp: array med MAKS 3 STIKKORD (1–3 ord hver) for søkeord med stigende posisjon
- sokeord_ned: array med MAKS 3 STIKKORD (1–3 ord hver) for søkeord som synker
- analyse: én kort overordnet oppsummering av uka (2–4 setninger, fokus på hva som skiller seg ut og hva Marthe bør prioritere)

VIKTIG: Stikkordene skal være KORTE nøkkelord (f.eks. "Akvarellfarger", "Tegne blogg", "Fyllepenner") — IKKE setninger eller forklaringer.`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 512,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      const text = data.content?.[0]?.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch {
      return null;
    }
  },

  /* ---- Generer fredagsforslag ---- */

  async generateFridaySuggestions(weekSummary) {
    const prompt = `Det er fredag. Basert på ukens data for TEGNE, foreslå:
1. 2-3 artikler/blogginnlegg (enten ny artikkel eller vedlikehold av eksisterende)
2. Kategori-påminnelse: hvilke produktkategorier bør løftes neste uke?

Ukens sammendrag: ${JSON.stringify(weekSummary)}

Format: JSON med nøklene:
- articles: array av { title, type: "ny"|"vedlikehold", reason }
- categories: array av strenger`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 512,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      const text = data.content?.[0]?.text || '{}';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch {
      return null;
    }
  },

  /* ---- Generer ukentlig innleggsplan ---- */

  async generatePostPlan({ kpi, keywords, banner }) {
    const prompt = `Lag en ukentlig innleggsplan for TEGNE på Instagram og Facebook.

Kontekst:
- Aktiv kampanje/sesong: ${banner || 'ingen spesifisert'}
- Søkeord i fokus: ${keywords?.map(k => k.text).filter(Boolean).join(', ') || 'ikke spesifisert'}
- KPI-nivå: omsetning ${kpi?.revenue || '?'}, ordre ${kpi?.orders || '?'}

Foreslå 4-6 innlegg fordelt på Instagram og Facebook. For hvert innlegg, start linjen med plattform i hakeparentes, f.eks.:
[Instagram] Vis tegnesettets farger — Reels med time-lapse av akvarellprosessen
[Facebook] Produktfokus: ny akvarell-serie fra Winsor & Newton`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 600,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      return data.content?.[0]?.text || null;
    } catch (err) {
      console.error('generatePostPlan feil:', err);
      return null;
    }
  },

  /* ---- Generer SoMe innholdsforslag ---- */

  async generateSoMeContent({ kpi, banner, week }) {
    const prompt = `Lag konkrete innholdsforslag til Instagram og Facebook for TEGNE denne uka.

Kontekst:
- Aktiv kampanje/sesong: ${banner || 'ingen'}
- KPI: omsetning ${kpi?.revenue || '?'}, ordre ${kpi?.orders || '?'}

Lag 3-4 innholdsforslag. For hvert forslag, spesifiser:
- Hvilken plattform (Instagram eller Facebook)
- Format (f.eks. Reels, Stories, Karusellinlegg, Bilde)
- Tittel/tema
- Kort beskrivelse (1-2 setninger)
- Forslag til bildetekst/caption (maks 2 setninger)

TEGNE selger kunst- og hobbyartikler — inspirasjonsinnhold, produktfokus og tutorials fungerer godt.

Svar som JSON-array: [{ "platform": "Instagram"|"Facebook", "format": "...", "title": "...", "description": "...", "caption": "..." }]`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 768,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      const text = data.content?.[0]?.text || '[]';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      return null;
    } catch { return null; }
  },

  /* ---- Generer nyhetsbrev-ideer ---- */

  async generateNewsletterIdeas({ mondayTable, keywords, banner, weekKpi, priorities }) {
    const kwList = keywords.filter(k => k.text).map(k => k.text).join(', ') || 'ingen';
    const prompt = `Lag 3–4 konkrete nyhetsbrev-ideer for TEGNE denne uken.

Ukens kontekst:
- Ukens prioriteringer (Marthe sine egne notater): ${priorities || 'ikke fylt inn'}
- Innhold på vei opp: ${(mondayTable.innhold_opp || []).join(', ') || 'ingen'}
- Innhold på vei ned: ${(mondayTable.innhold_ned || []).join(', ') || 'ingen'}
- Søkeord på vei opp: ${(mondayTable.sokeord_opp || []).join(', ') || 'ingen'}
- Aktiv kampanje: ${banner || 'ingen'}
- Søkeord i spotlight: ${kwList}
- KPI: omsetning ${weekKpi?.revenue || '?'}, ordre ${weekKpi?.orders || '?'}

For hver idé, gi:
- emne: kort tema (3–6 ord)
- vinkel: én setning om hva nyhetsbrevet handler om og hvorfor det er relevant nå
- emnelinje: ett konkret forslagsubjekt til e-posten (maks 8 ord, engasjerende)

Svar som JSON-array: [{ "emne": "...", "vinkel": "...", "emnelinje": "..." }]`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 512,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      const text = data.content?.[0]?.text || '[]';
      const match = text.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      return null;
    } catch { return null; }
  },

  /* ---- Generer dagsbriefing basert på mandagsdata ---- */

  async generateDailyBrief(dayLabel, { mondayTable, keywords, banner, weekKpi }) {
    const dayContexts = {
      'Tirsdag':  'Marthe bruker tirsdager til SoMe-arbeid (Instagram og Facebook). Hun skal planlegge og publisere innlegg denne dagen.',
      'Onsdag':   'Marthe jobber med nyhetsbrev og e-postkampanjer i dag. Hun trenger innholdsvinkler til e-posten.',
      'Torsdag':  'Marthe ferdigstiller nyhetsbrev og starter SEO-vedlikehold. Praktiske prioriteringer er viktig.',
      'Fredag':   'Marthe jobber med SEO, blogg og vedlikehold av eksisterende innhold. Konkrete søkeord og artikkelprioriteringer er nyttig.',
    };

    const kwList = keywords.filter(k => k.text).map(k => `${k.text} (pos: ${k.position || '?'}, ${k.trend || '→'})`).join(', ') || 'ingen registrert';

    const prompt = `${dayContexts[dayLabel] || ''}

Ukens data fra TEGNE:
- Innhold på vei opp: ${(mondayTable.innhold_opp || []).join(', ') || 'ingen'}
- Innhold på vei ned: ${(mondayTable.innhold_ned || []).join(', ') || 'ingen'}
- Søkeord på vei opp: ${(mondayTable.sokeord_opp || []).join(', ') || 'ingen'}
- Søkeord på vei ned: ${(mondayTable.sokeord_ned || []).join(', ') || 'ingen'}
- Søkeord i spotlight denne uka: ${kwList}
- Aktiv kampanje: ${banner || 'ingen'}
- KPI (omsetning: ${weekKpi.revenue || '?'}, ordre: ${weekKpi.orders || '?'})

Gi 4–5 konkrete, handlingsorienterte tips tilpasset akkurat det Marthe skal gjøre i dag (${dayLabel}). Vær spesifikk — ikke generell markedsføringsrådgivning. Bruk bullet points.`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 512,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      return data.content?.[0]?.text || '';
    } catch { return ''; }
  },

  /* ---- Generer månedlig AI-kommentar ---- */

  async generateMonthlyComment(monthData) {
    const prompt = `Analyser månedsdataene for TEGNE og gi en kort oppsummering (4-6 setninger) med fokus på hva som funket, hva som ikke funket, og anbefalinger for neste måned:\n\n${JSON.stringify(monthData)}`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 512,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      return data.content?.[0]?.text || '';
    } catch {
      return '';
    }
  },

  /* ---- Generer kvartalsanalyse ---- */

  async generateQuarterlyAnalysis(quarterData, prevQuarterData) {
    const prompt = `Analyser kvartalsdata for TEGNE. Sammenlign med forrige kvartal og gi strategiske anbefalinger.

Dette kvartalet: ${JSON.stringify(quarterData)}
Forrige kvartal: ${JSON.stringify(prevQuarterData || {})}

Gi: (1) Overordnet vurdering, (2) Hva gikk bra, (3) Hva bør forbedres, (4) 3 strategiske anbefalinger for neste kvartal.`;

    try {
      const data = await this.callAPI({
        model: CONFIG.AI_MODEL,
        max_tokens: 768,
        system: this.buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });
      return data.content?.[0]?.text || '';
    } catch {
      return '';
    }
  },

  /* ---- Render meldinger i panelet ---- */

  renderMessage(role, content) {
    const container = document.getElementById('aiMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `ai-msg ai-msg--${role === 'user' ? 'user' : 'bot'}`;
    const initials = role === 'user' ? 'M' : 'AI';
    const formatted = content
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/•\s/g, '• ')
      .replace(/^(\d+\.\s)/gm, '$1');
    div.innerHTML = `
      <div class="ai-msg-avatar">${initials}</div>
      <div class="ai-msg-bubble">${formatted}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },

  renderTyping() {
    const container = document.getElementById('aiMessages');
    if (!container) return null;
    const id = 'typing-' + Utils.uid();
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg--bot';
    div.id = id;
    div.innerHTML = `<div class="ai-msg-avatar">AI</div><div class="ai-msg-bubble typing">Skriver…</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
  },

  removeTyping(id) {
    if (id) document.getElementById(id)?.remove();
  },

  clearHistory() {
    this.history = [];
    const container = document.getElementById('aiMessages');
    if (container) {
      container.innerHTML = `
        <div class="ai-msg ai-msg--bot">
          <div class="ai-msg-avatar">AI</div>
          <div class="ai-msg-bubble">Hei Marthe! 👋 Ny samtale startet. Hva kan jeg hjelpe deg med?</div>
        </div>`;
    }
  },

};
