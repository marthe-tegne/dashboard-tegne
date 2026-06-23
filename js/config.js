/* =============================================
   TEGNE DASHBOARD — Konfigurasjon
   ============================================= */

const CONFIG = {
  APP_NAME: 'TEGNE Dashboard',
  VERSION: '1.0.0',

  // Lagrede nøkler i localStorage
  STORAGE_KEYS: {
    SETTINGS:    'tegne_settings',
    WEEKLY:      'tegne_weekly',
    MONTHLY:     'tegne_monthly',
    QUARTERLY:   'tegne_quarterly',
    TASKS:       'tegne_tasks',
    BACKLOG:     'tegne_backlog',
    KEYWORDS:    'tegne_keywords',
    CALENDAR:    'tegne_calendar',
    WINLOSS:     'tegne_winloss',
    MONDAY_TABLE:'tegne_monday_table',
    AI_CONTEXT:  'tegne_ai_context',
    CAMPAIGNS:   'tegne_campaigns',
    EVENTS:      'tegne_events',
  },

  STORES: [
    { id: 'bergen',  label: 'Bergen',  icon: '📍' },
    { id: 'aasane',  label: 'Åsane',   icon: '📍' },
    { id: 'oslo',    label: 'Oslo',    icon: '📍' },
  ],

  CAMPAIGN_TYPES: [
    { id: 'hoved', label: 'Hovedkampanje', color: '#247ca7', textColor: '#fff' },
    { id: 'helg',  label: 'Helgekampanje', color: '#f7c855', textColor: '#1d2739' },
    { id: 'fokus', label: 'Fokus',         color: '#acf5ca', textColor: '#1d2739' },
  ],

  CAMPAIGN_STATUSES: [
    { id: 'ide',       label: 'Idé' },
    { id: 'planlagt',  label: 'Planlagt' },
    { id: 'aktiv',     label: 'Aktiv' },
    { id: 'avsluttet', label: 'Avsluttet' },
  ],

  EVENT_TYPES: [
    { id: 'workshop',       label: 'Workshop',         color: '#7c3aed', textColor: '#fff' },
    { id: 'kurs',           label: 'Kurs',             color: '#0891b2', textColor: '#fff' },
    { id: 'utstilling',     label: 'Utstilling',       color: '#059669', textColor: '#fff' },
    { id: 'pop-up',         label: 'Pop-up',           color: '#f59e0b', textColor: '#1d2739' },
    { id: 'butikkevent',    label: 'Butikkevent',      color: '#e1306c', textColor: '#fff' },
    { id: 'eksternt',       label: 'Eksternt',         color: '#64748b', textColor: '#fff' },
  ],

  EVENT_STATUSES: [
    { id: 'ide',        label: 'Idé' },
    { id: 'planlagt',   label: 'Planlagt' },
    { id: 'bekreftet',  label: 'Bekreftet' },
    { id: 'avsluttet',  label: 'Avsluttet' },
  ],

  CAMPAIGN_STORES: [
    { id: 'bergen',  label: 'Bergen' },
    { id: 'aasane',  label: 'Åsane' },
    { id: 'oslo',    label: 'Oslo' },
    { id: 'nett',    label: 'Nettbutikken' },
  ],

  // Standardinnstillinger
  DEFAULTS: {
    wellnessMessages: [
      'Har du drukket vann i dag? 💧',
      'Ta en pause – skjermen kan vente litt 🌿',
      'Strekk på skuldrene, du har sittet en stund 🧘',
      'Luft deg – selv fem minutter ute gjør underverker 🚶',
      'Har du spist noe i dag? Hjernen din trenger drivstoff 🍎',
      'Pust dypt tre ganger. Du gjør en strålende jobb! ✨',
      'Husk å drikke vann – ikke bare kaffe ☕💧',
      'En liten gåtur øker kreativiteten mer enn du tror 🎨',
      'Klem skuldrene opp mot ørene, hold 5 sek – slipp. Bedre! 💆',
      'Du er alene om mye – det er imponerende. Kjør på! 💪',
      'Lukk øynene i 30 sekunder og pust rolig 😌',
      'Har du tatt en skikkelig lunsjpause i dag? 🥗',
      'Se vekk fra skjermen i 20 sekunder – fokuser på noe 6 meter unna 👀',
      'Drikk et glass vann nå. Seriøst, gå og hent det! 💧',
      'Du gjør en utrolig god jobb for TEGNE. Kudos! 🌟',
      'Reis deg og ta noen steg, blodet trenger å sirkulere 🦵',
      'Har du snakket med noen i dag? Ta en hyggelig pause 😊',
      'Tøy nakken forsiktig til begge sider – ahh! 🧘',
      'Frisk luft + dagslys = mer energi til resten av dagen ☀️',
      'Er det noe du gleder deg til i dag? Tenk på det! 🎉',
      'Hendene trenger pause fra tastaturet innimellom ✋',
      'Markedsføring er et maraton, ikke sprint. Ta vare på deg! 🏃',
      'Et glass vann nå gir deg mer energi enn en ekstra kaffe 💧',
      'Sett på en sang du liker og pust ut i 3 minutter 🎵',
      'Du er TEGNEs hemmelige superpower 🎨✨',
      'Ta deg tid til å smile til noe du har fått til i dag 😊',
      'Vann! Nå! Vil du ha det med is? 🧊💧',
      'Rull skuldrene bakover – fem ganger. Der ja! 💆',
      'Hva er det fineste du har sett i dag? Hold på den tanken 🌸',
      'Siste sjanse for vannpåfyll før du glemmer det igjen 💧😄',
    ],
    bannerColor: 'primary',
  },

  // Oppgave-kategorier
  TASK_CATEGORIES: [
    { id: 'seo',          label: 'SEO',           color: '#1a5f82', bg: '#1a5f8220' },
    { id: 'innhold',      label: 'Innhold',        color: '#0a7c45', bg: '#0a7c4520' },
    { id: 'some-grafisk', label: 'SoMe & Grafisk', color: '#e1306c', bg: '#e1306c20' },
    { id: 'kampanje',     label: 'Kampanje',       color: '#92620a', bg: '#f7c85530' },
    { id: 'admin',        label: 'Admin',          color: '#6b21a8', bg: '#6b21a820' },
    { id: 'annet',        label: 'Annet',          color: '#475569', bg: '#47556920' },
  ],

  DAILY_ROUTINES_KEY: 'tegne_daily_routines',

  DAILY_ROUTINES: {
    monday:    [
      'Hent KPIer fra Metorik (omsetning, ordre, AOV)',
      'Sjekk Google Search Console (klikk, visninger, posisjon)',
      'Legg inn ukens tall i dashboardet',
      'Planlegg ukens prioriteringer',
    ],
    tuesday:   [
      'Lag og planlegg ukens SoMe-innlegg i Later',
      'Sjekk Instagram og Facebook-statistikk',
      'Planlegg innlegg frem til neste tirsdag',
    ],
    wednesday: [
      'Skriv og send nyhetsbrev i Mailchimp',
      'Sjekk statistikk fra forrige nyhetsbrev (åpningsrate, klikk)',
    ],
    thursday:  [
      'SEO-arbeid (artikler, metabeskrivelser, intern lenking)',
      'Feilretting og tekniske oppgaver i nettbutikk',
    ],
    friday:    [
      'SEO-arbeid og resterende ukesoppgaver',
      'Kort analyse av uken som har gått',
      'Forbered neste ukes prioriteringer',
    ],
  },

  // Oppgave-prioriteter
  TASK_PRIORITIES: [
    { id: 'haster',  label: '🔴 Haster',  color: '#eb5857', order: 0 },
    { id: 'hoy',     label: '🟠 Høy',     color: '#f97316', order: 1 },
    { id: 'middels', label: '🟡 Middels', color: '#f7c855', order: 2 },
    { id: 'lav',     label: '🟢 Lav',     color: '#acf5ca', order: 3 },
  ],

  // Dager i uka
  DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  DAY_LABELS: ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'],
  DAY_SHORT:  ['Man', 'Tir', 'Ons', 'Tor', 'Fre'],

  // KPI-felter
  KPI_FIELDS: [
    { key: 'revenue',     label: 'Net Revenue',  prefix: 'kr ', type: 'number', placeholder: '0',   tooltip: 'Netto omsetning. Hentes fra Metorik → Oversikt → Revenue.' },
    { key: 'orders',      label: 'Ordre',         prefix: '',   type: 'number', placeholder: '0',   tooltip: 'Antall fullførte ordre. Metorik → Oversikt → Orders.' },
    { key: 'aov',         label: 'AOV',           prefix: 'kr ', type: 'number', placeholder: '0',  tooltip: 'Gjennomsnittlig ordreverdi = Revenue ÷ Ordre. Regnes ut automatisk.', auto: true },
    { key: 'clicks',      label: 'Klikk',         prefix: '',   type: 'number', placeholder: '0',   tooltip: 'Organiske klikk fra søk. Google Search Console → Ytelse.' },
    { key: 'impressions', label: 'Visninger',     prefix: '',   type: 'number', placeholder: '0',   tooltip: 'Visninger i søkeresultater. Google Search Console → Ytelse.' },
    { key: 'ctr',         label: 'CTR',           prefix: '', suffix: '%', type: 'number', step: '0.01', placeholder: '0.0', tooltip: 'Klikkrate = Klikk ÷ Visninger × 100. Regnes ut automatisk.', auto: true },
    { key: 'position',    label: 'Pos. (snitt)',  prefix: '',   type: 'number', step: '0.1', placeholder: '0.0', tooltip: 'Gjennomsnittlig posisjon i søk. Google Search Console → Ytelse.' },
  ],

  // Måneder på norsk
  MONTHS_NO: ['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'],
  MONTHS_SHORT: ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Des'],

  // Plattformer for innholdskalender
  PLATFORMS: ['Instagram','Facebook','E-post','Blogg','Google','TikTok','Pinterest','Annet'],

  ICONS: {
    chart:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg>`,
    tasks:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
    notes:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    bulb:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14"/></svg>`,
    compass:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
    phone:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
    search:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    mail:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
    layout:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>`,
    trending: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    folder:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>`,
    tool:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>`,
    target:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    award:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
    filetext: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
    forward:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 16 16 12 12 8"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
    stars:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" 