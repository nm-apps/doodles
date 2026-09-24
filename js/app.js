/* Doodlebook UI: library gallery, editor, colour tools, print/export and the saved sketchbook. */
(function () {
  'use strict';
  const DB = window.DB;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const view = $('#view');

  // ---------- storage ----------
  const store = {
    get(k, def) {
      try {
        const v = localStorage.getItem('doodlebook.' + k);
        return v ? JSON.parse(v) : def;
      } catch (e) {
        return def;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem('doodlebook.' + k, JSON.stringify(v));
      } catch (e) {
        /* storage unavailable: keep working in memory */
      }
    },
  };

  const state = {
    gallery: { q: '', tags: new Set(), all: false, palette: 'auto' },
    paper: Object.assign({ size: 'A4', orient: 'portrait', margin: 10, frame: false }, store.get('paper', {})),
    saved: store.get('saved', []),
    doc: null,
    tab: 'shape',
    smart: true,
    codes: '',
  };

  // ---------- icons ----------
  const I = {
    dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="12" cy="12" r="1.1" fill="currentColor"/></svg>',
    wand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20 15 9"/><path d="m13.5 7.5 3 3"/><path d="M18 3v3M16.5 4.5h3M20 10v2M19 11h2M9 3v2M8 4h2"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 8V3.5h10V8"/><rect x="3.5" y="8" width="17" height="8.5" rx="2"/><path d="M7 13.5h10v7H7z"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3.5H6.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V9z"/><path d="M14 3.5V9h5.5"/><path d="M12 12v5m-2.2-2.2L12 17l2.2-2.2"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m20 16-4.5-4.5L7 20"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5M16 7l5 5-5 5"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c5 0 6 10 11 10H21m0 0-2.5-2.5M21 17l-2.5 2.5M3 17h3.5c1.8 0 3-1.3 4-3m3-4c1-1.7 2.2-3 4-3H21m0 0-2.5-2.5M21 7l-2.5 2.5"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.4-1.9-.5-1.3.3-2.6 1.7-2.6H17a3.5 3.5 0 0 0 3.5-3.5c0-5-3.8-9-8.5-9z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10.5" cy="7.5" r="1" fill="currentColor"/><circle cx="15" cy="8" r="1" fill="currentColor"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5M4 4v4.5h4.5"/></svg>',
  };

  // ---------- doc helpers ----------
  const randSeed = () => Math.floor(Math.random() * 1e6) + 1;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function newDoc(pid) {
    const p = DB.patternById(pid);
    return { pid, params: DB.paramsFor(p, {}), seed: randSeed(), zoom: 1, weight: 1, wobble: 2, colors: DB.clonePalette(DB.paletteByName(p.palette)) };
  }
  function encodeDoc(doc) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(doc)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodeDoc(s) {
    try {
      const doc = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
      const p = DB.patternById(doc.pid);
      if (!p) return null;
      const base = newDoc(doc.pid);
      doc.params = DB.paramsFor(p, doc.params || {});
      doc.colors = Object.assign(base.colors, doc.colors || {});
      return Object.assign(base, doc);
    } catch (e) {
      return null;
    }
  }
  const docURL = (doc) => '#/d/' + doc.pid + '?c=' + encodeDoc(doc);

  function buildDoc(doc, W, H) {
    return DB.build(DB.patternById(doc.pid), doc, W, H);
  }
  function squareSVG(doc, attrs = '') {
    return DB.toSVG(buildDoc(doc, 400, 400), doc.colors, attrs);
  }
  function pageSVGFor(doc, L, sizeAttrs) {
    return DB.pageSVG(buildDoc(doc, L.W, L.H), doc.colors, L, sizeAttrs);
  }

  // ---------- toast ----------
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------- exports ----------
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  }
  const fileBase = (doc) => `doodle-${doc.pid}-${state.paper.size.toLowerCase()}`;

  async function exportPDF(docs, name) {
    toast('Inking your PDF…');
    const L = DB.pageLayout(state.paper);
    const pages = docs.map((doc) => DB.pdfPageContent(buildDoc(doc, L.W, L.H), doc.colors, L));
    const blob = await DB.makePDF(pages, 'Doodlebook');
    download(blob, name + '.pdf');
    toast(`PDF ready · ${docs.length} page${docs.length > 1 ? 's' : ''} · ${L.label}`);
  }
  function exportSVG(doc) {
    const L = DB.pageLayout(state.paper);
    download(new Blob([pageSVGFor(doc, L)], { type: 'image/svg+xml' }), fileBase(doc) + '.svg');
    toast('SVG downloaded');
  }
  function exportPNG(doc) {
    const L = DB.pageLayout(state.paper);
    const dpi = Math.min(300, 5200 / (Math.max(L.w, L.h) / 25.4));
    const pw = Math.round((L.w / 25.4) * dpi), ph = Math.round((L.h / 25.4) * dpi);
    const svg = pageSVGFor(doc, L, `width="${pw}" height="${ph}"`);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    toast('Rendering PNG…');
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = pw;
      c.height = ph;
      c.getContext('2d').drawImage(img, 0, 0, pw, ph);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        download(b, fileBase(doc) + '.png');
        toast(`PNG ready · ${pw}×${ph}px (${Math.round(dpi)} dpi)`);
      }, 'image/png');
    };
    img.onerror = () => toast('Could not render the PNG in this browser');
    img.src = url;
  }
  function printDocs(docs) {
    const L = DB.pageLayout(state.paper);
    $('#print-root').innerHTML = docs.map((doc) => `<div class="print-page" style="width:${L.w}mm;height:${L.h}mm">${pageSVGFor(doc, L)}</div>`).join('');
    $('#page-style').textContent = `@page { size: ${L.w}mm ${L.h}mm; margin: 0; }`;
    setTimeout(() => window.print(), 60);
  }

  // ---------- saved ----------
  function persistSaved() {
    store.set('saved', state.saved);
    $('#saved-count').textContent = state.saved.length;
  }
  function saveDoc(doc) {
    state.saved.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), doc: clone(doc), at: Date.now() });
    persistSaved();
    toast('Saved to your sketchbook ✎');
  }

  // ---------- gallery ----------
  const thumbCache = new Map();
  let thumbQueue = [], thumbBusy = false, io = null;

  function galleryDoc(p, idx) {
    const g = state.gallery.palette;
    let colors;
    if (g === 'auto') colors = DB.clonePalette(DB.paletteByName(p.palette));
    else if (g === 'wands') {
      const r = DB.makeRng(idx * 97 + 11 + (state.gallery.wandSalt || 0));
      colors = DB.WANDS[idx % 3].make(r);
    } else colors = DB.clonePalette(DB.paletteByName(g));
    return { pid: p.id, params: DB.paramsFor(p, {}), seed: 1000 + idx * 7, zoom: 1, weight: 1, wobble: 2, colors };
  }
  function thumbKey(p) {
    return p.id + '|' + state.gallery.palette + '|' + (state.gallery.wandSalt || 0);
  }
  function pumpThumbs() {
    if (thumbBusy) return;
    thumbBusy = true;
    const step = () => {
      const t0 = performance.now();
      while (thumbQueue.length && performance.now() - t0 < 24) {
        const el = thumbQueue.shift();
        if (!el.isConnected || el.dataset.done) continue;
        const idx = +el.dataset.idx, p = DB.PATTERNS[idx], k = thumbKey(p);
        if (!thumbCache.has(k)) thumbCache.set(k, squareSVG(galleryDoc(p, idx)));
        el.innerHTML = thumbCache.get(k);
        el.dataset.done = '1';
      }
      if (thumbQueue.length) requestAnimationFrame(step);
      else thumbBusy = false;
    };
    requestAnimationFrame(step);
  }
  function observeThumbs() {
    if (io) io.disconnect();
    const els = $$('.thumb[data-idx]');
    if (!('IntersectionObserver' in window)) {
      thumbQueue.push(...els);
      return pumpThumbs();
    }
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            thumbQueue.push(e.target);
            io.unobserve(e.target);
          }
        pumpThumbs();
      },
      { rootMargin: '300px' }
    );
    els.forEach((el) => io.observe(el));
  }

  function filtered() {
    const q = state.gallery.q.trim().toLowerCase(), tags = [...state.gallery.tags];
    return DB.PATTERNS.map((p, idx) => ({ p, idx })).filter(({ p }) => {
      if (q && !(p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)) || p.id.includes(q))) return false;
      if (!tags.length) return true;
      return state.gallery.all ? tags.every((t) => p.tags.includes(t)) : tags.some((t) => p.tags.includes(t));
    });
  }

  function heroHTML() {
    const picks = DB.makeRng(Date.now() % 1e6).shuffle(['mandala', 'daisies', 'riad', 'tidefans', 'truchet', 'paisley', 'ripples', 'scales', 'flow']).slice(0, 3);
    const pol = picks
      .map((id, i) => {
        const p = DB.patternById(id);
        const doc = newDoc(id);
        if (id === 'mandala') doc.params.size = 380;
        return `<a class="polaroid" href="#/d/${id}">${i === 2 ? '<span class="tape"></span>' : ''}${squareSVG(doc)}<span>${esc(p.name)}</span></a>`;
      })
      .join('');
    return `
    <section class="hero">
      <div>
        <p class="eyebrow">a generative sketchbook ✎</p>
        <h1>${DB.PATTERNS.length} doodles,<br><em>endlessly<svg viewBox="0 0 200 20" preserveAspectRatio="none"><path d="M3 13c30-9 60-9 95-4s70 4 99-6" fill="none" stroke="var(--coral)" stroke-width="5" stroke-linecap="round"/></svg></em> yours.</h1>
        <p class="lede">Pick a pattern, nudge its knobs, paint it with a magic wand or your own colours, then print it on any paper — from A5 to Tabloid — or save it as a crisp vector PDF.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#library">Browse the library</a>
          <button class="btn yellow" data-action="surprise-open">${I.wand} Surprise me</button>
        </div>
      </div>
      <div class="hero-art">${pol}</div>
    </section>`;
  }

  function renderGallery() {
    const counts = {};
    DB.PATTERNS.forEach((p) => p.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    const g = state.gallery;
    const palBtns = [
      `<button class="mini-pal text ${g.palette === 'auto' ? 'on' : ''}" data-action="gpal" data-val="auto">Each its own</button>`,
      `<button class="mini-pal text ${g.palette === 'wands' ? 'on' : ''}" data-action="gpal" data-val="wands" title="Wave the wands">✦ Wands</button>`,
      ...DB.PALETTES.map((p) => `<button class="mini-pal ${g.palette === p.name ? 'on' : ''}" data-action="gpal" data-val="${esc(p.name)}" title="${esc(p.name)}"><i style="background:${p.bg}"></i>${p.fills.slice(0, 4).map((c) => `<i style="background:${c}"></i>`).join('')}<i style="background:${p.ink}"></i></button>`),
    ].join('');
    view.innerHTML = `
      ${heroHTML()}
      <section class="library" id="library">
        <div class="lib-head"><h2>The library <small id="lib-count"></small></h2></div>
        <div class="filters">
          <div class="filter-row">
            <label class="search">${I.search}<input type="search" id="q" placeholder="Search by name or style — try “waves”, “floral”, “maze”…" value="${esc(g.q)}"></label>
            <div class="seg" style="flex:0 0 auto"><button data-action="match" data-val="any" class="${g.all ? '' : 'on'}">Match any</button><button data-action="match" data-val="all" class="${g.all ? 'on' : ''}">Match all</button></div>
          </div>
          <div class="chips">${DB.TAGS.map((t) => `<button class="chip ${g.tags.has(t) ? 'on' : ''}" data-action="tag" data-val="${t}">${t}<span class="n">${counts[t]}</span></button>`).join('')}
            <button class="chip clear" data-action="clear-tags" ${g.tags.size || g.q ? '' : 'hidden'}>clear ✕</button></div>
          <div class="pal-pick"><span class="label">preview in</span>${palBtns}</div>
        </div>
        <div class="grid" id="grid"></div>
      </section>`;
    renderGrid();
  }

  function renderGrid() {
    const list = filtered();
    $('#lib-count').textContent = `${list.length} of ${DB.PATTERNS.length}`;
    const clr = $('[data-action="clear-tags"]');
    if (clr) clr.hidden = !(state.gallery.tags.size || state.gallery.q);
    $('#grid').innerHTML = list.length
      ? list
          .map(({ p, idx }) => {
            const tilt = ((DB.hash(idx) % 100) / 100 - 0.5) * 2.4;
            return `<a class="card" href="#/d/${p.id}" style="--tilt:${tilt.toFixed(2)}deg">
              <span class="tape"></span>
              <div class="thumb" data-idx="${idx}"><div class="ph">sketching…</div></div>
              <div class="card-actions"><button data-action="card-pdf" data-idx="${idx}" title="Download PDF">${I.pdf}</button><button data-action="card-print" data-idx="${idx}" title="Print">${I.print}</button></div>
              <div class="meta"><span class="no">No. ${String(idx + 1).padStart(2, '0')}</span><h3>${esc(p.name)}</h3><div class="tags">${p.tags.join(' · ')}</div></div>
            </a>`;
          })
          .join('')
      : `<div class="empty" style="grid-column:1/-1">No doodles match that combination.<p>Try “match any”, or clear a few keywords.</p></div>`;
    observeThumbs();
  }

  // ---------- editor ----------
  let renderPending = false, hashT;
  function scheduleRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      renderSheet();
    });
    clearTimeout(hashT);
    hashT = setTimeout(() => {
      if (state.doc && location.hash.startsWith('#/d/')) history.replaceState(null, '', docURL(state.doc));
    }, 400);
  }

  function fitSheet() {
    const sheet = $('#sheet'), desk = $('.desk');
    if (!sheet || !desk) return;
    const L = DB.pageLayout(state.paper);
    const cs = getComputedStyle(desk);
    const availW = desk.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const maxH = Math.max(320, window.innerHeight * 0.72);
    const w = Math.min(availW, maxH * (L.w / L.h));
    sheet.style.width = w + 'px';
    sheet.style.height = (w * L.h) / L.w + 'px';
  }

  function renderSheet() {
    const sheet = $('#sheet');
    if (!sheet || !state.doc) return;
    const L = DB.pageLayout(state.paper);
    fitSheet();
    sheet.innerHTML = pageSVGFor(state.doc, L, 'width="100%" height="100%"') + `<span class="sheet-label">${esc(L.label)} · ${state.paper.orient}</span>`;
  }

  function ctlHTML(spec, val, scope) {
    const data = `data-scope="${scope}" data-key="${spec.key}"`;
    if (spec.type === 'range') {
      const pct = ((val - spec.min) / (spec.max - spec.min)) * 100;
      return `<div class="ctl"><div class="ctl-top"><span>${esc(spec.label)}</span><output>${fmtNum(val, spec.step)}</output></div><input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${val}" ${data} style="--fill:${pct}%"></div>`;
    }
    if (spec.type === 'bool') return `<label class="toggle"><span>${esc(spec.label)}</span><input type="checkbox" ${data} ${val ? 'checked' : ''}><span class="sw"></span></label>`;
    return `<div class="ctl"><div class="ctl-top"><span>${esc(spec.label)}</span></div><div class="seg" ${data}>${spec.options.map((o) => `<button data-val="${esc(o)}" class="${o === val ? 'on' : ''}">${esc(o)}</button>`).join('')}</div></div>`;
  }
  function fmtNum(v, step) {
    const dec = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
    return Number(v).toFixed(dec);
  }
  const GLOBAL_SPECS = [
    { key: 'zoom', label: 'Scale', type: 'range', min: 0.4, max: 3, step: 0.05 },
    { key: 'weight', label: 'Line weight', type: 'range', min: 0, max: 3, step: 0.05 },
    { key: 'wobble', label: 'Hand-drawn wobble', type: 'range', min: 0, max: 10, step: 0.5 },
  ];

  function shapeTab() {
    const doc = state.doc, p = DB.patternById(doc.pid);
    return `
      <div class="section"><h3 class="section-title">Pattern knobs <button class="btn ghost small" data-action="reset">${I.reset} reset</button></h3>
        ${p.params.map((s) => ctlHTML(s, doc.params[s.key], 'p')).join('')}</div>
      <div class="section"><h3 class="section-title">Hand &amp; scale</h3>
        ${GLOBAL_SPECS.map((s) => ctlHTML(s, doc[s.key], 'g')).join('')}
        <div class="ctl"><div class="ctl-top"><span>Random seed</span></div>
        <div class="seed-row"><input type="number" id="seed" value="${doc.seed}" min="1"><button class="btn icon" data-action="reroll" title="New seed (R)">${I.dice}</button></div>
        <p class="hint">Same seed + same knobs = the same doodle, every time. Press <b>R</b> to reroll.</p></div>
      </div>`;
  }

  function colorTab() {
    const doc = state.doc, c = doc.colors, p = DB.patternById(doc.pid);
    const wandDots = {
      mono: ['#e6eef8', '#9fb8d8', '#5b7fae', '#2d4a72'],
      contrast: ['#ff2d55', '#111111', '#00c2a8', '#ffd400'],
      pastel: ['#ffd6e0', '#c9f0e4', '#fff1b8', '#d7d2ff'],
      coloring: ['#ffffff', '#111111', '#ffffff', '#111111'],
    };
    const slot = (label, key, val) => `<div class="slot"><label style="background:${val}"><input type="color" value="${val}" data-color="${key}"></label><div class="nm">${label}<span>${val}</span></div></div>`;
    const fills = [];
    for (let i = 0; i < p.fills; i++) fills.push(slot('Fill ' + (i + 1), 'f' + i, c.fills[i % c.fills.length]));
    return `
      <div class="section"><h3 class="section-title">Magic wands <span class="sub">wave again for another</span></h3>
        <div class="wands">${DB.WANDS.map((w) => `<button class="wand" data-action="wand" data-val="${w.id}"><b>${I.wand}${esc(w.name)}</b><small>${esc(w.hint)}</small><div class="dots">${wandDots[w.id].map((x) => `<i style="background:${x}"></i>`).join('')}</div></button>`).join('')}</div>
      </div>
      <div class="section"><h3 class="section-title">Your colours <button class="btn ghost small" data-action="shuffle-slots">${I.shuffle} shuffle</button></h3>
        <div class="slots">${slot('Paper', 'bg', c.bg)}${slot('Ink', 'ink', c.ink)}${fills.join('')}</div>
        <div class="ctl" style="margin-top:14px"><div class="ctl-top"><span>How fills are used</span></div>
          <div class="seg" data-action="fillmode"><button data-val="role" class="${c.mode !== 'scatter' ? 'on' : ''}">By shape role</button><button data-val="scatter" class="${c.mode === 'scatter' ? 'on' : ''}">Scatter randomly</button></div>
          ${c.mode === 'scatter' ? `<button class="btn ghost small" style="margin-top:8px" data-action="rescatter">${I.dice} scatter again</button>` : ''}
        </div>
        <label class="toggle"><span>Colouring page (line art only)</span><input type="checkbox" data-action="coloring" ${c.coloring ? 'checked' : ''}><span class="sw"></span></label>
      </div>
      <div class="section"><h3 class="section-title">Paste colour codes</h3>
        <textarea class="codes" id="codes" placeholder="#264653, #2a9d8f, #e9c46a, #f4a261, #e76f51" spellcheck="false">${esc(state.codes)}</textarea>
        <div class="row spread" style="margin-top:8px">
          <label class="check"><input type="checkbox" id="smart" ${state.smart ? 'checked' : ''}> lightest → paper, darkest → ink</label>
          <button class="btn small" data-action="apply-codes">${I.shuffle} Apply &amp; shuffle</button>
        </div>
        <p class="hint">Any text with hex codes works — paste straight from Coolors, Figma or a CSS file. Click again for a new random arrangement.</p>
      </div>
      <div class="section"><h3 class="section-title">Palettes</h3>
        <div class="presets">${DB.PALETTES.map((pl) => `<button class="preset" data-action="preset" data-val="${esc(pl.name)}"><div class="bar"><i style="background:${pl.bg}"></i>${pl.fills.map((x) => `<i style="background:${x}"></i>`).join('')}<i style="background:${pl.ink}"></i></div>${esc(pl.name)}</button>`).join('')}</div>
      </div>`;
  }

  function printTab() {
    const pp = state.paper;
    const papers = DB.PAPERS.map((p) => {
      let w = p.w, h = p.h;
      if (pp.orient === 'landscape') [w, h] = [h, w];
      const k = 34 / Math.max(DB.PAPERS[6].w, DB.PAPERS[6].h);
      return `<button class="paper-btn ${pp.size === p.id ? 'on' : ''}" data-action="paper" data-val="${p.id}"><i style="width:${Math.round(w * k)}px;height:${Math.round(h * k)}px"></i>${esc(p.label)}</button>`;
    }).join('');
    const L = DB.pageLayout(pp);
    return `
      <div class="section"><h3 class="section-title">Paper <span class="sub">${fmtNum(L.w, 0.1)} × ${fmtNum(L.h, 0.1)} mm</span></h3>
        <div class="papers">${papers}</div></div>
      <div class="section">
        <div class="ctl"><div class="ctl-top"><span>Orientation</span></div><div class="seg" data-action="orient"><button data-val="portrait" class="${pp.orient === 'portrait' ? 'on' : ''}">Portrait</button><button data-val="landscape" class="${pp.orient === 'landscape' ? 'on' : ''}">Landscape</button></div></div>
        ${ctlHTML({ key: 'margin', label: 'Margin (mm)', type: 'range', min: 0, max: 30, step: 1 }, pp.margin, 'paper')}
        ${ctlHTML({ key: 'frame', label: 'Thin frame around the doodle', type: 'bool' }, pp.frame, 'paper')}
      </div>
      <div class="section"><h3 class="section-title">Print &amp; export</h3>
        <div class="export-grid">
          <button class="btn primary" data-action="print">${I.print} Print</button>
          <button class="btn yellow" data-action="pdf">${I.pdf} PDF</button>
          <button class="btn" data-action="svg">${I.code} SVG</button>
          <button class="btn" data-action="png">${I.image} PNG</button>
        </div>
        <p class="note" style="margin-top:14px">Tip: in the print dialog pick <b>100% / actual size</b> and <b>no margins</b> — the page size is already set for you.</p>
        <p class="hint">PDFs are true vector files: they stay razor sharp at any size and print beautifully.</p>
      </div>`;
  }

  function renderPanel() {
    const body = $('#tab-body');
    if (!body) return;
    $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.val === state.tab));
    const top = body.scrollTop;
    body.innerHTML = state.tab === 'shape' ? shapeTab() : state.tab === 'color' ? colorTab() : printTab();
    body.scrollTop = top;
  }

  function variationDocs() {
    const doc = state.doc, p = DB.patternById(doc.pid), r = DB.makeRng(randSeed());
    return Array.from({ length: 6 }, () => {
      const v = clone(doc);
      v.seed = randSeed();
      for (const s of p.params) {
        if (!r.chance(0.55)) continue;
        if (s.type === 'range') v.params[s.key] = +(Math.round((s.min + r() * (s.max - s.min)) / s.step) * s.step).toFixed(4);
        else if (s.type === 'bool') v.params[s.key] = r.chance(0.5);
        else v.params[s.key] = r.pick(s.options);
      }
      return v;
    });
  }
  let variations = [];
  function renderVariations() {
    const row = $('#var-row');
    if (!row) return;
    variations = variationDocs();
    row.innerHTML = variations.map((v, i) => `<button class="var" data-action="adopt" data-val="${i}" title="Use this variation"><div class="ph"></div></button>`).join('');
    let i = 0;
    const step = () => {
      if (!row.isConnected || i >= variations.length) return;
      row.children[i].innerHTML = squareSVG(variations[i]);
      i++;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderEditor() {
    const doc = state.doc, p = DB.patternById(doc.pid), idx = DB.PATTERNS.indexOf(p);
    view.innerHTML = `
      <div class="editor">
        <section class="stage">
          <div class="stage-bar">
            <div class="stage-title">
              <a class="btn icon ghost" href="#/" title="Back to the library">${I.back}</a>
              <div><span class="no">No. ${String(idx + 1).padStart(2, '0')}</span><h1>${esc(p.name)}</h1><div class="tags">${p.tags.join(' · ')}</div></div>
            </div>
            <div class="stage-actions">
              <button class="btn" data-action="reroll" title="New random seed">${I.dice}<span class="lbl">Reroll</span></button>
              <button class="btn yellow" data-action="surprise" title="Random knobs and colours">${I.wand}<span class="lbl">Surprise</span></button>
              <button class="btn" data-action="save">${I.bookmark}<span class="lbl">Save</span></button>
              <button class="btn" data-action="share" title="Copy a link to this exact doodle">${I.link}<span class="lbl">Link</span></button>
            </div>
          </div>
          <div class="desk"><div class="sheet" id="sheet"></div></div>
          <div class="variations">
            <div class="variations-head"><h4>Variations to try →</h4><button class="btn ghost small" data-action="more-vars">${I.shuffle} more</button></div>
            <div class="var-row" id="var-row"></div>
          </div>
        </section>
        <aside class="panel">
          <div class="tabs">
            <button class="tab" data-action="tab" data-val="shape">${I.sliders} Shape</button>
            <button class="tab" data-action="tab" data-val="color">${I.palette} Colour</button>
            <button class="tab" data-action="tab" data-val="print">${I.print} Print</button>
          </div>
          <div class="tab-body" id="tab-body"></div>
        </aside>
      </div>`;
    renderPanel();
    renderSheet();
    renderVariations();
  }

  // ---------- saved view ----------
  function renderSaved() {
    const pp = state.paper;
    view.innerHTML = `
      <div class="saved-wrap">
        <div class="saved-head">
          <div><h1>My sketchbook</h1><p class="hand" style="font-size:22px">${state.saved.length ? `${state.saved.length} saved doodle${state.saved.length > 1 ? 's' : ''} — kept in this browser` : 'nothing pinned yet'}</p></div>
          ${state.saved.length ? `<div class="row">
            <select id="saved-paper" class="btn ghost small">${DB.PAPERS.map((p) => `<option value="${p.id}" ${p.id === pp.size ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select>
            <select id="saved-orient" class="btn ghost small"><option value="portrait" ${pp.orient === 'portrait' ? 'selected' : ''}>Portrait</option><option value="landscape" ${pp.orient === 'landscape' ? 'selected' : ''}>Landscape</option></select>
            <button class="btn" data-action="print-all">${I.print} Print all</button>
            <button class="btn primary" data-action="pdf-all">${I.pdf} All as one PDF</button></div>` : ''}
        </div>
        <div class="grid">${
          state.saved.length
            ? state.saved
                .map((s, i) => {
                  const p = DB.patternById(s.doc.pid);
                  if (!p) return '';
                  const tilt = ((DB.hash(i + 5) % 100) / 100 - 0.5) * 2.4;
                  return `<a class="card" href="${docURL(s.doc)}" style="--tilt:${tilt.toFixed(2)}deg"><span class="tape"></span>
                    <div class="thumb">${squareSVG(s.doc)}</div>
                    <div class="card-actions"><button data-action="saved-pdf" data-val="${s.id}" title="Download PDF">${I.pdf}</button><button data-action="saved-del" data-val="${s.id}" title="Remove">${I.trash}</button></div>
                    <div class="meta"><span class="no">${new Date(s.at).toLocaleDateString()}</span><h3>${esc(p.name)}</h3><div class="tags">seed ${s.doc.seed}</div></div></a>`;
                })
                .join('')
            : `<div class="empty" style="grid-column:1/-1">Your sketchbook is empty.<p>Open any doodle and press <b>Save</b> to pin it here — then print them all at once.</p><a class="btn primary" href="#/">Go to the library</a></div>`
        }</div>
      </div>`;
  }

  // ---------- routing ----------
  function route() {
    const h = location.hash || '#/';
    $$('.nav a').forEach((a) => a.classList.toggle('active', (h.startsWith('#/saved') && a.dataset.nav === 'saved') || ((h === '#/' || h === '#' || h === '#library' || h === '') && a.dataset.nav === 'gallery')));
    if (h === '#library') return;
    const m = h.match(/^#\/d\/([\w-]+)(?:\?c=([\w-]+))?/);
    if (m && DB.patternById(m[1])) {
      const fromHash = m[2] ? decodeDoc(m[2]) : null;
      if (fromHash && fromHash.pid === m[1]) state.doc = fromHash;
      else if (!state.doc || state.doc.pid !== m[1]) state.doc = newDoc(m[1]);
      renderEditor();
      window.scrollTo(0, 0);
      return;
    }
    if (h.startsWith('#/saved')) {
      renderSaved();
      window.scrollTo(0, 0);
      return;
    }
    renderGallery();
  }

  // ---------- events ----------
  function applyWand(id) {
    const w = DB.WANDS.find((x) => x.id === id);
    state.doc.colors = w.make(DB.makeRng(randSeed()));
    const btn = $(`.wand[data-val="${id}"]`);
    if (btn) {
      btn.classList.remove('sparkle');
      void btn.offsetWidth;
      btn.classList.add('sparkle');
    }
  }
  function surprise(doc) {
    const p = DB.patternById(doc.pid), r = DB.makeRng(randSeed());
    for (const s of p.params) {
      if (s.type === 'range') doc.params[s.key] = +(Math.round((s.min + r() * (s.max - s.min)) / s.step) * s.step).toFixed(4);
      else if (s.type === 'bool') doc.params[s.key] = r.chance(0.5);
      else doc.params[s.key] = r.pick(s.options);
    }
    doc.seed = randSeed();
    doc.colors = r.chance(0.4) ? DB.clonePalette(r.pick(DB.PALETTES)) : DB.WANDS[r.int(0, 2)].make(r);
    return doc;
  }

  view.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) {
      const segBtn = e.target.closest('.seg[data-scope] button');
      if (segBtn) {
        const seg = segBtn.parentElement;
        setValue(seg.dataset.scope, seg.dataset.key, segBtn.dataset.val);
        $$('button', seg).forEach((b) => b.classList.toggle('on', b === segBtn));
      }
      return;
    }
    const a = el.dataset.action, val = el.dataset.val;
    const doc = state.doc;
    switch (a) {
      case 'tag':
        state.gallery.tags.has(val) ? state.gallery.tags.delete(val) : state.gallery.tags.add(val);
        el.classList.toggle('on');
        renderGrid();
        break;
      case 'clear-tags':
        state.gallery.tags.clear();
        state.gallery.q = '';
        $('#q').value = '';
        $$('.chip.on').forEach((c) => c.classList.remove('on'));
        renderGrid();
        break;
      case 'match':
        state.gallery.all = val === 'all';
        $$('[data-action="match"]').forEach((b) => b.classList.toggle('on', b === el));
        renderGrid();
        break;
      case 'gpal':
        if (val === 'wands' && state.gallery.palette === 'wands') state.gallery.wandSalt = (state.gallery.wandSalt || 0) + 1;
        state.gallery.palette = val;
        $$('[data-action="gpal"]').forEach((b) => b.classList.toggle('on', b === el));
        renderGrid();
        break;
      case 'card-pdf':
      case 'card-print': {
        e.preventDefault();
        const idx = +el.dataset.idx, gd = galleryDoc(DB.PATTERNS[idx], idx);
        a === 'card-pdf' ? exportPDF([gd], fileBase(gd)) : printDocs([gd]);
        break;
      }
      case 'surprise-open': {
        const p = DB.PATTERNS[Math.floor(Math.random() * DB.PATTERNS.length)];
        state.doc = surprise(newDoc(p.id));
        location.hash = docURL(state.doc);
        break;
      }
      case 'tab':
        state.tab = val;
        renderPanel();
        break;
      case 'reroll': {
        doc.seed = randSeed();
        const si = $('#seed');
        if (si) si.value = doc.seed;
        scheduleRender();
        break;
      }
      case 'surprise':
        surprise(doc);
        renderPanel();
        scheduleRender();
        break;
      case 'reset':
        doc.params = DB.paramsFor(DB.patternById(doc.pid), {});
        doc.zoom = 1;
        doc.weight = 1;
        doc.wobble = 2;
        renderPanel();
        scheduleRender();
        break;
      case 'save':
        saveDoc(doc);
        break;
      case 'share': {
        const url = location.href.split('#')[0] + docURL(doc);
        history.replaceState(null, '', docURL(doc));
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link copied — it recreates this exact doodle'), () => toast('Copy the address bar to share this doodle'));
        break;
      }
      case 'more-vars':
        renderVariations();
        break;
      case 'adopt':
        state.doc = clone(variations[+val]);
        renderPanel();
        scheduleRender();
        toast('Variation adopted');
        break;
      case 'wand':
        applyWand(val);
        setTimeout(renderPanel, 280);
        scheduleRender();
        break;
      case 'preset':
        doc.colors = DB.clonePalette(DB.paletteByName(val));
        renderPanel();
        scheduleRender();
        break;
      case 'shuffle-slots': {
        const p = DB.patternById(doc.pid), c = doc.colors;
        const used = [c.bg, c.ink, ...Array.from({ length: p.fills }, (_, i) => c.fills[i % c.fills.length])];
        const uniq = [...new Set(used)];
        doc.colors = Object.assign(DB.assignColors(uniq, state.smart, DB.makeRng(randSeed())), { coloring: false });
        renderPanel();
        scheduleRender();
        break;
      }
      case 'fillmode': {
        const b = e.target.closest('button');
        if (!b) break;
        doc.colors.mode = b.dataset.val;
        renderPanel();
        scheduleRender();
        break;
      }
      case 'rescatter':
        doc.colors.salt = randSeed();
        scheduleRender();
        break;
      case 'apply-codes': {
        state.codes = $('#codes').value;
        state.smart = $('#smart').checked;
        const list = DB.parseColors(state.codes);
        if (!list.length) {
          toast('No hex codes found — try #ff6b6b, #4ecdc4 …');
          break;
        }
        doc.colors = DB.assignColors(list, state.smart, DB.makeRng(randSeed()));
        renderPanel();
        scheduleRender();
        toast(`Shuffled ${list.length} colour${list.length > 1 ? 's' : ''} onto the doodle`);
        break;
      }
      case 'paper':
        state.paper.size = val;
        store.set('paper', state.paper);
        renderPanel();
        scheduleRender();
        break;
      case 'orient': {
        const b = e.target.closest('button');
        if (!b) break;
        state.paper.orient = b.dataset.val;
        store.set('paper', state.paper);
        renderPanel();
        scheduleRender();
        break;
      }
      case 'print':
        printDocs([doc]);
        break;
      case 'pdf':
        exportPDF([doc], fileBase(doc));
        break;
      case 'svg':
        exportSVG(doc);
        break;
      case 'png':
        exportPNG(doc);
        break;
      case 'saved-del':
        e.preventDefault();
        state.saved = state.saved.filter((s) => s.id !== val);
        persistSaved();
        renderSaved();
        toast('Removed from your sketchbook');
        break;
      case 'saved-pdf': {
        e.preventDefault();
        const s = state.saved.find((x) => x.id === val);
        if (s) exportPDF([s.doc], fileBase(s.doc));
        break;
      }
      case 'pdf-all':
        exportPDF(state.saved.map((s) => s.doc), 'doodlebook-sketchbook-' + state.paper.size.toLowerCase());
        break;
      case 'print-all':
        printDocs(state.saved.map((s) => s.doc));
        break;
    }
  });

  function setValue(scope, key, v) {
    if (scope === 'p') state.doc.params[key] = v;
    else if (scope === 'g') state.doc[key] = v;
    else if (scope === 'paper') {
      state.paper[key] = v;
      store.set('paper', state.paper);
    }
    scheduleRender();
  }

  view.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'q') {
      state.gallery.q = t.value;
      renderGrid();
      return;
    }
    if (t.id === 'seed') {
      const v = parseInt(t.value, 10);
      if (v > 0) {
        state.doc.seed = v;
        scheduleRender();
      }
      return;
    }
    if (t.dataset.color) {
      const k = t.dataset.color, c = state.doc.colors;
      if (k === 'bg' || k === 'ink') c[k] = t.value;
      else {
        const i = +k.slice(1);
        const p = DB.patternById(state.doc.pid);
        while (c.fills.length < p.fills) c.fills.push(c.fills[c.fills.length % Math.max(1, c.fills.length)] || '#cccccc');
        c.fills[i] = t.value;
      }
      c.coloring = false;
      const lab = t.parentElement;
      lab.style.background = t.value;
      lab.nextElementSibling.querySelector('span').textContent = t.value;
      const tog = $('[data-action="coloring"]');
      if (tog) tog.checked = false;
      scheduleRender();
      return;
    }
    if (t.dataset.action === 'coloring') {
      state.doc.colors.coloring = t.checked;
      scheduleRender();
      return;
    }
    if (t.dataset.scope) {
      let v;
      if (t.type === 'range') {
        v = parseFloat(t.value);
        const pct = ((v - t.min) / (t.max - t.min)) * 100;
        t.style.setProperty('--fill', pct + '%');
        const out = t.parentElement.querySelector('output');
        if (out) out.textContent = fmtNum(v, parseFloat(t.step));
      } else if (t.type === 'checkbox') v = t.checked;
      setValue(t.dataset.scope, t.dataset.key, v);
      if (t.dataset.scope === 'paper' && state.tab === 'print' && t.type === 'checkbox') renderPanel();
    }
  });
  view.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'saved-paper' || t.id === 'saved-orient') {
      state.paper[t.id === 'saved-paper' ? 'size' : 'orient'] = t.value;
      store.set('paper', state.paper);
      toast(`Paper set to ${DB.pageLayout(state.paper).label}, ${state.paper.orient}`);
    }
    if (t.id === 'smart') state.smart = t.checked;
    if (t.id === 'codes') state.codes = t.value;
  });

  document.addEventListener('keydown', (e) => {
    if (!state.doc || !$('#sheet') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/input|textarea|select/i.test(document.activeElement.tagName)) return;
    if (e.key === 'r' || e.key === 'R') {
      state.doc.seed = randSeed();
      const si = $('#seed');
      if (si) si.value = state.doc.seed;
      scheduleRender();
    }
  });

  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(fitSheet, 80);
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('afterprint', () => {
    $('#print-root').innerHTML = '';
  });

  persistSaved();
  route();
})();
