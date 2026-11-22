// Cheque Printer web: print a CTS-2010 cheque from the browser.
// Feed: right side down (date end goes into the printer first), same as the desktop app.
// Everything runs in this page; nothing is sent anywhere. Settings stay in localStorage.
(function () {
  'use strict';
  var LEAF = { w: 202, h: 92, micr: 13 };
  // Effective layouts (mm from the leaf's top-left), matching the desktop app's system default
  // for right-side-down feed. Every built-in bank uses the SBI-calibrated CTS layout except Saraswat.
  var CTS = { date: [158, 6, 41.9, 11], payee: [26, 19.1, 145, 12], words1: [27, 28.7, 112, 10], words2: [10, 37.7, 128, 10], figures: [160, 34.5, 36, 11] };
  var SARASWAT = { date: [151.85, 7.0, 41.9, 11], payee: [26, 19.65, 145, 12], words1: [27, 29.2, 112, 10], words2: [10, 38.2, 128, 10], figures: [155.2, 36.2, 36, 11] };
  var BANKS = [['sbi', 'State Bank of India'], ['hdfc', 'HDFC Bank'], ['icici', 'ICICI Bank'], ['axis', 'Axis Bank'], ['pnb', 'Punjab National Bank'],
    ['bob', 'Bank of Baroda'], ['canara', 'Canara Bank'], ['union', 'Union Bank of India'], ['kotak', 'Kotak Mahindra Bank'], ['yes', 'Yes Bank'],
    ['idbi', 'IDBI Bank'], ['indian', 'Indian Bank'], ['boi', 'Bank of India'], ['central', 'Central Bank of India'], ['uco', 'UCO Bank'],
    ['iob', 'Indian Overseas Bank'], ['idfc', 'IDFC First Bank'], ['indusind', 'IndusInd Bank'], ['federal', 'Federal Bank'], ['mahabank', 'Bank of Maharashtra'],
    ['saraswat', 'Saraswat Co-operative Bank'], ['generic', 'Other bank (standard CTS-2010)']];
  var PAGES = { a4: { w: 210, h: 297, label: 'A4' }, in8x7: { w: 177.8, h: 203.2, label: '8 × 7 in' } };
  var KEY = 'cpweb.print.v1';
  var DEF = { bank: 'sbi', page: 'a4', guide: 'center', shiftX: -0.5, shiftY: -0.4, dateBoxes: true, remarkOn: true, crossing: 'accountPayee',
    nudge: { date: [0, 0], payee: [0, 0], words: [0, 0], figures: [0, 0], remark: [0, 0] } };

  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || '{}'); var o = JSON.parse(JSON.stringify(DEF));
      for (var k in s) if (k !== 'nudge') o[k] = s[k];
      if (s.nudge) for (var n in o.nudge) if (Array.isArray(s.nudge[n])) o.nudge[n] = [Number(s.nudge[n][0]) || 0, Number(s.nudge[n][1]) || 0];
      return o; } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch (e) {} }
  var cfg = load();

  // ---- amount in words (Indian lakh / crore), same wording as the app ----
  var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function two(n) { return n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''); }
  function three(n) { var h = Math.floor(n / 100), r = n % 100; return (h ? ones[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? two(r) : ''); }
  function indian(n) { if (n === 0) return ''; var p = [], cr = Math.floor(n / 1e7); n %= 1e7;
    if (cr) p.push((cr > 99 ? indian(cr) : two(cr)) + ' Crore'); var l = Math.floor(n / 1e5); n %= 1e5; if (l) p.push(two(l) + ' Lakh');
    var t = Math.floor(n / 1000); n %= 1000; if (t) p.push(two(t) + ' Thousand'); if (n) p.push(three(n)); return p.join(' '); }
  function parseAmt(v) { v = String(v || '').replace(/[,\s₹]/g, ''); if (!/^\d+(\.\d{0,2})?$/.test(v)) return null;
    var a = v.split('.'), r = parseInt(a[0], 10), ps = a[1] ? parseInt((a[1] + '0').slice(0, 2), 10) : 0; if (r > 999999999999) return null; return { r: r, p: ps }; }
  function words(v) { var a = parseAmt(v); if (!a) return ''; var w = indian(a.r); w = w ? w + ' Rupees' : 'Zero Rupees';
    if (a.p) w += ' and ' + two(a.p) + ' Paise'; return w + ' Only'; }
  function group(n) { var s = String(n), last = s.slice(-3), rest = s.slice(0, -3); return rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last : last; }
  function figures(v) { var a = parseAmt(v); return a ? '/***' + group(a.r) + '.' + String(a.p).padStart(2, '0') + '/-***' : ''; }
  // Courier: each glyph is 0.6 em wide; 1 pt = 0.3528 mm
  function charsFit(widthMm, pt) { return Math.max(8, Math.floor(widthMm / (pt * 0.3528 * 0.6))); }
  function splitWords(text, w1, w2, pt) {
    var c1 = charsFit(w1, pt), c2 = charsFit(w2, pt), parts = text.toUpperCase().split(' '), l1 = '', i = 0;
    while (i < parts.length && (l1 ? l1.length + 1 : 0) + parts[i].length <= c1) { l1 += (l1 ? ' ' : '') + parts[i]; i++; }
    var l2 = parts.slice(i).join(' ');
    if (!l2) { l2 = ''; } // pad the last line with dashes so nothing can be added
    if (l2) l2 += ' '; else l1 += ' ';
    if (l2) { while (l2.length < c2) l2 += '-'; } else { while (l1.length < c1) l1 += '-'; l2 = new Array(c2 + 1).join('-'); }
    return [l1, l2];
  }
  function fitPt(text, widthMm, pt, min) { while (pt > min && text.length * pt * 0.3528 * 0.6 > widthMm) pt -= 0.25; return pt; }
  function dmy(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? [m[3], m[2], m[1]] : null; }

  var $ = function (id) { return document.getElementById(id); };
  function el(tag, cls, css, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; if (text != null) e.textContent = text; return e; }

  function state() {
    return { date: $('cpw-date').value, payee: $('cpw-payee').value.trim(), amount: $('cpw-amount').value, remark: $('cpw-remark').value.trim() };
  }
  function remarkText(s) { if (!cfg.remarkOn) return ''; if (s.remark) return s.remark; var d = dmy(s.date); return d ? 'Date: ' + d.join('-') : ''; }

  // Build the ink layer of one leaf (unrotated, mm units)
  function leaf(s, showGuides) {
    var L = cfg.bank === 'saraswat' ? SARASWAT : CTS, n = cfg.nudge;
    var box = el('div', 'cpw-leaf' + (showGuides ? ' cpw-guides' : ''), 'width:' + LEAF.w + 'mm;height:' + LEAF.h + 'mm');
    function put(pos, nd, text, extra) { var e = el('div', 'cpw-ink', 'left:' + (pos[0] + nd[0]) + 'mm;top:' + (pos[1] + nd[1]) + 'mm;width:' + pos[2] + 'mm;font-size:' + pos[3] + 'pt;' + (extra || ''), text); box.appendChild(e); return e; }
    if (showGuides) { box.appendChild(el('div', 'cpw-micr', 'height:' + LEAF.micr + 'mm', 'MICR band · not printed'));
      box.appendChild(el('div', 'cpw-edge', '', 'Date end · this edge goes in first ▶')); }
    var d = dmy(s.date);
    if (cfg.dateBoxes && d) {
      var db = put(L.date, n.date, null, 'display:flex;height:4.62mm;');
      d.join('').split('').forEach(function (ch) { db.appendChild(el('span', 'cpw-cell', '', ch)); });
    }
    if (s.payee) put(L.payee, n.payee, s.payee.toUpperCase(), 'font-size:' + fitPt(s.payee, L.payee[2], L.payee[3], 7) + 'pt;white-space:nowrap');
    var w = words(s.amount);
    if (w) { var sp = splitWords(w, L.words1[2], L.words2[2], L.words1[3]);
      put(L.words1, n.words, sp[0], 'white-space:nowrap;overflow:hidden'); put(L.words2, n.words, sp[1], 'white-space:nowrap;overflow:hidden'); }
    var f = figures(s.amount); if (f) put(L.figures, n.figures, f, 'white-space:nowrap;font-size:' + fitPt(f, L.figures[2], L.figures[3], 7) + 'pt');
    var lines = [];
    if (cfg.crossing === 'accountPayee') lines.push('A/C PAYEE ONLY'); else if (cfg.crossing === 'notNegotiable') lines.push('NOT NEGOTIABLE');
    var rm = remarkText(s); if (rm) lines.push(rm);
    if (lines.length) { var lh = 9 * 0.3528 * 1.25, hgt = lines.length * lh, rw = 90;
      var top = Math.min(LEAF.h - LEAF.micr - 1.5 - hgt + n.remark[1], LEAF.h - LEAF.micr - hgt - 0.5);
      var r = el('div', 'cpw-ink cpw-remark', 'left:' + ((LEAF.w - rw) / 2 + n.remark[0]) + 'mm;top:' + top + 'mm;width:' + rw + 'mm;font-size:9pt');
      lines.forEach(function (t) { r.appendChild(el('div', '', '', t)); }); box.appendChild(r); }
    return box;
  }

  // Where the leaf sits on the page: portrait page, cheque fed right side down,
  // its 92 mm width across the tray against the chosen guide, the date end at the top edge.
  function placement() {
    var P = PAGES[cfg.page] || PAGES.a4, x = 0;
    if (cfg.guide === 'center') x = (P.w - LEAF.h) / 2; else if (cfg.guide === 'right') x = P.w - LEAF.h;
    return { P: P, x: x + Number(cfg.shiftX || 0), y: Number(cfg.shiftY || 0) };
  }
  // cheque (x, y) -> page (x0 + y, y0 + 202 - x): rotate -90° about the leaf's top-left
  function pageEl(s) {
    var pl = placement(), page = el('div', 'cpw-page', 'width:' + pl.P.w + 'mm;height:' + pl.P.h + 'mm');
    var lf = leaf(s, false); lf.style.position = 'absolute'; lf.style.left = '0'; lf.style.top = '0'; lf.style.transformOrigin = '0 0';
    lf.style.transform = 'translate(' + pl.x + 'mm,' + (pl.y + LEAF.w) + 'mm) rotate(-90deg)';
    page.appendChild(lf); return page;
  }

  var printHost, pageStyle;
  function render() {
    var s = state();
    var w = words(s.amount); $('cpw-words').textContent = w || (s.amount ? 'Enter a valid amount (up to 2 decimals).' : '');
    $('cpw-remark').placeholder = (function () { var d = dmy(s.date); return d ? 'Date: ' + d.join('-') : 'Date: DD-MM-YYYY'; })();
    var pv = $('cpw-preview'); pv.innerHTML = ''; pv.appendChild(leaf(s, true));
    var pp = $('cpw-pagepreview'); pp.innerHTML = ''; var pg = pageEl(s); pp.appendChild(pg);
    var pl = placement(); pp.style.height = (pl.P.h * 3.78 * 0.42) + 'px'; pg.style.transform = 'scale(0.42)'; pg.style.transformOrigin = '0 0';
    printHost.innerHTML = ''; printHost.appendChild(pageEl(s));
    pageStyle.textContent = '@media print{@page{size:' + pl.P.w + 'mm ' + pl.P.h + 'mm;margin:0}}';
    $('cpw-pagehint').textContent = 'Paper: ' + pl.P.label + ' portrait (' + pl.P.w + ' × ' + pl.P.h + ' mm). Cheque face up, right side down: the date end goes in first, against the ' + cfg.guide + ' guide.';
    $('cpw-print').disabled = !(s.payee && parseAmt(s.amount) && s.date);
  }

  function bindCfg(id, key, num) {
    var e = $(id); if (!e) return;
    if (e.type === 'checkbox') e.checked = !!cfg[key]; else e.value = cfg[key];
    e.addEventListener(e.tagName === 'SELECT' || e.type === 'checkbox' ? 'change' : 'input', function () {
      cfg[key] = e.type === 'checkbox' ? e.checked : num ? (Number(e.value) || 0) : e.value; save();
      if (key === 'remarkOn') $('cpw-remark-row').hidden = !cfg.remarkOn; render(); });
  }

  function init() {
    if (!$('cpw')) return;
    printHost = el('div', '', ''); printHost.id = 'cpw-print-host'; document.body.appendChild(printHost);
    pageStyle = el('style'); document.head.appendChild(pageStyle);
    var bs = $('cpw-bank'); BANKS.forEach(function (b) { var o = el('option', '', '', b[1]); o.value = b[0]; bs.appendChild(o); });
    var t = new Date(); $('cpw-date').value = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
    bindCfg('cpw-bank', 'bank'); bindCfg('cpw-page', 'page'); bindCfg('cpw-guide', 'guide');
    bindCfg('cpw-shiftx', 'shiftX', true); bindCfg('cpw-shifty', 'shiftY', true);
    bindCfg('cpw-dateboxes', 'dateBoxes'); bindCfg('cpw-remarkon', 'remarkOn');
    $('cpw-remark-row').hidden = !cfg.remarkOn;
    [].forEach.call(document.querySelectorAll('input[name=cpw-cross]'), function (r) {
      r.checked = r.value === cfg.crossing; r.addEventListener('change', function () { cfg.crossing = r.value; save(); render(); }); });
    [].forEach.call(document.querySelectorAll('[data-nudge]'), function (inp) {
      var k = inp.getAttribute('data-nudge').split(':'); inp.value = cfg.nudge[k[0]][+k[1]];
      inp.addEventListener('input', function () { cfg.nudge[k[0]][+k[1]] = Number(inp.value) || 0; save(); render(); }); });
    ['cpw-date', 'cpw-payee', 'cpw-amount', 'cpw-remark'].forEach(function (id) { $(id).addEventListener('input', render); });
    $('cpw-reset').addEventListener('click', function () { var b = cfg.bank, p = cfg.page; cfg = JSON.parse(JSON.stringify(DEF)); cfg.bank = b; cfg.page = p; save(); location.reload(); });
    $('cpw-print').addEventListener('click', function () { render(); window.print(); });
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.cpwSelfTest = { words: words, figures: figures, splitWords: splitWords, placement: placement };
})();
