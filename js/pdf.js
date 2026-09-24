/* Paper sizes, page layout, and a tiny dependency-free vector PDF writer. */
(function () {
  'use strict';
  const DB = window.DB;
  const fmt = DB.fmt;
  const MM = 72 / 25.4;

  DB.PAPERS = [
    { id: 'A5', label: 'A5', w: 148, h: 210 },
    { id: 'A4', label: 'A4', w: 210, h: 297 },
    { id: 'A3', label: 'A3', w: 297, h: 420 },
    { id: 'B5', label: 'B5', w: 176, h: 250 },
    { id: 'Letter', label: 'US Letter', w: 215.9, h: 279.4 },
    { id: 'Legal', label: 'US Legal', w: 215.9, h: 355.6 },
    { id: 'Tabloid', label: 'Tabloid', w: 279.4, h: 431.8 },
    { id: 'Square', label: 'Square 20cm', w: 200, h: 200 },
  ];

  /* page geometry in mm plus the doodle's drawing units (short side = 400) */
  DB.pageLayout = function (paper) {
    const p = DB.PAPERS.find((x) => x.id === paper.size) || DB.PAPERS[1];
    let w = p.w, h = p.h;
    if (paper.orient === 'landscape') [w, h] = [h, w];
    const m = Math.min(paper.margin || 0, Math.min(w, h) / 3);
    const aw = w - 2 * m, ah = h - 2 * m;
    const unit = 400 / Math.min(aw, ah);
    return { w, h, m, aw, ah, W: aw * unit, H: ah * unit, frame: !!paper.frame && m > 0, label: p.label };
  };

  DB.pageSVG = function (built, colors, L, sizeAttrs) {
    const size = sizeAttrs || `width="${fmt(L.w)}mm" height="${fmt(L.h)}mm"`;
    const frame = L.frame
      ? `<rect x="${fmt(L.m)}" y="${fmt(L.m)}" width="${fmt(L.aw)}" height="${fmt(L.ah)}" fill="none" stroke="${colors.ink}" stroke-width="0.5"/>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="0 0 ${fmt(L.w)} ${fmt(L.h)}"><rect width="${fmt(L.w)}" height="${fmt(L.h)}" fill="#ffffff"/><svg x="${fmt(L.m)}" y="${fmt(L.m)}" width="${fmt(L.aw)}" height="${fmt(L.ah)}" viewBox="0 0 ${fmt(built.W)} ${fmt(built.H)}" preserveAspectRatio="none">${DB.svgBody(built, colors)}</svg>${frame}</svg>`;
  };

  // ---------- PDF ----------
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255].map((v) => fmt(v)).join(' ');
  }

  DB.pdfPageContent = function (built, colors, L) {
    const res = DB.resolver(colors);
    const pw = L.w * MM, ph = L.h * MM, x = L.m * MM, y = L.m * MM, w = L.aw * MM, h = L.ah * MM;
    const s = w / built.W;
    const o = [];
    o.push('q', `${rgb(colors.bg)} rg`, `${fmt(x)} ${fmt(ph - y - h)} ${fmt(w)} ${fmt(h)} re f`);
    o.push(`${fmt(x)} ${fmt(ph - y - h)} ${fmt(w)} ${fmt(h)} re W n`);
    o.push(`${s.toFixed(5)} 0 0 ${(-s).toFixed(5)} ${fmt(x)} ${fmt(ph - y)} cm`, '1 J 1 j');
    built.items.forEach((it, i) => {
      const f = it.fill ? res(it.fill, i, false) : null;
      const st = it.stroke ? res(it.stroke, i, true) : null;
      if (!f && !st) return;
      let line = '';
      if (f) line += `${rgb(f)} rg `;
      if (st) line += `${rgb(st)} RG ${fmt(it.w)} w ${it.dash ? `[${it.dash.map(fmt).join(' ')}] 0 d` : '[] 0 d'} `;
      for (const c of it.d) {
        if (c[0] === 'M') line += `${fmt(c[1])} ${fmt(c[2])} m `;
        else if (c[0] === 'L') line += `${fmt(c[1])} ${fmt(c[2])} l `;
        else if (c[0] === 'C') line += `${fmt(c[1])} ${fmt(c[2])} ${fmt(c[3])} ${fmt(c[4])} ${fmt(c[5])} ${fmt(c[6])} c `;
        else line += 'h ';
      }
      const eo = it.rule && f ? '*' : '';
      line += f && st ? 'B' + eo : f ? 'f' + eo : 'S';
      o.push(line);
    });
    o.push('Q');
    if (L.frame) o.push(`q ${rgb(colors.ink)} RG ${fmt(0.5 * MM)} w ${fmt(x)} ${fmt(ph - y - h)} ${fmt(w)} ${fmt(h)} re S Q`);
    return { w: pw, h: ph, content: o.join('\n') };
  };

  async function deflate(bytes) {
    if (!window.CompressionStream) return null;
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (e) {
      return null;
    }
  }

  DB.makePDF = async function (pages, title = 'Doodlebook') {
    const enc = new TextEncoder();
    const chunks = [], offsets = [];
    let pos = 0;
    const push = (d) => {
      const b = typeof d === 'string' ? enc.encode(d) : d;
      chunks.push(b);
      pos += b.length;
    };
    const n = 4 + pages.length * 2; // xref entries: object 0 plus objects 1..(3 + 2 * pages)
    push('%PDF-1.4\n%âãÏÓ\n');
    offsets[1] = pos;
    push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offsets[2] = pos;
    const kids = pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ');
    push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\nendobj\n`);
    offsets[3] = pos;
    const safe = title.replace(/[()\\]/g, '');
    push(`3 0 obj\n<< /Title (${safe}) /Creator (Doodlebook) >>\nendobj\n`);
    for (let i = 0; i < pages.length; i++) {
      const pg = pages[i], po = 4 + i * 2, co = po + 1;
      offsets[po] = pos;
      push(`${po} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pg.w)} ${fmt(pg.h)}] /Resources << >> /Contents ${co} 0 R >>\nendobj\n`);
      const raw = enc.encode(pg.content);
      const z = await deflate(raw);
      const data = z || raw;
      offsets[co] = pos;
      push(`${co} 0 obj\n<< /Length ${data.length}${z ? ' /Filter /FlateDecode' : ''} >>\nstream\n`);
      push(data);
      push('\nendstream\nendobj\n');
    }
    const xref = pos;
    let x = `xref\n0 ${n}\n0000000000 65535 f \n`;
    for (let i = 1; i < n; i++) x += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${n} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  };
})();
