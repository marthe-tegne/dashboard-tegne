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
  },

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

  // Dager i uka
  DAYS: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  DAY_LABELS: ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'],
  DAY_SHORT:  ['Man', 'Tir', 'Ons', 'Tor', 'Fre'],

  // KPI-felter
  KPI_FIELDS: [
    { key: 'revenue',    label: 'Net Revenue',  prefix: 'kr ', type: 'number', placeholder: '0' },
    { key: 'orders',     label: 'Ordre',         prefix: '',   type: 'number', placeholder: '0' },
    { key: 'aov',        label: 'AOV',           prefix: 'kr ', type: 'number', placeholder: '0' },
    { key: 'clicks',     label: 'Klikk',         prefix: '',   type: 'number', placeholder: '0' },
    { key: 'impressions',label: 'Visninger',     prefix: '',   type: 'number', placeholder: '0' },
    { key: 'ctr',        label: 'CTR',           prefix: '',   suffix: '%', type: 'number', step: '0.01', placeholder: '0.0' },
    { key: 'position',   label: 'Pos. (snitt)',  prefix: '',   type: 'number', step: '0.1', placeholder: '0.0' },
  ],

  // Måneder på norsk
  MONTHS_NO: ['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'],
  MONTHS_SHORT: ['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Des'],

  // Plattformer for innholdskalender
  PLATFORMS: ['Instagram','Facebook','E-post','Blogg','Google','TikTok','Pinterest','Annet'],

  // Netlify function URL (proxy for Anthropic)
  AI_ENDPOINT: '/api/claude',

  // AI-modell
  AI_MODEL: 'claude-sonnet-4-6',
};
