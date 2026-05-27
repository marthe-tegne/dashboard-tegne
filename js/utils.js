/* =============================================
   TEGNE DASHBOARD — Hjelpefunksjoner
   ============================================= */

const Utils = {

  /* ---- Dato & Uke ---- */

  getISOWeek(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  getWeekYear(date = new Date()) {
    const d = new Date(date);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    return d.getFullYear();
  },

  getWeekKey(year, week) {
    return `${year}-W${String(week).padStart(2, '0')}`;
  },

  getCurrentWeek() {
    const now = new Date();
    return { year: this.getWeekYear(now), week: this.getISOWeek(now) };
  },

  getMonday(year, week) {
    const jan4 = new Date(year, 0, 4);
    const startOfWeek1 = new Date(jan4);
    startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1));
    const monday = new Date(startOfWeek1);
    monday.setDate(startOfWeek1.getDate() + (week - 1) * 7);
    return monday;
  },

  getDayDate(year, week, dayIndex) {
    const monday = this.getMonday(year, week);
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayIndex);
    return d;
  },

  formatDate(date, format = 'short') {
    const d = date instanceof Date ? date : new Date(date);
    if (format === 'short') {
      return d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
    }
    if (format === 'long') {
      return d.toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    if (format === 'iso') {
      return d.toISOString().split('T')[0];
    }
    return d.toLocaleDateString('no-NO');
  },

  getMonthKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  },

  getQuarterKey(year, quarter) {
    return `${year}-Q${quarter}`;
  },

  getCurrentMonth() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  },

  getCurrentQuarter() {
    const now = new Date();
    return { year: now.getFullYear(), quarter: Math.ceil((now.getMonth() + 1) / 3) };
  },

  addWeeks(year, week, delta) {
    const monday = this.getMonday(year, week);
    monday.setDate(monday.getDate() + delta * 7);
    return { year: this.getWeekYear(monday), week: this.getISOWeek(monday) };
  },

  addMonths(year, month, delta) {
    let m = month + delta;
    let y = year;
    while (m > 12) { m -= 12; y++; }
    while (m < 1)  { m += 12; y--; }
    return { year: y, month: m };
  },

  addQuarters(year, quarter, delta) {
    let q = quarter + delta;
    let y = year;
    while (q > 4) { q -= 4; y++; }
    while (q < 1) { q += 4; y--; }
    return { year: y, quarter: q };
  },

  getCurrentDayIndex() {
    const day = new Date().getDay();
    if (day === 0 || day === 6) return 0;
    return day - 1;
  },

  isCurrentWeek(year, week) {
    const curr = this.getCurrentWeek();
    return curr.year === year && curr.week === week;
  },

  /* ---- Tall & Formatering ---- */

  formatNum(n, decimals = 0) {
    if (n === null || n === undefined || n === '') return '–';
    return Number(n).toLocaleString('no-NO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },

  formatKr(n) {
    if (n === null || n === undefined || n === '') return '–';
    return 'kr ' + Number(n).toLocaleString('no-NO', { minimumFractionDigits: 0 });
  },

  formatPct(n, decimals = 1) {
    if (n === null || n === undefined || n === '') return '–';
    return Number(n).toLocaleString('no-NO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + '%';
  },

  delta(current, previous) {
    if (!previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  },

  deltaHTML(current, previous, invert = false) {
    const d = this.delta(current, previous);
    if (d === null) return '';
    const isPositive = invert ? d < 0 : d > 0;
    const cls = isPositive ? 'up' : 'down';
    const arrow = d > 0 ? '↑' : '↓';
    return `<span class="kpi-delta ${cls}">${arrow} ${Math.abs(d).toFixed(1)}%</span>`;
  },

  /* ---- localStorage ---- */

  load(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (typeof Sheets !== 'undefined' && typeof CONFIG !== 'undefined' && key !== CONFIG.STORAGE_KEYS.SETTINGS) {
      Sheets.debouncedSave('local', key, value, 3000);
    }
    return true;
  } catch { return false; }
},

  loadNested(storageKey, subKey, fallback = {}) {
    const store = this.load(storageKey, {});
    return store[subKey] !== undefined ? store[subKey] : fallback;
  },

  saveNested(storageKey, subKey, value) {
    const store = this.load(storageKey, {});
    store[subKey] = value;
    this.save(storageKey, store);
    if (typeof Sheets !== 'undefined' && typeof CONFIG !== 'undefined' && storageKey !== CONFIG.STORAGE_KEYS.SETTINGS) {
      Sheets.debouncedSave('local', storageKey, store);
    }
  },

  /* ---- DOM Helpers ---- */

  el(id) { return document.getElementById(id); },

  qs(selector, parent = document) { return parent.querySelector(selector); },

  qsa(selector, parent = document) { return [...parent.querySelectorAll(selector)]; },

  html(el, content) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.innerHTML = content;
  },

  on(el, event, handler) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.addEventListener(event, handler);
  },

  delegate(parent, selector, event, handler) {
    parent.addEventListener(event, e => {
      const target = e.target.closest(selector);
      if (target && parent.contains(target)) handler(e, target);
    });
  },

  /* ---- Toast ---- */

  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    t.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
    container.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s';
      setTimeout(() => t.remove(), 300);
    }, duration);
  },

  /* ---- ID Generator ---- */

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  },

  /* ---- Escape HTML ---- */

  esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },

  /* ---- Deep clone ---- */

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /* ---- Debounce ---- */

  debounce(fn, ms = 400) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
  },

};
