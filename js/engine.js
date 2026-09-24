/* Doodlebook engine: seeded randomness, noise, vector shapes, and renderers.
   Every doodle is a list of vector paths drawn with colour *slots* (bg, ink, f1..fN),
   so one drawing can be re-coloured, rendered to SVG, or written straight into a PDF. */
(function () {
  'use strict';
  const DB = (window.DB = window.DB || {});
  const TAU = Math.PI * 2;
  const K = 0.5522847498;

  // ---------- randomness ----------
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    const f = mulberry(seed);
    const r = () => f();
    r.range = (a, b) => a + (b - a) * f();
    r.int = (a, b) => a + Math.floor((b - a + 1) * f());
    r.pick = (arr) => arr[Math.floor(f() * arr.length)];
    r.chance = (p) => f() < p;
    r.sign = () => (f() < 0.5 ? -1 : 1);
    r.shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    return r;
  }

  function makeNoise(seed) {
    const r = makeRng(seed);
    const p = r.shuffle([...Array(256).keys()]);
    const perm = new Uint16Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    const gx = new Float32Array(256), gy = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const a = r() * TAU;
      gx[i] = Math.cos(a);
      gy[i] = Math.sin(a);
    }
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    function n(x, y) {
      const X = Math.floor(x), Y = Math.floor(y);
      const xf = x - X, yf = y - Y, xi = X & 255, yi = Y & 255;
      const g = (ix, iy, dx, dy) => {
        const h = perm[perm[ix] + iy];
        return gx[h] * dx + gy[h] * dy;
      };
      const u = fade(xf), v = fade(yf);
      const a = g(xi, yi, xf, yf) + u * (g(xi + 1, yi, xf - 1, yf) - g(xi, yi, xf, yf));
      const b = g(xi, yi + 1, xf, yf - 1) + u * (g(xi + 1, yi + 1, xf - 1, yf - 1) - g(xi, yi + 1, xf, yf - 1));
      return (a + v * (b - a)) * 1.414;
    }
    n.fbm = (x, y, oct = 3) => {
      let s = 0, a = 1, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) {
        s += a * n(x * f + i * 17.3, y * f - i * 9.1);
        norm += a;
        a *= 0.5;
        f *= 2;
      }
      return s / norm;
    };
    return n;
  }

  // ---------- shapes (arrays of ['M',x,y] ['L',x,y] ['C',...6] ['Z']) ----------
  const S = {
    circle(cx, cy, r) {
      const k = K * r;
      return [
        ['M', cx + r, cy],
        ['C', cx + r, cy + k, cx + k, cy + r, cx, cy + r],
        ['C', cx - k, cy + r, cx - r, cy + k, cx - r, cy],
        ['C', cx - r, cy - k, cx - k, cy - r, cx, cy - r],
        ['C', cx + k, cy - r, cx + r, cy - k, cx + r, cy],
        ['Z'],
      ];
    },
    ellipse(cx, cy, rx, ry, rot = 0) {
      return S.xf(S.circle(0, 0, 1), { sx: rx, sy: ry, rot, x: cx, y: cy });
    },
    rect(x, y, w, h) {
      return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
    },
    rrect(x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      if (!r) return S.rect(x, y, w, h);
      const k = r * (1 - K);
      return [
        ['M', x + r, y], ['L', x + w - r, y], ['C', x + w - k, y, x + w, y + k, x + w, y + r],
        ['L', x + w, y + h - r], ['C', x + w, y + h - k, x + w - k, y + h, x + w - r, y + h],
        ['L', x + r, y + h], ['C', x + k, y + h, x, y + h - k, x, y + h - r],
        ['L', x, y + r], ['C', x, y + k, x + k, y, x + r, y], ['Z'],
      ];
    },
    poly(pts, closed = true) {
      const c = pts.map((p, i) => [i ? 'L' : 'M', p[0], p[1]]);
      if (closed) c.push(['Z']);
      return c;
    },
    line(x1, y1, x2, y2) {
      return [['M', x1, y1], ['L', x2, y2]];
    },
    /* elliptical arc from angle a0 to a1 (radians, y-down so +angle turns clockwise) */
    arc(cx, cy, rx, ry, a0, a1, move = true) {
      const segs = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2) - 1e-9));
      const da = (a1 - a0) / segs, k = (4 / 3) * Math.tan(da / 4);
      const out = [[move ? 'M' : 'L', cx + rx * Math.cos(a0), cy + ry * Math.sin(a0)]];
      for (let i = 0; i < segs; i++) {
        const t0 = a0 + i * da, t1 = t0 + da;
        const c0 = Math.cos(t0), s0 = Math.sin(t0), c1 = Math.cos(t1), s1 = Math.sin(t1);
        out.push(['C', cx + rx * (c0 - k * s0), cy + ry * (s0 + k * c0), cx + rx * (c1 + k * s1), cy + ry * (s1 - k * c1), cx + rx * c1, cy + ry * s1]);
      }
      return out;
    },
    /* Catmull-Rom spline through points */
    smooth(pts, closed = false, t = 1) {
      const n = pts.length;
      if (n < 3) return S.poly(pts, closed);
      const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
      const out = [['M', pts[0][0], pts[0][1]]];
      const last = closed ? n : n - 1;
      for (let i = 0; i < last; i++) {
        const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
        out.push(['C', p1[0] + ((p2[0] - p0[0]) / 6) * t, p1[1] + ((p2[1] - p0[1]) / 6) * t, p2[0] - ((p3[0] - p1[0]) / 6) * t, p2[1] - ((p3[1] - p1[1]) / 6) * t, p2[0], p2[1]]);
      }
      if (closed) out.push(['Z']);
      return out;
    },
    star(cx, cy, ro, ri, n, rot = -Math.PI / 2) {
      const pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = rot + (i * Math.PI) / n, rr = i & 1 ? ri : ro;
        pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
      }
      return S.poly(pts);
    },
    ngon(cx, cy, r, n, rot = -Math.PI / 2) {
      const pts = [];
      for (let i = 0; i < n; i++) pts.push([cx + r * Math.cos(rot + (i * TAU) / n), cy + r * Math.sin(rot + (i * TAU) / n)]);
      return S.poly(pts);
    },
    /* leaf / petal: base at (x,y), tip `len` away along `ang`, half-width `wid` */
    leaf(x, y, len, wid, ang) {
      const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
      const at = (u, w) => [x + c * len * u + nx * w, y + s * len * u + ny * w];
      const a1 = at(0.3, wid), a2 = at(0.78, wid * 0.8), b2 = at(0.78, -wid * 0.8), b1 = at(0.3, -wid);
      const tip = at(1, 0);
      return [['M', x, y], ['C', ...a1, ...a2, ...tip], ['C', ...b2, ...b1, x, y], ['Z']];
    },
    mapPts(cmds, fn) {
      return cmds.map((c) => {
        if (c[0] === 'Z') return c;
        const o = [c[0]];
        for (let i = 1; i < c.length; i += 2) {
          const p = fn(c[i], c[i + 1]);
          o.push(p[0], p[1]);
        }
        return o;
      });
    },
    xf(cmds, { x = 0, y = 0, rot = 0, s = 1, sx = s, sy = s } = {}) {
      const c = Math.cos(rot), sn = Math.sin(rot);
      return S.mapPts(cmds, (px, py) => {
        const X = px * sx, Y = py * sy;
        return [X * c - Y * sn + x, X * sn + Y * c + y];
      });
    },
    /* segment clipped to a rectangle (Liang-Barsky); returns [] when outside */
    clipLine(x1, y1, x2, y2, rx, ry, rw, rh) {
      let t0 = 0, t1 = 1;
      const dx = x2 - x1, dy = y2 - y1;
      const P = [-dx, dx, -dy, dy], Q = [x1 - rx, rx + rw - x1, y1 - ry, ry + rh - y1];
      for (let i = 0; i < 4; i++) {
        if (P[i] === 0) { if (Q[i] < 0) return []; continue; }
        const t = Q[i] / P[i];
        if (P[i] < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
        if (t0 > t1) return [];
      }
      return [['M', x1 + dx * t0, y1 + dy * t0], ['L', x1 + dx * t1, y1 + dy * t1]];
    },
    join(...arrs) {
      return [].concat(...arrs);
    },
    /* parallel lines clipped to a convex polygon */
    hatch(poly, angle, gap, offset = 0) {
      const ux = Math.cos(angle), uy = Math.sin(angle), nx = -uy, ny = ux;
      let lo = Infinity, hi = -Infinity;
      for (const p of poly) {
        const d = p[0] * nx + p[1] * ny;
        lo = Math.min(lo, d);
        hi = Math.max(hi, d);
      }
      const out = [];
      const start = Math.ceil((lo - offset) / gap) * gap + offset;
      for (let k = start; k <= hi; k += gap) {
        let tmin = Infinity, tmax = -Infinity;
        for (let i = 0; i < poly.length; i++) {
          const A = poly[i], B = poly[(i + 1) % poly.length];
          const da = A[0] * nx + A[1] * ny - k, db = B[0] * nx + B[1] * ny - k;
          if ((da <= 0 && db > 0) || (da > 0 && db <= 0)) {
            const t = da / (da - db);
            const px = A[0] + (B[0] - A[0]) * t, py = A[1] + (B[1] - A[1]) * t;
            const tt = px * ux + py * uy;
            tmin = Math.min(tmin, tt);
            tmax = Math.max(tmax, tt);
          }
        }
        if (tmax - tmin > 0.5) out.push(['M', nx * k + ux * tmin, ny * k + uy * tmin], ['L', nx * k + ux * tmax, ny * k + uy * tmax]);
      }
      return out;
    },
  };

  // ---------- helpers used by many patterns ----------
  /* dart-throwing circle packing; radii shrink from maxR to minR over the attempts */
  function pack(d, { maxR, minR, gap = 2, tries = 2500, margin, limit = 1e9 }) {
    minR = Math.min(minR, maxR);
    margin = margin == null ? maxR : margin;
    const r = d.r, out = [], cs = maxR * 2 + gap, cells = new Map();
    const key = (i, j) => i * 73856093 + j * 19349663;
    for (let t = 0; t < tries && out.length < limit; t++) {
      const rad = (maxR - (maxR - minR) * Math.pow(t / tries, 0.55)) * r.range(0.8, 1);
      const x = r.range(-margin, d.W + margin), y = r.range(-margin, d.H + margin);
      const ci = Math.floor(x / cs), cj = Math.floor(y / cs);
      let ok = true;
      for (let i = ci - 1; i <= ci + 1 && ok; i++)
        for (let j = cj - 1; j <= cj + 1 && ok; j++) {
          const l = cells.get(key(i, j));
          if (l) for (const c of l) if (Math.hypot(c.x - x, c.y - y) < c.r + rad + gap) { ok = false; break; }
        }
      if (!ok) continue;
      const c = { x, y, r: rad };
      out.push(c);
      const k = key(ci, cj);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(c);
    }
    return out;
  }

  /* marching squares -> joined polylines per level */
  function contours(W, H, res, field, levels) {
    const nx = Math.ceil(W / res) + 3, ny = Math.ceil(H / res) + 3, ox = -res, oy = -res;
    const v = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[i + j * nx] = field(ox + i * res, oy + j * res);
    const segsBy = levels.map(() => []);
    const pt = (L, t, i, j) => {
      if (t === 'h') {
        const a = v[i + j * nx], b = v[i + 1 + j * nx], u = (L - a) / (b - a);
        return [ox + (i + u) * res, oy + j * res];
      }
      const a = v[i + j * nx], b = v[i + (j + 1) * nx], u = (L - a) / (b - a);
      return [ox + i * res, oy + (j + u) * res];
    };
    const table = {
      1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']], 5: [['L', 'T'], ['B', 'R']], 6: [['T', 'B']], 7: [['L', 'T']],
      8: [['L', 'T']], 9: [['T', 'B']], 10: [['T', 'R'], ['L', 'B']], 11: [['T', 'R']], 12: [['L', 'R']], 13: [['B', 'R']], 14: [['L', 'B']],
    };
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const va = v[i + j * nx], vb = v[i + 1 + j * nx], vc = v[i + 1 + (j + 1) * nx], vd = v[i + (j + 1) * nx];
        const lo = Math.min(va, vb, vc, vd), hi = Math.max(va, vb, vc, vd);
        const E = { T: ['h', i, j], B: ['h', i, j + 1], L: ['v', i, j], R: ['v', i + 1, j] };
        for (let li = 0; li < levels.length; li++) {
          const L = levels[li];
          if (L < lo || L > hi) continue;
          const idx = (va > L ? 8 : 0) | (vb > L ? 4 : 0) | (vc > L ? 2 : 0) | (vd > L ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          for (const [a, b] of table[idx]) {
            const e1 = E[a], e2 = E[b];
            segsBy[li].push([e1.join(','), pt(L, ...e1), e2.join(','), pt(L, ...e2)]);
          }
        }
      }
    const result = levels.map((L, li) => ({ level: L, lines: joinSegs(segsBy[li]) }));
    return result;
  }
  function joinSegs(segs) {
    const adj = new Map();
    segs.forEach((s, i) => {
      for (const k of [s[0], s[2]]) {
        if (!adj.has(k)) adj.set(k, []);
        adj.get(k).push(i);
      }
    });
    const used = new Uint8Array(segs.length), lines = [];
    const extend = (chain) => {
      for (;;) {
        const k = chain[chain.length - 1][0];
        const next = (adj.get(k) || []).find((i) => !used[i]);
        if (next === undefined) return;
        used[next] = 1;
        const s = segs[next];
        chain.push(s[0] === k ? [s[2], s[3]] : [s[0], s[1]]);
      }
    };
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      const s = segs[i];
      let chain = [[s[0], s[1]], [s[2], s[3]]];
      extend(chain);
      chain.reverse();
      extend(chain);
      let closed = false;
      if (chain.length > 3 && chain[0][0] === chain[chain.length - 1][0]) {
        chain.pop();
        closed = true;
      }
      lines.push({ pts: chain.map((c) => c[1]), closed });
    }
    return lines;
  }

  // ---------- the drawing context handed to patterns ----------
  class Doodle {
    constructor(W, H, seed) {
      this.W = W;
      this.H = H;
      this.seed = seed;
      this.r = makeRng(seed);
      this.noise = makeNoise(seed * 7 + 13);
      this.items = [];
      this.nFills = 3;
    }
    add(d, o = {}) {
      this.items.push({ d, fill: o.fill == null ? null : o.fill, stroke: o.stroke === undefined ? 'ink' : o.stroke, w: o.w == null ? 1 : o.w, dash: o.dash || null, rule: o.rule || null });
      return this;
    }
    shape(d, fill = 'f1', w = 1) { return this.add(d, { fill, w }); }
    solid(d, fill = 'ink') { return this.add(d, { fill, stroke: null }); }
    stroke(d, w = 1, slot = 'ink', dash) { return this.add(d, { fill: null, stroke: slot, w, dash }); }
    any() { return 'f' + (1 + Math.floor(this.r() * this.nFills)); }
    cyc(i) { return 'f' + (1 + (((i % this.nFills) + this.nFills) % this.nFills)); }
    /* outline only the outside of overlapping shapes: fat strokes underneath, fills on top */
    union(shapes, fill = 'bg', w = 1) {
      for (const s of shapes) this.add(s, { fill: null, stroke: 'ink', w: w * 2 });
      for (const s of shapes) this.add(s, { fill, stroke: null });
    }
    /* draw into a larger square and rotate it about the centre of the page */
    rotated(deg, fn) {
      const a = (deg * Math.PI) / 180, W = this.W, H = this.H;
      if (!a) return fn(W, H);
      const D = Math.hypot(W, H), start = this.items.length;
      this.W = this.H = D;
      fn(D, D);
      this.W = W;
      this.H = H;
      const c = Math.cos(a), s = Math.sin(a);
      for (let i = start; i < this.items.length; i++)
        this.items[i].d = S.mapPts(this.items[i].d, (x, y) => {
          const X = x - D / 2, Y = y - D / 2;
          return [X * c - Y * s + W / 2, X * s + Y * c + H / 2];
        });
    }
  }

  // ---------- post-processing: hand-drawn wobble ----------
  function splitCubic(p, t) {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = p;
    const L = (a, b) => a + (b - a) * t;
    const ax = L(x0, x1), ay = L(y0, y1), bx = L(x1, x2), by = L(y1, y2), cx = L(x2, x3), cy = L(y2, y3);
    const dx = L(ax, bx), dy = L(ay, by), ex = L(bx, cx), ey = L(by, cy), fx = L(dx, ex), fy = L(dy, ey);
    return [[x0, y0, ax, ay, dx, dy, fx, fy], [fx, fy, ex, ey, cx, cy, x3, y3]];
  }
  function wobble(cmds, amp, nz, freq) {
    if (amp <= 0.001) return cmds;
    const disp = (x, y) => [x + amp * nz(x * freq, y * freq), y + amp * nz(x * freq + 31.7, y * freq + 17.3)];
    const seg = 7, out = [];
    let cx = 0, cy = 0, sx = 0, sy = 0;
    const lineTo = (x, y) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x - cx, y - cy) / seg));
      for (let i = 1; i <= n; i++) out.push(['L', ...disp(cx + ((x - cx) * i) / n, cy + ((y - cy) * i) / n)]);
      cx = x;
      cy = y;
    };
    for (const c of cmds) {
      if (c[0] === 'M') {
        cx = sx = c[1];
        cy = sy = c[2];
        out.push(['M', ...disp(cx, cy)]);
      } else if (c[0] === 'L') lineTo(c[1], c[2]);
      else if (c[0] === 'C') {
        const p = [cx, cy, c[1], c[2], c[3], c[4], c[5], c[6]];
        const len = Math.hypot(c[1] - cx, c[2] - cy) + Math.hypot(c[3] - c[1], c[4] - c[2]) + Math.hypot(c[5] - c[3], c[6] - c[4]);
        const n = Math.min(12, Math.max(1, Math.ceil(len / (seg * 3))));
        let rest = p;
        for (let i = 0; i < n; i++) {
          let piece;
          if (i === n - 1) piece = rest;
          else [piece, rest] = splitCubic(rest, 1 / (n - i));
          out.push(['C', ...disp(piece[2], piece[3]), ...disp(piece[4], piece[5]), ...disp(piece[6], piece[7])]);
        }
        cx = c[5];
        cy = c[6];
      } else if (c[0] === 'Z') {
        if (Math.hypot(cx - sx, cy - sy) > 0.01) lineTo(sx, sy);
        out.push(['Z']);
        cx = sx;
        cy = sy;
      }
    }
    return out;
  }

  // ---------- build ----------
  DB.BASE_LW = 1.3;
  DB.paramsFor = function (pattern, params) {
    const p = {};
    for (const s of pattern.params) p[s.key] = params && params[s.key] !== undefined ? params[s.key] : s.def;
    return p;
  };
  DB.build = function (pattern, st, W, H) {
    const zoom = st.zoom || 1;
    const d = new Doodle(W / zoom, H / zoom, (st.seed >>> 0) || 1);
    d.nFills = pattern.fills || 3;
    const p = DB.paramsFor(pattern, st.params);
    try {
      pattern.draw(d, p, d.r);
    } catch (e) {
      console.error('pattern failed', pattern.id, e);
    }
    const amp = (st.wobble == null ? 2 : st.wobble) * 0.45;
    const nz = makeNoise(((st.seed >>> 0) || 1) + 1234);
    const lw = DB.BASE_LW * (st.weight == null ? 1 : st.weight) * zoom;
    const items = d.items.map((it) => ({
      ...it,
      d: S.mapPts(wobble(it.d, amp, nz, 1 / 38), (x, y) => [x * zoom, y * zoom]),
      w: it.w * lw,
      dash: it.dash ? it.dash.map((v) => v * zoom) : null,
    }));
    return { W, H, items };
  };

  // ---------- colour resolution ----------
  function hash(i) {
    let h = (i + 0x9e3779b9) | 0;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }
  DB.resolver = function (colors) {
    const fills = colors.fills && colors.fills.length ? colors.fills : [colors.bg];
    const salt = colors.salt || 0;
    return (slot, i, isStroke) => {
      if (!slot) return null;
      if (slot === 'bg') return colors.bg;
      if (slot === 'ink') return colors.ink;
      if (colors.coloring) return isStroke ? colors.ink : colors.bg;
      const k = parseInt(slot.slice(1), 10) - 1;
      if (colors.mode === 'scatter') return fills[hash(i * 31 + k + salt * 7919) % fills.length];
      return fills[k % fills.length];
    };
  };

  // ---------- SVG ----------
  const fmt = (n) => {
    const s = n.toFixed(2);
    return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
  };
  DB.fmt = fmt;
  function pathD(cmds) {
    let s = '';
    for (const c of cmds) {
      s += c[0];
      for (let i = 1; i < c.length; i++) s += (i > 1 ? ' ' : '') + fmt(c[i]);
    }
    return s;
  }
  let uid = 0;
  DB.svgBody = function (built, colors) {
    const res = DB.resolver(colors);
    const id = 'dbclip' + uid++;
    let body = '';
    built.items.forEach((it, i) => {
      const f = it.fill ? res(it.fill, i, false) : null;
      const s = it.stroke ? res(it.stroke, i, true) : null;
      if (!f && !s) return;
      let a = `<path d="${pathD(it.d)}" fill="${f || 'none'}"`;
      if (it.rule && f) a += ' fill-rule="evenodd"';
      if (s) {
        a += ` stroke="${s}" stroke-width="${fmt(it.w)}"`;
        if (it.dash) a += ` stroke-dasharray="${it.dash.map(fmt).join(' ')}"`;
      }
      body += a + '/>';
    });
    return `<defs><clipPath id="${id}"><rect width="${fmt(built.W)}" height="${fmt(built.H)}"/></clipPath></defs><rect width="${fmt(built.W)}" height="${fmt(built.H)}" fill="${colors.bg}"/><g clip-path="url(#${id})" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  };
  DB.toSVG = function (built, colors, attrs = '') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(built.W)} ${fmt(built.H)}" ${attrs}>${DB.svgBody(built, colors)}</svg>`;
  };

  DB.S = S;
  DB.pack = pack;
  DB.contours = contours;
  DB.makeRng = makeRng;
  DB.makeNoise = makeNoise;
  DB.TAU = TAU;
  DB.hash = hash;
})();
