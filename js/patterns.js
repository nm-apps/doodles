/* The pattern library. Each pattern draws into a Doodle `d` (d.W x d.H units, short side ~400)
   using colour slots: 'bg' (paper), 'ink', and 'f1'..'fN' (fills). */
(function () {
  'use strict';
  const DB = window.DB;
  const { circle, ellipse, rect, rrect, poly, line, arc, smooth, star, ngon, leaf, xf, hatch, join, clipLine } = DB.S;
  const { pack, contours, TAU } = DB;
  const PI = Math.PI;

  const R = (key, label, min, max, def, step = 1) => ({ key, label, type: 'range', min, max, def, step });
  const B = (key, label, def) => ({ key, label, type: 'bool', def });
  const O = (key, label, options, def) => ({ key, label, type: 'select', options, def });

  /* iterate a (optionally staggered) grid that overshoots the page */
  function grid(d, sx, sy, fn, stagger = 0, margin = 1) {
    const cols = Math.ceil(d.W / sx) + margin * 2 + 1, rows = Math.ceil(d.H / sy) + margin * 2 + 1;
    for (let j = -margin; j < rows - margin; j++)
      for (let i = -margin; i < cols - margin; i++) fn(i * sx + (j & 1 ? stagger : 0), j * sy, i, j);
  }
  const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const lerp = (a, b, t) => a + (b - a) * t;

  const P = [];
  const def = (o) => P.push(o);

  // 1
  def({
    id: 'pebbles', name: 'Pebble Path', tags: ['organic', 'dots', 'scattered'], fills: 3, palette: 'Sage Garden',
    params: [R('maxR', 'Largest pebble', 10, 70, 36), R('minR', 'Smallest pebble', 3, 30, 6), R('gap', 'Spacing', 0, 12, 3), R('rings', 'Rings inside', 0, 6, 2), B('dots', 'Centre dots', true)],
    draw(d, p, r) {
      for (const c of pack(d, { maxR: p.maxR, minR: p.minR, gap: p.gap })) {
        const sq = r.range(0.78, 1), rot = r() * TAU;
        d.shape(ellipse(c.x, c.y, c.r, c.r * sq, rot), d.any());
        const k = Math.min(p.rings, Math.floor(c.r / 4));
        for (let i = 1; i <= k; i++) {
          const rr = c.r * (1 - i / (k + 1));
          d.stroke(ellipse(c.x, c.y, rr, rr * sq, rot), 0.7);
        }
        if (p.dots && c.r > 6) d.solid(circle(c.x, c.y, Math.max(1.3, c.r * 0.08)));
      }
    },
  });

  // 2
  def({
    id: 'scales', name: 'Mermaid Scales', tags: ['geometric', 'retro', 'dense'], fills: 3, palette: 'Ocean',
    params: [R('size', 'Scale size', 14, 90, 42), R('inner', 'Inner arcs', 0, 5, 2), O('shape', 'Shape', ['round', 'pointed'], 'round'), O('flow', 'Colour flow', ['rows', 'diagonal', 'random'], 'rows'), B('dot', 'Dot', true)],
    draw(d, p, r) {
      const s = p.size, rad = s / 2, dy = s * 0.42;
      const rows = Math.ceil(d.H / dy) + 3, cols = Math.ceil(d.W / s) + 2;
      const lower = (cx, cy, k) =>
        p.shape === 'round'
          ? arc(cx, cy, rad * k, rad * k, 0, PI)
          : [['M', cx + rad * k, cy], ['C', cx + rad * k, cy + rad * 0.6 * k, cx + rad * 0.35 * k, cy + rad * 0.8 * k, cx, cy + rad * 1.15 * k], ['C', cx - rad * 0.35 * k, cy + rad * 0.8 * k, cx - rad * k, cy + rad * 0.6 * k, cx - rad * k, cy]];
      for (let j = rows; j >= -2; j--)
        for (let i = -1; i < cols; i++) {
          const cx = i * s + (j & 1 ? rad : 0), cy = j * dy;
          const f = p.flow === 'rows' ? d.cyc(j) : p.flow === 'diagonal' ? d.cyc(i + (j >> 1)) : d.any();
          d.shape(join(lower(cx, cy, 1), arc(cx, cy, rad, rad, PI, TAU, false), [['Z']]), f);
          for (let k = 1; k <= p.inner; k++) {
            const kk = 1 - k / (p.inner + 1);
            d.stroke(p.shape === 'round' ? arc(cx, cy, rad * kk, rad * kk, 0.12 * PI, 0.88 * PI) : lower(cx, cy - rad * 0.25 * (1 - kk), kk), 0.7);
          }
          if (p.dot) d.solid(circle(cx, cy + rad * (p.shape === 'round' ? 0.62 : 0.72), rad * 0.09));
        }
    },
  });

  // 3
  def({
    id: 'rainfall', name: 'Rainfall', tags: ['lines', 'minimal', 'texture'], fills: 3, palette: 'Ink Only',
    params: [R('gap', 'Column spacing', 5, 40, 13), R('len', 'Dash length', 4, 60, 22), R('space', 'Gap between dashes', 2, 30, 8), R('slant', 'Slant', -60, 60, 0), R('dots', 'Dot chance', 0, 1, 0.2, 0.05), B('colorful', 'Colourful', false)],
    draw(d, p, r) {
      d.rotated(p.slant, (W, H) => {
        for (let x = p.gap / 2; x < W; x += p.gap) {
          let y = -r() * p.len * 2;
          const w = r.range(0.8, 1.2);
          while (y < H) {
            const slot = p.colorful ? d.any() : 'ink';
            if (r.chance(p.dots)) {
              d.solid(circle(x, y + 2, 1.5 * w), slot);
              y += 5 + p.space;
            } else {
              const L = p.len * r.range(0.4, 1.4);
              d.stroke(line(x, y, x, y + L), w, slot);
              y += L + p.space * r.range(0.5, 1.5);
            }
          }
        }
      });
    },
  });

  // 4
  def({
    id: 'honeycomb', name: 'Honeycomb Bloom', tags: ['geometric', 'grid', 'nature'], fills: 3, palette: 'Citrus',
    params: [R('size', 'Cell size', 10, 70, 28), R('nested', 'Nested hexes', 0, 4, 1), R('gap', 'Gap', 0, 10, 2), R('fill', 'Fill chance', 0, 1, 0.5, 0.05), B('dot', 'Centre dot', true)],
    draw(d, p, r) {
      const Rr = p.size, w = Math.sqrt(3) * Rr;
      grid(d, w, Rr * 1.5, (x, y) => {
        const rr = Rr - p.gap / 2;
        d.shape(ngon(x, y, rr, 6), r.chance(p.fill) ? d.any() : 'bg');
        for (let k = 1; k <= p.nested; k++) d.stroke(ngon(x, y, rr * (1 - k / (p.nested + 1)), 6), 0.7);
        if (p.dot) d.solid(circle(x, y, Math.max(1.2, rr * 0.1)));
      }, w / 2);
    },
  });

  // 5
  def({
    id: 'snails', name: 'Snail Mail', tags: ['curvy', 'playful', 'grid'], fills: 3, palette: 'Terracotta',
    params: [R('size', 'Size', 20, 100, 48), R('turns', 'Turns', 1, 6, 3, 0.5), R('jitter', 'Size jitter', 0, 1, 0.3, 0.05), B('disc', 'Backing disc', true), B('mixed', 'Mixed directions', true)],
    draw(d, p, r) {
      grid(d, p.size, p.size * 0.87, (x, y) => {
        const Rr = p.size * 0.45 * (1 - p.jitter * r() * 0.45);
        if (p.disc) d.shape(circle(x, y, Rr + 2), d.any());
        const dir = p.mixed ? r.sign() : 1, rot = r() * TAU, n = Math.ceil(p.turns * 36), pts = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n, a = rot + dir * t * p.turns * TAU;
          pts.push([x + Rr * t * Math.cos(a), y + Rr * t * Math.sin(a)]);
        }
        d.stroke(poly(pts, false), 1);
      }, p.size / 2);
    },
  });

  // 6
  def({
    id: 'ribbons', name: 'Ribbon Candy', tags: ['waves', 'curvy', 'bold'], fills: 3, palette: 'Bubblegum',
    params: [R('band', 'Band height', 10, 80, 30), R('amp', 'Amplitude', 0, 60, 18), R('freq', 'Waves across', 1, 10, 3, 0.5), R('shift', 'Phase shift', 0, 1, 0.2, 0.05), O('detail', 'Detail', ['dots', 'dashes', 'lines', 'none'], 'dots')],
    draw(d, p) {
      const W = d.W, curve = (k, off = 0) => {
        const pts = [];
        for (let x = -12; x <= W + 12; x += 4) pts.push([x, k * p.band + off + p.amp * Math.sin((x / W) * p.freq * TAU + k * p.shift * TAU)]);
        return pts;
      };
      const n = Math.ceil((d.H + p.amp * 2) / p.band) + 2;
      for (let k = -2; k < n; k++) {
        const a = curve(k), b = curve(k + 1);
        d.shape(poly(a.concat(b.reverse())), d.cyc(k));
        if (p.detail === 'none') continue;
        const mid = curve(k).map((q, i) => [q[0], (q[1] + curve(k + 1)[i][1]) / 2]);
        if (p.detail === 'dots') mid.forEach((q, i) => i % 3 === 0 && d.solid(circle(q[0], q[1], Math.min(2.2, p.band * 0.1))));
        else if (p.detail === 'dashes') d.stroke(poly(mid, false), 0.8, 'ink', [5, 6]);
        else {
          d.stroke(poly(curve(k, p.band / 3), false), 0.6);
          d.stroke(poly(curve(k, (2 * p.band) / 3), false), 0.6);
        }
      }
    },
  });

  // 7
  def({
    id: 'warp', name: 'Checker Warp', tags: ['optical', 'geometric', 'bold'], fills: 2, palette: 'Ink Only',
    params: [R('cells', 'Cells across', 4, 30, 12), R('strength', 'Warp strength', 0, 1, 0.55, 0.05), O('mode', 'Warp', ['bulge', 'twist', 'wave'], 'bulge'), B('outline', 'Cell outlines', false)],
    draw(d, p) {
      const c = Math.min(d.W, d.H) / p.cells, cx = d.W / 2, cy = d.H / 2, M = Math.max(d.W, d.H) / 2, s = p.strength;
      const warp = (x, y) => {
        const dx = x - cx, dy = y - cy, rr = Math.hypot(dx, dy) / M;
        if (p.mode === 'bulge') {
          if (rr < 1e-6) return [x, y];
          const k = Math.pow(Math.min(rr, 1.6), 1 / (1 + 1.5 * s)) / Math.min(rr, 1.6);
          return [cx + dx * k, cy + dy * k];
        }
        if (p.mode === 'twist') {
          const a = s * 2.6 * Math.max(0, 1 - rr) ** 2, co = Math.cos(a), si = Math.sin(a);
          return [cx + dx * co - dy * si, cy + dx * si + dy * co];
        }
        const lam = d.W / (TAU * 1.5);
        return [x + s * c * 0.9 * Math.sin(y / lam), y + s * c * 0.9 * Math.sin(x / lam)];
      };
      grid(d, c, c, (x, y, i, j) => {
        const pts = [];
        const edge = (x0, y0, x1, y1) => { for (let t = 0; t < 5; t++) pts.push(warp(lerp(x0, x1, t / 5), lerp(y0, y1, t / 5))); };
        edge(x, y, x + c, y); edge(x + c, y, x + c, y + c); edge(x + c, y + c, x, y + c); edge(x, y + c, x, y);
        d.add(poly(pts), { fill: (i + j) & 1 ? 'f1' : 'f2', stroke: p.outline ? 'ink' : null, w: 0.7 });
      }, 0, 3);
    },
  });

  // 8
  def({
    id: 'daisies', name: 'Daisy Field', tags: ['floral', 'nature', 'scattered'], fills: 3, palette: 'Sketchbook',
    params: [R('size', 'Flower size', 10, 60, 26), R('petals', 'Petals', 5, 16, 9), R('density', 'Density', 0.2, 1, 0.85, 0.05), R('variety', 'Size variety', 0, 1, 0.5, 0.05), B('buds', 'Tiny buds', true)],
    draw(d, p, r) {
      for (const c of pack(d, { maxR: p.size, minR: 3, gap: 2, tries: 3000 })) {
        if (c.r < p.size * (1 - p.variety * 0.7)) {
          if (p.buds && c.r > 2.5) d.shape(circle(c.x, c.y, Math.min(c.r, 4)), d.any(), 0.8);
          continue;
        }
        if (!r.chance(p.density)) continue;
        const n = Math.max(4, p.petals + (p.variety > 0.3 ? r.int(-1, 1) : 0)), rot = r() * TAU, Rr = c.r;
        const pf = r.pick(['f1', 'f3', 'bg']);
        for (let i = 0; i < n; i++) {
          const a = rot + (i * TAU) / n;
          d.shape(ellipse(c.x + Math.cos(a) * Rr * 0.55, c.y + Math.sin(a) * Rr * 0.55, Rr * 0.45, Math.min(Rr * 0.24, Rr * Math.sin(PI / n) * 0.95), a), pf, 0.8);
        }
        d.shape(circle(c.x, c.y, Rr * 0.26), 'f2');
        for (let i = 0; i < 5; i++) d.solid(circle(c.x + r.range(-1, 1) * Rr * 0.13, c.y + r.range(-1, 1) * Rr * 0.13, Math.max(0.6, Rr * 0.03)));
      }
    },
  });

  // 9
  def({
    id: 'vines', name: 'Climbing Vines', tags: ['nature', 'organic', 'curvy'], fills: 3, palette: 'Sage Garden',
    params: [R('spacing', 'Vine spacing', 30, 120, 60), R('leaf', 'Leaf size', 6, 30, 15), R('leafGap', 'Leaf spacing', 10, 50, 22), R('sway', 'Sway', 0, 30, 12), B('curls', 'Tendrils', true), B('berries', 'Berries', false)],
    draw(d, p, r) {
      for (let x0 = p.spacing / 2; x0 < d.W + p.spacing; x0 += p.spacing) {
        const ph = r() * TAU, fx = (y) => x0 + p.sway * Math.sin(y / 40 + ph);
        const pts = [];
        for (let y = -20; y <= d.H + 20; y += 8) pts.push([fx(y), y]);
        d.stroke(smooth(pts), 1.2);
        let side = r.sign();
        for (let y = r() * p.leafGap; y < d.H + 10; y += p.leafGap * r.range(0.8, 1.2)) {
          side = -side;
          const x = fx(y), L = p.leaf * r.range(0.8, 1.2), ang = side > 0 ? -0.6 + r.range(-0.2, 0.2) : PI + 0.6 + r.range(-0.2, 0.2);
          d.shape(leaf(x, y, L, L * 0.36, ang), r.chance(0.5) ? 'f1' : 'f2', 0.9);
          d.stroke(line(x, y, x + Math.cos(ang) * L * 0.7, y + Math.sin(ang) * L * 0.7), 0.5);
          if (p.curls && r.chance(0.22)) {
            const cp = [], a0 = side > 0 ? PI : 0, rr = L * 0.35;
            for (let t = 0; t <= 1.001; t += 0.05) {
              const a = a0 + side * t * TAU * 1.3, q = rr * (1 - t * 0.7);
              cp.push([x - side * rr + q * Math.cos(a) * -1, y + L * 0.5 + q * Math.sin(a)]);
            }
            d.stroke(poly(cp, false), 0.7);
          }
          if (p.berries && r.chance(0.18)) for (let k = 0; k < 3; k++) d.shape(circle(x - side * (6 + k * 3), y + 5 + (k % 2) * 4, 2.6), 'f3', 0.7);
        }
      }
    },
  });

  // 10
  def({
    id: 'truchet', name: 'Truchet Garden', tags: ['maze', 'curvy', 'geometric'], fills: 2, palette: 'Riso',
    params: [R('size', 'Tile size', 16, 90, 38), R('lines', 'Lines per tile', 1, 6, 3), O('style', 'Style', ['arcs', 'mixed', 'diagonal'], 'arcs'), B('shade', 'Shade corners', true)],
    draw(d, p, r) {
      const s = p.size, n = p.lines;
      grid(d, s, s, (x, y, i, j) => {
        const o = r() < 0.5, kind = p.style === 'mixed' ? (r.chance(0.8) ? 'arcs' : 'cross') : p.style;
        const corners = o ? [[x, y, 0], [x + s, y + s, PI]] : [[x + s, y, PI / 2], [x, y + s, -PI / 2]];
        if (kind === 'arcs') {
          if (p.shade) for (const [cx, cy, a] of corners) d.solid(join([['M', cx, cy]], arc(cx, cy, s / (n + 1), s / (n + 1), a, a + PI / 2, false), [['Z']]), (i + j) & 1 ? 'f1' : 'f2');
          for (const [cx, cy, a] of corners) for (let k = 1; k <= n; k++) d.stroke(arc(cx, cy, (s * k) / (n + 1), (s * k) / (n + 1), a, a + PI / 2), 1);
        } else if (kind === 'cross') {
          for (let k = 1; k <= n; k++) {
            d.stroke(line(x, y + (s * k) / (n + 1), x + s, y + (s * k) / (n + 1)), 1);
            d.stroke(line(x + (s * k) / (n + 1), y, x + (s * k) / (n + 1), y + s), 1);
          }
        } else {
          for (let k = 1; k <= n; k++) {
            const t = (s * k) / (n + 1);
            if (o) { d.stroke(line(x + t, y, x, y + t), 1); d.stroke(line(x + s, y + t, x + t, y + s), 1); }
            else { d.stroke(line(x + s - t, y, x + s, y + t), 1); d.stroke(line(x, y + t, x + s - t, y + s), 1); }
          }
        }
      });
    },
  });

  // 11
  def({
    id: 'tenprint', name: 'Ten Print Maze', tags: ['maze', 'lines', 'retro'], fills: 3, palette: 'Blueprint',
    params: [R('size', 'Cell size', 8, 50, 20), R('bias', 'Direction bias', 0, 1, 0.5, 0.05), R('shade', 'Shaded triangles', 0, 1, 0.3, 0.05), R('weight', 'Line weight', 0.5, 4, 1.6, 0.1)],
    draw(d, p, r) {
      const s = p.size;
      grid(d, s, s, (x, y) => {
        const fw = r() < p.bias;
        if (r.chance(p.shade)) {
          const up = r() < 0.5;
          const tri = fw ? (up ? [[x, y], [x + s, y], [x, y + s]] : [[x + s, y], [x + s, y + s], [x, y + s]]) : up ? [[x, y], [x + s, y], [x + s, y + s]] : [[x, y], [x + s, y + s], [x, y + s]];
          d.solid(poly(tri), d.any());
        }
        d.stroke(fw ? line(x, y + s, x + s, y) : line(x, y, x + s, y + s), p.weight);
      }, 0, 0);
    },
  });

  // 12
  def({
    id: 'starry', name: 'Starry Night', tags: ['celestial', 'scattered', 'playful'], fills: 3, palette: 'Night Sky',
    params: [R('size', 'Star size', 6, 40, 16), R('density', 'Density', 0.2, 1, 0.75, 0.05), O('style', 'Style', ['mixed', 'classic', 'sparkle'], 'mixed'), R('dust', 'Stardust', 0, 1, 0.5, 0.05)],
    draw(d, p, r) {
      for (const c of pack(d, { maxR: p.size, minR: p.size * 0.35, gap: p.size * 0.8 })) {
        if (!r.chance(p.density)) continue;
        const kind = p.style === 'mixed' ? r.pick(['classic', 'classic', 'sparkle', 'ring']) : p.style;
        const rot = -PI / 2 + r.range(-0.3, 0.3);
        if (kind === 'classic') d.shape(star(c.x, c.y, c.r, c.r * 0.45, r.int(5, 7), rot), d.any(), 0.9);
        else if (kind === 'sparkle') {
          const k = c.r * 0.3;
          const s4 = [['M', c.x, c.y - c.r], ['C', c.x + k * 0.2, c.y - k, c.x + k, c.y - k * 0.2, c.x + c.r, c.y], ['C', c.x + k, c.y + k * 0.2, c.x + k * 0.2, c.y + k, c.x, c.y + c.r], ['C', c.x - k * 0.2, c.y + k, c.x - k, c.y + k * 0.2, c.x - c.r, c.y], ['C', c.x - k, c.y - k * 0.2, c.x - k * 0.2, c.y - k, c.x, c.y - c.r], ['Z']];
          d.shape(s4, d.any(), 0.9);
        } else {
          d.shape(circle(c.x, c.y, c.r * 0.45), d.any(), 0.9);
          d.stroke(ellipse(c.x, c.y, c.r, c.r * 0.3, r.range(-0.5, 0.5)), 0.7);
        }
      }
      const n = Math.floor((p.dust * d.W * d.H) / 700);
      for (let i = 0; i < n; i++) {
        const x = r() * d.W, y = r() * d.H;
        if (r.chance(0.12)) { d.stroke(line(x - 2.5, y, x + 2.5, y), 0.7); d.stroke(line(x, y - 2.5, x, y + 2.5), 0.7); }
        else d.solid(circle(x, y, r.range(0.5, 1.3)));
      }
    },
  });

  // 13
  def({
    id: 'bricks', name: 'Brick Lane', tags: ['grid', 'texture', 'geometric'], fills: 3, palette: 'Terracotta',
    params: [R('w', 'Brick width', 20, 100, 50), R('h', 'Brick height', 8, 50, 22), R('gap', 'Mortar', 1, 10, 3), R('texture', 'Texture', 0, 1, 0.35, 0.05), O('bond', 'Bond', ['running', 'stack', 'random'], 'running')],
    draw(d, p, r) {
      const rows = Math.ceil(d.H / p.h) + 2;
      for (let j = -1; j < rows; j++) {
        const off = p.bond === 'running' ? (j & 1 ? p.w / 2 : 0) : p.bond === 'random' ? r() * p.w : 0;
        for (let x = -p.w - off; x < d.W + p.w; x += p.w) {
          const bx = x + p.gap / 2, by = j * p.h + p.gap / 2, bw = p.w - p.gap, bh = p.h - p.gap;
          d.shape(rrect(bx, by, bw, bh, Math.min(4, bh / 3)), r.chance(0.7) ? d.cyc(Math.floor(r() * 2)) : d.any(), 0.9);
          if (r.chance(p.texture)) {
            const kind = r.pick(['hatch', 'dots', 'crack']);
            if (kind === 'hatch') d.stroke(hatch(rectPts(bx + 3, by + 3, bw - 6, bh - 6), PI / 4, 4), 0.6);
            else if (kind === 'dots') for (let k = 0; k < 6; k++) d.solid(circle(bx + r.range(4, bw - 4), by + r.range(3, bh - 3), 0.9));
            else {
              const cp = [[bx + r.range(4, bw * 0.4), by + r.range(3, bh - 3)]];
              for (let k = 0; k < 3; k++) cp.push([cp[k][0] + r.range(3, 7), cp[k][1] + r.range(-3, 3)]);
              d.stroke(poly(cp.map((q) => [Math.min(q[0], bx + bw - 2), Math.max(by + 2, Math.min(q[1], by + bh - 2))]), false), 0.6);
            }
          }
        }
      }
    },
  });

  // 14
  def({
    id: 'chevrons', name: 'Chevron Parade', tags: ['retro', 'geometric', 'bold'], fills: 3, palette: 'Autumn',
    params: [R('band', 'Band height', 10, 60, 26), R('zig', 'Zig width', 10, 120, 50), R('amp', 'Amplitude', 5, 60, 22), O('detail', 'Detail', ['inner', 'dashed', 'dots', 'none'], 'inner'), B('two', 'Two-tone', false)],
    draw(d, p) {
      const curve = (k, off = 0) => {
        const pts = [];
        for (let x = -p.zig; x <= d.W + p.zig; x += p.zig / 2) pts.push([x, k * p.band + off + (Math.round(x / (p.zig / 2)) & 1 ? p.amp / 2 : -p.amp / 2)]);
        return pts;
      };
      const n = Math.ceil((d.H + p.amp) / p.band) + 2;
      for (let k = -2; k < n; k++) {
        const top = curve(k);
        d.shape(poly(top.concat(curve(k + 1).reverse())), p.two ? (k & 1 ? 'f1' : 'bg') : d.cyc(k), 1);
        if (p.detail === 'inner') d.stroke(poly(curve(k, p.band / 2), false), 0.6);
        if (p.detail === 'dashed') d.stroke(poly(curve(k, p.band / 2), false), 0.8, 'ink', [4, 5]);
        if (p.detail === 'dots') curve(k, p.band / 2).forEach((q) => d.solid(circle(q[0], q[1], Math.min(2.4, p.band * 0.1))));
      }
    },
  });

  // 15
  def({
    id: 'ripples', name: 'Pond Ripples', tags: ['radial', 'curvy', 'optical'], fills: 3, palette: 'Ocean',
    params: [R('centers', 'Drops', 1, 12, 5), R('spacing', 'Ring spacing', 4, 30, 11), R('rings', 'Rings', 3, 30, 12), B('fill', 'Filled rings', true)],
    draw(d, p, r) {
      const all = [];
      for (let c = 0; c < p.centers; c++) {
        const x = r() * d.W, y = r() * d.H, off = r() * p.spacing;
        for (let k = 0; k < p.rings; k++) all.push({ x, y, r: off + (k + 1) * p.spacing, k, c });
      }
      all.sort((a, b) => b.r - a.r);
      for (const q of all) d.shape(circle(q.x, q.y, q.r), p.fill && q.k % 2 === 0 ? d.cyc(q.c) : 'bg', 0.9);
    },
  });

  // 16
  def({
    id: 'sunburst', name: 'Sunburst', tags: ['radial', 'bold', 'retro'], fills: 3, palette: 'Citrus',
    params: [R('rays', 'Rays', 6, 90, 32), R('cx', 'Centre X', 0, 1, 0.5, 0.01), R('cy', 'Centre Y', 0, 1, 0.5, 0.01), R('core', 'Core size', 0, 150, 50), O('style', 'Style', ['straight', 'wavy', 'petal'], 'wavy'), B('rings', 'Core rings', true)],
    draw(d, p) {
      const cx = d.W * p.cx, cy = d.H * p.cy, Rr = Math.hypot(d.W, d.H) * 1.05, n = p.rays;
      const edge = (a) => {
        const pts = [];
        for (let t = 0; t <= Rr; t += 6) {
          const off = p.style === 'wavy' ? Math.sin(t / 14) * Math.min(8, (t * PI) / n / 2) : 0;
          pts.push([cx + Math.cos(a) * t - Math.sin(a) * off, cy + Math.sin(a) * t + Math.cos(a) * off]);
        }
        return pts;
      };
      for (let k = 0; k < n; k++) {
        const a0 = (k * TAU) / n, a1 = ((k + 1) * TAU) / n, f = n % 2 === 0 ? (k & 1 ? 'bg' : d.cyc(Math.floor(k / 2))) : d.cyc(k);
        if (p.style === 'petal') {
          d.shape(leaf(cx, cy, Rr * (k & 1 ? 0.5 : 0.8), (Rr * PI) / n * 0.5, (a0 + a1) / 2), f, 1);
        } else d.shape(poly(edge(a0).concat(edge(a1).reverse())), f, 1);
      }
      if (p.core > 0) {
        d.shape(circle(cx, cy, p.core), 'f3');
        if (p.rings) for (let rr = p.core - 7; rr > 3; rr -= 7) d.stroke(circle(cx, cy, rr), 0.7);
        d.solid(circle(cx, cy, 2.5));
      }
    },
  });

  // 17
  def({
    id: 'mandala', name: 'Mandala', tags: ['radial', 'ornate', 'floral'], fills: 3, palette: 'Plum Jam',
    params: [O('layout', 'Layout', ['single', 'tiled'], 'single'), R('size', 'Diameter', 60, 520, 360), R('rings', 'Rings', 3, 10, 6), R('petals', 'Petals', 6, 24, 12), B('alt', 'Alternate colours', true)],
    draw(d, p, r) {
      const types = ['petal', 'round', 'spike', 'dots', 'band', 'petal', 'teardrop'];
      const design = [];
      let prev = '';
      for (let i = 0; i < p.rings; i++) {
        const mult = r.pick([1, 1, 2, 0.5]);
        let type = r.pick(types);
        while (type === prev) type = r.pick(types);
        prev = type;
        design.push({ type, n: Math.max(6, Math.round(p.petals * mult)), rot: r.chance(0.5) ? 0.5 : 0, fill: p.alt ? d.cyc(i) : 'f1' });
      }
      const draw = (cx, cy, Rr) => {
        const nS = p.petals * 2;
        const rim = [];
        for (let k = 0; k < nS; k++) {
          const a0 = (k * TAU) / nS, a1 = ((k + 1) * TAU) / nS;
          rim.push(circle(cx + Math.cos((a0 + a1) / 2) * Rr, cy + Math.sin((a0 + a1) / 2) * Rr, (Rr * PI) / nS * 1.05));
        }
        d.union(rim.concat([circle(cx, cy, Rr)]), 'f3', 0.9);
        d.shape(circle(cx, cy, Rr * 0.97), 'bg', 0.8);
        const r0 = Rr * 0.14, edges = [];
        for (let i = 0; i <= p.rings; i++) edges.push(lerp(Rr, r0, i / p.rings));
        design.forEach((g, i) => {
          const a = edges[i + 1], b = edges[i], mid = (a + b) / 2, n = g.n;
          if (g.type === 'band') d.add(join(circle(cx, cy, b * 0.97), circle(cx, cy, a * 1.03)), { fill: g.fill, stroke: 'ink', w: 0.7, rule: 'evenodd' });
          else d.stroke(circle(cx, cy, b * 0.97), 0.5);
          for (let k = 0; k < n; k++) {
            const ang = ((k + g.rot) * TAU) / n, co = Math.cos(ang), si = Math.sin(ang);
            if (g.type === 'petal' || g.type === 'teardrop') d.shape(leaf(cx + co * a, cy + si * a, b - a, Math.min((b - a) * (g.type === 'teardrop' ? 0.6 : 0.4), ((a * PI) / n) * 1.3), ang), g.fill, 0.8);
            else if (g.type === 'round') d.shape(circle(cx + co * mid, cy + si * mid, Math.min((b - a) / 2, (mid * PI) / n) * 0.85), g.fill, 0.8);
            else if (g.type === 'spike') {
              const hw = PI / n;
              d.shape(poly([[cx + Math.cos(ang - hw) * a, cy + Math.sin(ang - hw) * a], [cx + co * b, cy + si * b], [cx + Math.cos(ang + hw) * a, cy + Math.sin(ang + hw) * a]]), g.fill, 0.8);
            } else if (g.type === 'dots') d.solid(circle(cx + co * mid, cy + si * mid, Math.min((b - a) * 0.18, (mid * PI) / n * 0.4)));
            else d.stroke(line(cx + co * a * 1.03, cy + si * a * 1.03, cx + co * b * 0.97, cy + si * b * 0.97), 0.6);
          }
          if (g.type === 'dots' || g.type === 'band') { d.stroke(circle(cx, cy, a), 0.7); d.stroke(circle(cx, cy, b), 0.7); }
        });
        d.shape(circle(cx, cy, r0), 'f2');
        d.stroke(circle(cx, cy, r0 * 0.55), 0.7);
        d.solid(circle(cx, cy, r0 * 0.18));
      };
      if (p.layout === 'single') draw(d.W / 2, d.H / 2, Math.min(p.size, Math.min(d.W, d.H) * 0.94) / 2);
      else {
        const s = Math.max(60, p.size / 2.5);
        grid(d, s, s, (x, y) => { d.solid(star(x, y, s * 0.12, s * 0.04, 4, 0), 'f3'); draw(x + s / 2, y + s / 2, s * 0.47); });
      }
    },
  });

  // 18
  def({
    id: 'crosshatch', name: 'Crosshatch Quilt', tags: ['lines', 'texture', 'grid'], fills: 3, palette: 'Ink Only',
    params: [R('size', 'Tile size', 14, 80, 34), R('gap', 'Line spacing', 2, 12, 4.5, 0.5), R('blank', 'Blank tiles', 0, 1, 0.12, 0.02), R('solid', 'Solid tiles', 0, 1, 0.1, 0.02), B('border', 'Tile borders', true)],
    draw(d, p, r) {
      const s = p.size;
      grid(d, s, s, (x, y) => {
        const pts = rectPts(x + 1.5, y + 1.5, s - 3, s - 3), u = r();
        if (u < p.solid) d.solid(poly(pts), d.any());
        else if (u >= p.solid + p.blank) {
          const angs = r.pick([[0], [PI / 2], [PI / 4], [-PI / 4], [PI / 4, -PI / 4], [0, PI / 2]]);
          for (const a of angs) d.stroke(hatch(pts, a, p.gap), 0.7);
        }
        if (p.border) d.stroke(rect(x, y, s, s), 1);
      }, 0, 0);
    },
  });

  // 19
  def({
    id: 'bubbles', name: 'Bubble Wrap', tags: ['dots', 'playful', 'grid'], fills: 3, palette: 'Bubblegum',
    params: [R('size', 'Bubble size', 10, 60, 26), R('gap', 'Gap', 0, 20, 4), R('variation', 'Size variation', 0, 1, 0.2, 0.05), R('fill', 'Fill chance', 0, 1, 0.6, 0.05), B('shine', 'Shine', true)],
    draw(d, p, r) {
      const sx = p.size + p.gap;
      grid(d, sx, sx * 0.866, (x, y) => {
        const rr = (p.size / 2) * (1 - p.variation * r() * 0.6), filled = r.chance(p.fill);
        d.shape(circle(x, y, rr), filled ? d.any() : 'bg');
        if (p.shine && rr > 4) {
          const sl = filled ? 'bg' : 'ink';
          d.stroke(arc(x, y, rr * 0.65, rr * 0.65, PI * 1.1, PI * 1.38), 1, sl);
          d.solid(circle(x + Math.cos(PI * 1.52) * rr * 0.65, y + Math.sin(PI * 1.52) * rr * 0.65, Math.max(0.8, rr * 0.07)), sl);
        }
      }, sx / 2);
    },
  });

  // 20
  def({
    id: 'prism', name: 'Prism Mosaic', tags: ['geometric', 'mosaic', 'bold'], fills: 3, palette: 'Riso',
    params: [R('size', 'Triangle size', 16, 90, 40), R('fill', 'Fill chance', 0, 1, 0.6, 0.05), R('hatchP', 'Hatch chance', 0, 1, 0.15, 0.05), R('inset', 'Inner triangles', 0, 1, 0.25, 0.05)],
    draw(d, p, r) {
      const s = p.size, h = s * 0.866, rows = Math.ceil(d.H / h) + 2, cols = Math.ceil(d.W / s) + 3;
      const pt = (i, j) => [i * s + (j & 1 ? s / 2 : 0), j * h];
      for (let j = -1; j < rows; j++)
        for (let i = -2; i < cols; i++) {
          const a0 = pt(i, j), a1 = pt(i + 1, j), b0 = pt(i, j + 1), b1 = pt(i + 1, j + 1);
          const tris = j & 1 ? [[a0, a1, b1], [b0, b1, a0]] : [[a0, a1, b0], [b0, b1, a1]];
          for (const t of tris) {
            d.shape(poly(t), r.chance(p.fill) ? d.any() : 'bg', 0.9);
            if (r.chance(p.hatchP)) d.stroke(hatch(t, Math.atan2(t[1][1] - t[0][1], t[1][0] - t[0][0]), 3.5), 0.6);
            else if (r.chance(p.inset)) {
              const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
              d.shape(poly(t.map((q) => [cx + (q[0] - cx) * 0.45, cy + (q[1] - cy) * 0.45])), r.chance(0.5) ? 'ink' : 'bg', 0.7);
            }
          }
        }
    },
  });

  // 21
  def({
    id: 'scallops', name: 'Scallop Lace', tags: ['ornate', 'retro', 'curvy'], fills: 3, palette: 'Plum Jam',
    params: [R('size', 'Scallop width', 16, 80, 38), R('row', 'Row overlap', 0.35, 1, 0.62, 0.01), R('inner', 'Inner arcs', 0, 3, 1), B('fringe', 'Fringe', true), B('dots', 'Dots', true)],
    draw(d, p) {
      const s = p.size, rr = s / 2, dy = s * p.row, rows = Math.ceil(d.H / dy) + 2;
      for (let j = rows; j >= -1; j--) {
        for (let x = -s + (j & 1 ? rr : 0); x < d.W + s; x += s) {
          const cx = x, cy = j * dy;
          if (p.fringe) for (let k = 1; k < 9; k++) {
            const a = (k * PI) / 9;
            d.stroke(line(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cx + Math.cos(a) * (rr + 4), cy + Math.sin(a) * (rr + 4)), 0.6);
          }
          d.shape(join(arc(cx, cy, rr, rr, PI, 0), [['Z']]), d.cyc(j), 0.9);
          for (let k = 1; k <= p.inner; k++) d.stroke(arc(cx, cy, rr * (1 - k / (p.inner + 1)), rr * (1 - k / (p.inner + 1)), PI, 0), 0.6);
          if (p.dots) d.shape(circle(cx, cy + rr * 0.5, rr * 0.1), 'bg', 0.6);
        }
      }
    },
  });

  // 22
  def({
    id: 'woodgrain', name: 'Wood Grain', tags: ['organic', 'lines', 'nature'], fills: 2, palette: 'Autumn',
    params: [R('spacing', 'Grain spacing', 3, 20, 7, 0.5), R('knots', 'Knots', 0, 8, 3), R('warp', 'Warp', 0, 3, 1.2, 0.1), O('dir', 'Direction', ['horizontal', 'vertical'], 'horizontal'), B('tint', 'Tinted rings', true)],
    draw(d, p, r) {
      d.rotated(p.dir === 'vertical' ? 90 : 0, (W, H) => {
        const knots = [];
        for (let i = 0; i < p.knots; i++) knots.push({ x: r() * W, y: r() * H, s: r.range(12, 34), k: r.range(2, 4.5) });
        const field = (x, y) => {
          let v = y / p.spacing + d.noise.fbm(x / 260, y / 90, 3) * p.warp * 6;
          for (const k of knots) v += k.k * Math.exp(-((x - k.x) ** 2 / (k.s * k.s * 3.5) + (y - k.y) ** 2 / (k.s * k.s)));
          return v;
        };
        const lv = [];
        for (let l = -40; l < H / p.spacing + 40; l++) lv.push(l + 0.5);
        for (const c of contours(W, H, 4, field, lv)) {
          const colored = p.tint && Math.round(c.level) % 5 === 0;
          for (const ln of c.lines) if (ln.pts.length > 2) d.stroke(smooth(ln.pts, ln.closed), colored ? 1.8 : 0.8, colored ? 'f1' : 'ink');
        }
      });
    },
  });

  // 23
  def({
    id: 'topo', name: 'Topography', tags: ['organic', 'lines', 'landscape'], fills: 3, palette: 'Lagoon',
    params: [R('scale', 'Terrain scale', 60, 400, 170), R('lines', 'Contour count', 6, 40, 18), O('style', 'Style', ['index lines', 'plain', 'colourful'], 'index lines'), B('peaks', 'Mark peaks', true)],
    draw(d, p) {
      const field = (x, y) => d.noise.fbm(x / p.scale, y / p.scale, 4);
      const lv = [];
      for (let i = 0; i < p.lines; i++) lv.push(-0.7 + (1.4 * (i + 0.5)) / p.lines);
      contours(d.W, d.H, 4, field, lv).forEach((c, i) => {
        const idx = p.style === 'index lines' && i % 5 === 2;
        const slot = p.style === 'colourful' ? d.cyc(i) : 'ink';
        for (const ln of c.lines) {
          if (ln.pts.length < 3) continue;
          d.stroke(smooth(ln.pts, ln.closed), idx ? 1.9 : p.style === 'colourful' ? 1.5 : 0.8, slot);
          if (p.peaks && i === lv.length - 1 && ln.closed) {
            const cx = ln.pts.reduce((a, q) => a + q[0], 0) / ln.pts.length, cy = ln.pts.reduce((a, q) => a + q[1], 0) / ln.pts.length;
            d.shape(star(cx, cy, 5, 2, 4, 0), 'f2', 0.6);
          }
        }
      });
    },
  });

  // 24
  def({
    id: 'confetti', name: 'Confetti Party', tags: ['playful', 'scattered', 'bold'], fills: 5, palette: 'Citrus',
    params: [R('size', 'Piece size', 4, 30, 12), R('density', 'Density', 0.2, 1, 0.8, 0.05), O('mix', 'Mix', ['everything', 'geometric', 'squiggles'], 'everything'), B('outline', 'Outlined', true)],
    draw(d, p, r) {
      const kinds = p.mix === 'geometric' ? ['tri', 'rect', 'circle', 'half'] : p.mix === 'squiggles' ? ['squig', 'squig', 'ring', 'plus'] : ['tri', 'rect', 'circle', 'half', 'squig', 'ring', 'plus', 'dot'];
      for (const c of pack(d, { maxR: p.size, minR: p.size * 0.55, gap: p.size * 0.6 })) {
        if (!r.chance(p.density)) continue;
        const f = d.any(), rot = r() * TAU, k = r.pick(kinds), rr = c.r;
        const st = p.outline ? 'ink' : null;
        const T = (sh) => xf(sh, { x: c.x, y: c.y, rot });
        if (k === 'tri') d.add(T(ngon(0, 0, rr, 3)), { fill: f, stroke: st });
        else if (k === 'rect') d.add(T(rect(-rr, -rr * 0.35, rr * 2, rr * 0.7)), { fill: f, stroke: st });
        else if (k === 'circle') d.add(circle(c.x, c.y, rr * 0.7), { fill: f, stroke: st });
        else if (k === 'half') d.add(T(join(arc(0, 0, rr, rr, 0, PI), [['Z']])), { fill: f, stroke: st });
        else if (k === 'squig') {
          const pts = [];
          for (let t = -1; t <= 1.001; t += 0.1) pts.push([t * rr * 1.2, Math.sin(t * PI * 2) * rr * 0.35]);
          d.stroke(T(poly(pts, false)), 2.2, f);
        } else if (k === 'ring') d.stroke(circle(c.x, c.y, rr * 0.6), 2.2, f);
        else if (k === 'plus') { d.stroke(T(line(-rr * 0.7, 0, rr * 0.7, 0)), 2.2, f); d.stroke(T(line(0, -rr * 0.7, 0, rr * 0.7)), 2.2, f); }
        else d.solid(circle(c.x, c.y, rr * 0.3), f);
      }
    },
  });

  // 25
  def({
    id: 'clouds', name: 'Cloud Nine', tags: ['playful', 'curvy', 'celestial'], fills: 3, palette: 'Lagoon',
    params: [R('size', 'Cloud size', 30, 140, 70), R('density', 'Density', 0.3, 1, 0.75, 0.05), R('puff', 'Puffiness', 3, 8, 5), B('rain', 'Rain', false), B('tinted', 'Tinted clouds', true)],
    draw(d, p, r) {
      const s = p.size;
      grid(d, s * 1.25, s * 0.62, (x, y) => {
        if (!r.chance(p.density)) {
          if (r.chance(0.3)) d.shape(star(x, y, 4, 1.6, 4, 0), 'f3', 0.6);
          return;
        }
        const cx = x + r.range(-s * 0.15, s * 0.15), cy = y + r.range(-s * 0.1, s * 0.1), w = s * r.range(0.8, 1.1), h = w * 0.42;
        const shapes = [rrect(cx - w / 2, cy - h * 0.1, w, h * 0.5, h * 0.25)];
        for (let i = 0; i < p.puff; i++) {
          const t = (i + 0.5) / p.puff, rr = h * (0.35 + 0.35 * Math.sin(t * PI)) * r.range(0.85, 1.15);
          shapes.push(circle(cx - w / 2 + w * t, cy + h * 0.2 - rr * 0.7, rr));
        }
        d.union(shapes, p.tinted ? r.pick(['f1', 'f2', 'bg']) : 'bg', 1);
        if (p.rain) for (let k = 0; k < 4; k++) d.stroke(line(cx - w * 0.3 + k * w * 0.2, cy + h * 0.6, cx - w * 0.3 + k * w * 0.2 - 3, cy + h * 0.6 + 7), 0.8);
      }, s * 0.62);
    },
  });

  // 26
  def({
    id: 'argyle', name: 'Argyle Knit', tags: ['retro', 'geometric', 'woven'], fills: 3, palette: 'Autumn',
    params: [R('w', 'Diamond width', 20, 120, 52), R('ratio', 'Height ratio', 1, 2.5, 1.5, 0.05), B('stitch', 'Stitch lines', true), B('three', 'Three colours', true)],
    draw(d, p) {
      const w = p.w, h = w * p.ratio;
      grid(d, w, h / 2, (x, y, i, j) => {
        const f = j & 1 ? 'f2' : p.three && (i & 1) ? 'f3' : 'f1';
        d.add(poly([[x, y - h / 2], [x + w / 2, y], [x, y + h / 2], [x - w / 2, y]]), { fill: f, stroke: null });
      }, w / 2, 2);
      if (p.stitch) {
        const n = Math.ceil((d.W + d.H * (w / h)) / w) + 4, L = Math.ceil(d.H / h) + 4;
        for (let k = -n; k <= n * 2; k++) {
          const a = clipLine(k * w - L * w, -L * h, k * w + L * w, L * h, -4, -4, d.W + 8, d.H + 8);
          const b = clipLine(k * w + L * w, -L * h, k * w - L * w, L * h, -4, -4, d.W + 8, d.H + 8);
          if (a.length) d.stroke(a, 0.9, 'ink', [4, 4]);
          if (b.length) d.stroke(b, 0.9, 'ink', [4, 4]);
        }
      }
    },
  });

  // 27
  def({
    id: 'cursive', name: 'Cursive Loops', tags: ['lines', 'curvy', 'playful'], fills: 3, palette: 'Terracotta',
    params: [R('spacing', 'Row spacing', 12, 60, 28), R('loop', 'Loop size', 4, 30, 11), R('pitch', 'Loop pitch', 4, 30, 12), O('mix', 'Row styles', ['mixed', 'loops'], 'mixed'), B('colorful', 'Colourful', true)],
    draw(d, p, r) {
      let k = 0;
      for (let y = p.spacing / 2; y < d.H + p.spacing; y += p.spacing, k++) {
        const kind = p.mix === 'loops' ? 'loops' : r.pick(['loops', 'loops', 'wave', 'zig', 'bumps', 'spring']);
        const a = p.pitch / TAU, b = p.loop / 2, pts = [], ph = r() * TAU;
        if (kind === 'loops' || kind === 'spring') {
          const bb = kind === 'spring' ? b * 1.4 : b;
          for (let t = -2 * PI; a * t - 20 < d.W; t += 0.18) pts.push([a * t - bb * Math.sin(t + ph) - 10, y - bb * Math.cos(t + ph)]);
        } else if (kind === 'wave') for (let x = -10; x < d.W + 10; x += 3) pts.push([x, y + b * Math.sin(x / (p.pitch * 0.5) + ph)]);
        else if (kind === 'zig') for (let x = -10, i = 0; x < d.W + 20; x += p.pitch / 2, i++) pts.push([x, y + (i & 1 ? b : -b)]);
        else {
          for (let x = -10; x < d.W + 10; x += p.pitch) pts.push(...arc(x + p.pitch / 2, y, p.pitch / 2, b * 1.2, PI, TAU, pts.length === 0).map((c) => c));
          d.stroke(pts, 1.8, p.colorful ? d.cyc(k) : 'ink');
          continue;
        }
        d.stroke(poly(pts, false), 1.8, p.colorful ? d.cyc(k) : 'ink');
      }
    },
  });

  // 28
  def({
    id: 'tidefans', name: 'Tide Fans', tags: ['waves', 'ornate', 'retro'], fills: 3, palette: 'Ocean',
    params: [R('size', 'Fan size', 20, 120, 52), R('rings', 'Rings', 2, 8, 4), O('fill', 'Fill', ['alternate', 'cascade', 'outline'], 'alternate')],
    draw(d, p) {
      const Rr = p.size / 2, rows = Math.ceil(d.H / (Rr / 2)) + 3;
      for (let j = -1; j < rows; j++)
        for (let x = -2 * Rr + (j & 1 ? Rr : 0); x < d.W + 2 * Rr; x += 2 * Rr) {
          const y = j * (Rr / 2);
          for (let k = 0; k < p.rings; k++) {
            const rr = (Rr * (p.rings - k)) / p.rings;
            const f = p.fill === 'outline' ? 'bg' : p.fill === 'cascade' ? d.cyc(k) : k % 2 ? 'bg' : d.cyc(j >> 1);
            d.shape(circle(x, y, rr), f, 0.9);
          }
        }
    },
  });

  // 29
  def({
    id: 'circuit', name: 'Circuit Garden', tags: ['tech', 'lines', 'geometric'], fills: 3, palette: 'Blueprint',
    params: [R('g', 'Grid size', 8, 30, 14), R('traces', 'Traces', 10, 250, 90), R('len', 'Max trace length', 3, 30, 14), B('chips', 'Chips', true), B('pads', 'Pads', true)],
    draw(d, p, r) {
      const g = p.g, nx = Math.ceil(d.W / g) + 1, ny = Math.ceil(d.H / g) + 1, occ = new Uint8Array(nx * ny);
      const free = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny && !occ[i + j * nx];
      if (p.chips) {
        const nc = Math.round((d.W * d.H) / 30000);
        for (let c = 0; c < nc; c++) {
          const w = r.int(3, 6), h = r.int(2, 4), i0 = r.int(1, nx - w - 2), j0 = r.int(1, ny - h - 2);
          let ok = true;
          for (let i = i0 - 1; i <= i0 + w + 1; i++) for (let j = j0 - 1; j <= j0 + h + 1; j++) if (!free(i, j)) ok = false;
          if (!ok) continue;
          for (let i = i0; i <= i0 + w; i++) for (let j = j0; j <= j0 + h; j++) occ[i + j * nx] = 1;
          for (let i = i0; i <= i0 + w; i++) { d.stroke(line(i * g, j0 * g - g * 0.6, i * g, (j0 + h) * g + g * 0.6), 1); }
          d.shape(rrect(i0 * g - g * 0.3, j0 * g, w * g + g * 0.6, h * g, 3), 'f1');
          d.solid(circle(i0 * g + g * 0.4, j0 * g + g * 0.5, g * 0.15), 'bg');
        }
      }
      const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
      for (let t = 0; t < p.traces; t++) {
        let i = r.int(0, nx - 1), j = r.int(0, ny - 1);
        if (!free(i, j)) continue;
        let dir = r.int(0, 3) * 2;
        const pts = [[i, j]];
        occ[i + j * nx] = 1;
        const L = r.int(2, p.len);
        for (let s = 0; s < L; s++) {
          if (r.chance(0.3)) dir = (dir + r.pick([1, 7])) % 8;
          const [di, dj] = dirs[dir];
          if (!free(i + di, j + dj)) break;
          i += di; j += dj;
          occ[i + j * nx] = 1;
          pts.push([i, j]);
        }
        if (pts.length < 3) continue;
        d.stroke(poly(pts.map((q) => [q[0] * g, q[1] * g]), false), 1.3);
        if (p.pads) for (const q of [pts[0], pts[pts.length - 1]]) d.shape(circle(q[0] * g, q[1] * g, g * 0.26), r.chance(0.3) ? 'f2' : 'bg', 1);
      }
    },
  });

  // 30
  def({
    id: 'polka', name: 'Polka Pop', tags: ['dots', 'retro', 'minimal'], fills: 3, palette: 'Riso',
    params: [R('spacing', 'Spacing', 8, 60, 24), R('size', 'Dot size', 0.1, 0.95, 0.62, 0.01), O('gradient', 'Gradient', ['radial', 'linear', 'noise', 'none'], 'radial'), B('rings', 'Rings', false), B('multi', 'Multicolour', false)],
    draw(d, p) {
      const cx = d.W / 2, cy = d.H / 2, M = Math.hypot(cx, cy);
      grid(d, p.spacing, p.spacing * 0.866, (x, y, i, j) => {
        const g = p.gradient === 'linear' ? x / d.W : p.gradient === 'radial' ? 1 - Math.hypot(x - cx, y - cy) / M : p.gradient === 'noise' ? (d.noise.fbm(x / 120, y / 120) + 1) / 2 : 1;
        const rr = ((p.spacing * p.size) / 2) * (0.12 + 0.88 * Math.max(0, Math.min(1, g)));
        const f = p.multi ? d.cyc(i + j * 2) : 'f1';
        d.add(circle(x, y, rr), { fill: f, stroke: null });
        if (p.rings && rr > 2) d.stroke(circle(x, y, rr + 2.5), 0.6);
      }, p.spacing / 2);
    },
  });

  // 31
  def({
    id: 'petaltiles', name: 'Four Petal Tiles', tags: ['floral', 'geometric', 'grid'], fills: 3, palette: 'Sage Garden',
    params: [R('size', 'Tile size', 20, 100, 44), R('width', 'Petal width', 0.2, 0.8, 0.45, 0.01), O('rot', 'Rotation', ['0°', '45°'], '0°'), B('corners', 'Corner gems', true), B('alt', 'Alternate colours', true)],
    draw(d, p) {
      const s = p.size, off = p.rot === '45°' ? PI / 4 : 0;
      grid(d, s, s, (x, y, i, j) => {
        const cx = x + s / 2, cy = y + s / 2, f = p.alt && (i + j) & 1 ? 'f2' : 'f1';
        const L = p.rot === '45°' ? s * 0.62 : s * 0.49;
        for (let k = 0; k < 4; k++) d.shape(leaf(cx, cy, L, s * p.width * 0.28, off + (k * PI) / 2), f, 0.9);
        d.shape(circle(cx, cy, s * 0.08), 'f3', 0.8);
        if (p.corners) d.shape(star(x, y, s * 0.12, s * 0.05, 4, off + PI / 4), 'f3', 0.7);
      });
    },
  });

  // 32
  def({
    id: 'meadow', name: 'Meadow Grass', tags: ['nature', 'lines', 'landscape'], fills: 3, palette: 'Sage Garden',
    params: [R('density', 'Density', 0.2, 1, 0.45, 0.05), R('height', 'Blade height', 10, 80, 40), R('bend', 'Bend', 0, 1, 0.45, 0.05), R('flowers', 'Flowers', 0, 1, 0.12, 0.02)],
    draw(d, p, r) {
      const h = p.height;
      for (let y = 0; y < d.H + h; y += h * 0.45) {
        for (let x = -6; x < d.W + 6; x += (6 / p.density) * r.range(0.6, 1.4)) {
          const H = h * r.range(0.6, 1.1), bx = x, by = y + r.range(-3, 3), tx = bx + p.bend * H * r.range(-0.7, 0.7), ty = by - H, w = r.range(2.6, 4.4);
          if (r.chance(p.flowers)) {
            d.stroke([['M', bx, by], ['C', bx, by - H * 0.5, tx, ty + H * 0.4, tx, ty]], 0.9);
            for (let k = 0; k < 5; k++) d.shape(circle(tx + Math.cos((k * TAU) / 5) * 2.8, ty + Math.sin((k * TAU) / 5) * 2.8, 2.2), 'f3', 0.6);
            d.solid(circle(tx, ty, 1.4));
            continue;
          }
          d.shape([['M', bx - w, by], ['C', bx - w, by - H * 0.5, tx - (tx - bx) * 0.3, ty + H * 0.3, tx, ty], ['C', tx - (tx - bx) * 0.3 + w * 0.3, ty + H * 0.35, bx + w, by - H * 0.5, bx + w, by], ['Z']], r.chance(0.5) ? 'f1' : 'f2', 0.7);
        }
      }
    },
  });

  // 33
  def({
    id: 'feathers', name: 'Feather Drift', tags: ['nature', 'organic', 'scattered'], fills: 3, palette: 'Terracotta',
    params: [R('size', 'Feather length', 30, 160, 84), R('density', 'Density', 0.3, 1, 0.8, 0.05), R('barbs', 'Barb spacing', 3, 15, 5, 0.5), B('spots', 'Eye spots', false)],
    draw(d, p, r) {
      for (const c of pack(d, { maxR: p.size / 2, minR: p.size / 4, gap: 1 })) {
        if (!r.chance(p.density)) continue;
        const L = c.r * 2, W = L * 0.17, rot = r() * TAU, T = (sh) => xf(sh, { x: c.x, y: c.y, rot });
        d.shape(T(leaf(-L / 2, 0, L, W, 0)), d.any(), 0.9);
        for (let x = -L / 2 + p.barbs; x < L / 2 - 4; x += p.barbs) {
          const u = (x + L / 2) / L, hw = Math.sin(PI * Math.min(1, u * 1.1)) * W * 0.78;
          if (r.chance(0.1)) continue;
          d.stroke(T(line(x, 0, x + hw * 0.7, -hw)), 0.5);
          d.stroke(T(line(x, 0, x + hw * 0.7, hw)), 0.5);
        }
        d.stroke(T(line(-L / 2 - L * 0.12, 0, L / 2 - 2, 0)), 1.1);
        if (p.spots) { d.shape(T(ellipse(L * 0.25, 0, W * 0.5, W * 0.35)), 'f3', 0.7); d.solid(T(circle(L * 0.25, 0, W * 0.15))); }
      }
    },
  });

  // 34
  def({
    id: 'twisted', name: 'Twisted Squares', tags: ['optical', 'geometric', 'grid'], fills: 3, palette: 'Lagoon',
    params: [R('size', 'Tile size', 20, 120, 52), R('nested', 'Nested squares', 2, 14, 7), R('twist', 'Twist (°)', 0, 45, 10), O('fill', 'Fill', ['alternate', 'cascade', 'outline'], 'alternate'), B('flip', 'Alternate twist', true)],
    draw(d, p) {
      const th = (p.twist * PI) / 180;
      grid(d, p.size, p.size, (x, y, i, j) => {
        const cx = x + p.size / 2, cy = y + p.size / 2, dir = p.flip && (i + j) & 1 ? -1 : 1;
        let s = p.size * 0.96;
        for (let k = 0; k < p.nested; k++) {
          const a = dir * k * th + PI / 4, rr = s / Math.SQRT2;
          const f = p.fill === 'outline' ? 'bg' : p.fill === 'cascade' ? d.cyc(k + i + j) : k % 2 ? 'bg' : d.cyc(i + j);
          d.shape(ngon(cx, cy, rr, 4, a), f, 0.8);
          s = th > 0.001 ? s / (Math.cos(th) + Math.sin(th)) : s * (1 - 1 / (p.nested + 1));
        }
      }, 0, 0);
    },
  });

  // 35
  def({
    id: 'shards', name: 'Crystal Shards', tags: ['geometric', 'mosaic', 'bold'], fills: 4, palette: 'Plum Jam',
    params: [R('size', 'Shard size', 16, 100, 46), R('jitter', 'Jitter', 0, 0.5, 0.35, 0.01), R('hatchP', 'Hatch chance', 0, 1, 0.2, 0.05), R('empty', 'Empty chance', 0, 1, 0.2, 0.05), B('facets', 'Inner facets', true)],
    draw(d, p, r) {
      const s = p.size, nx = Math.ceil(d.W / s) + 3, ny = Math.ceil(d.H / s) + 3, pts = [];
      for (let j = 0; j < ny; j++) { pts.push([]); for (let i = 0; i < nx; i++) pts[j].push([(i - 1) * s + r.range(-1, 1) * s * p.jitter, (j - 1) * s + r.range(-1, 1) * s * p.jitter]); }
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], e = pts[j + 1][i];
          const tris = r() < 0.5 ? [[a, b, c], [a, c, e]] : [[a, b, e], [b, c, e]];
          for (const t of tris) {
            d.shape(poly(t), r.chance(p.empty) ? 'bg' : d.any(), 0.9);
            if (r.chance(p.hatchP)) d.stroke(hatch(t, r() * PI, 3.5), 0.5);
            else if (p.facets && r.chance(0.3)) {
              const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
              for (const q of t) d.stroke(line(cx, cy, lerp(cx, q[0], 0.7), lerp(cy, q[1], 0.7)), 0.5);
            }
          }
        }
    },
  });

  // 36
  def({
    id: 'basket', name: 'Basket Weave', tags: ['woven', 'texture', 'grid'], fills: 3, palette: 'Terracotta',
    params: [R('size', 'Tile size', 16, 80, 40), R('strips', 'Strips per tile', 2, 6, 3), R('gap', 'Gap', 0, 6, 1.5, 0.5), B('stitch', 'Stitch detail', true)],
    draw(d, p) {
      const s = p.size, sw = s / p.strips;
      grid(d, s, s, (x, y, i, j) => {
        const hor = (i + j) % 2 === 0;
        for (let k = 0; k < p.strips; k++) {
          const f = hor ? (k % 2 ? 'f1' : 'f2') : k % 2 ? 'f3' : 'f1';
          const bx = hor ? x + p.gap / 2 : x + k * sw + p.gap / 2, by = hor ? y + k * sw + p.gap / 2 : y + p.gap / 2;
          const bw = hor ? s - p.gap : sw - p.gap, bh = hor ? sw - p.gap : s - p.gap;
          d.shape(rrect(bx, by, bw, bh, Math.min(bw, bh) * 0.3), f, 0.8);
          if (p.stitch) d.stroke(hor ? line(bx + 4, by + bh / 2, bx + bw - 4, by + bh / 2) : line(bx + bw / 2, by + 4, bx + bw / 2, by + bh - 4), 0.6, 'ink', [2, 3]);
        }
      }, 0, 0);
    },
  });

  // 37
  def({
    id: 'pinwheels', name: 'Pinwheels', tags: ['playful', 'geometric', 'grid'], fills: 3, palette: 'Bubblegum',
    params: [R('size', 'Tile size', 20, 120, 54), O('blade', 'Blade', ['curved', 'straight'], 'curved'), R('spin', 'Reverse chance', 0, 1, 0.25, 0.05), B('center', 'Centre pin', true)],
    draw(d, p, r) {
      const s = p.size, h = s / 2;
      const diag = p.blade === 'curved' ? [['C', -h * 0.05, -h * 0.55, -h * 0.45, -h * 1.0, -h, -h]] : [['L', -h, -h]];
      const diagBack = p.blade === 'curved' ? [['C', -h * 0.45, -h * 1.0, -h * 0.05, -h * 0.55, 0, 0]] : [['L', 0, 0]];
      grid(d, s, s, (x, y, i, j) => {
        const cx = x + h, cy = y + h, f = d.cyc(i + j * 2), mir = r.chance(p.spin) ? -1 : 1;
        for (let q = 0; q < 4; q++) {
          const T = (sh) => xf(xf(sh, { sx: mir, sy: 1 }), { x: cx, y: cy, rot: (q * PI) / 2 });
          d.shape(T(join([['M', 0, 0]], diag, [['L', 0, -h], ['Z']])), f, 0.9);
          d.shape(T(join([['M', -h, 0], ['L', -h, -h]], diagBack, [['Z']])), 'bg', 0.9);
        }
        if (p.center) d.shape(circle(cx, cy, s * 0.06), 'f3', 0.8);
      }, 0, 0);
    },
  });

  // 38
  def({
    id: 'mountains', name: 'Mountain Layers', tags: ['landscape', 'nature', 'bold'], fills: 4, palette: 'Ocean',
    params: [R('layers', 'Layers', 3, 12, 6), R('rough', 'Roughness', 0, 1, 0.55, 0.05), R('height', 'Height', 0.1, 0.9, 0.55, 0.01), B('sun', 'Sun', true), B('hatchP', 'Slope strokes', true), B('birds', 'Birds', true)],
    draw(d, p, r) {
      const n = p.layers, top = d.H * (1 - p.height);
      if (p.sun) {
        const sx = d.W * r.range(0.2, 0.8), sy = top * r.range(0.35, 0.75) + 10, sr = Math.min(d.W, d.H) * 0.09;
        d.shape(circle(sx, sy, sr), 'f3');
        d.stroke(circle(sx, sy, sr + 7), 0.6, 'ink', [2, 4]);
      }
      if (p.birds) for (let k = 0; k < 5; k++) {
        const bx = r() * d.W, by = r() * top * 0.7 + 8, bw = r.range(4, 7);
        d.stroke([['M', bx - bw, by - bw * 0.3], ['C', bx - bw * 0.6, by - bw * 0.8, bx - bw * 0.2, by - bw * 0.6, bx, by], ['C', bx + bw * 0.2, by - bw * 0.6, bx + bw * 0.6, by - bw * 0.8, bx + bw, by - bw * 0.3]], 0.8);
      }
      for (let L = 0; L < n; L++) {
        const base = top + (L / Math.max(1, n - 1)) * (d.H - top) * 0.82, amp = (d.H - top) * (0.55 - 0.3 * (L / n)), ph = r() * 100, pts = [];
        for (let x = -10; x <= d.W + 10; x += 5) {
          const ridge = 1 - Math.abs(d.noise(x / (140 - 60 * p.rough) + ph, L * 3.1));
          const fine = d.noise.fbm(x / 30 + ph, L * 7.3, 2) * p.rough * 0.25;
          pts.push([x, base - amp * (ridge * 0.8 + fine) + amp * 0.3]);
        }
        d.shape(poly(pts.concat([[d.W + 10, d.H + 10], [-10, d.H + 10]])), d.cyc(n - 1 - L), 1);
        if (p.hatchP) for (let k = 2; k < pts.length - 2; k += 3) {
          const q = pts[k], slope = pts[k + 1][1] - pts[k - 1][1];
          if (slope > 2 && r.chance(0.6)) d.stroke(line(q[0], q[1] + 4, q[0] - 5, q[1] + 14), 0.6);
        }
      }
    },
  });

  // 39
  def({
    id: 'teardrops', name: 'Teardrops', tags: ['nature', 'playful', 'grid'], fills: 3, palette: 'Lagoon',
    params: [R('size', 'Drop size', 8, 50, 20), R('spacing', 'Spacing', 1.2, 3, 1.8, 0.05), R('tilt', 'Tilt (°)', 0, 60, 15), R('fill', 'Fill chance', 0, 1, 0.7, 0.05), B('shine', 'Highlights', true)],
    draw(d, p, r) {
      const u = [['M', 0, -2.2], ['C', 0.3, -1.5, 1, -0.9, 1, 0], ...arc(0, 0, 1, 1, 0, PI, false).slice(1), ['C', -1, -0.9, -0.3, -1.5, 0, -2.2], ['Z']];
      const sx = p.size * p.spacing;
      grid(d, sx, sx * 1.1, (x, y) => {
        const rot = (p.tilt * r.range(-1, 1) * PI) / 180, s = p.size / 2, filled = r.chance(p.fill);
        d.shape(xf(u, { x, y, rot, s }), filled ? d.any() : 'bg');
        if (p.shine) d.stroke(xf(arc(0, 0, 0.62, 0.62, -0.2, 0.9), { x, y, rot, s }), 1, filled ? 'bg' : 'ink');
      }, sx / 2);
    },
  });

  // 40
  def({
    id: 'crossstitch', name: 'Cross Stitch', tags: ['texture', 'grid', 'woven'], fills: 3, palette: 'Plum Jam',
    params: [R('cell', 'Stitch size', 5, 30, 11), O('motif', 'Motif', ['symmetric', 'noise', 'scatter'], 'symmetric'), R('amount', 'Coverage', 0, 1, 0.45, 0.05), B('aida', 'Aida dots', true)],
    draw(d, p, r) {
      const c = p.cell, M = 14, motif = [];
      for (let j = 0; j < M / 2; j++) { motif.push([]); for (let i = 0; i < M / 2; i++) motif[j].push(r() < p.amount ? 1 + r.int(0, 2) : 0); }
      const at = (i, j) => {
        if (p.motif === 'scatter') return r() < p.amount * 0.6 ? 1 + r.int(0, 2) : 0;
        if (p.motif === 'noise') {
          const v = d.noise.fbm(i / 10, j / 10);
          return v > 0.35 - p.amount * 0.7 ? (v > 0.3 ? 2 : 1 + (v > 0.15 ? 2 : 0)) : 0;
        }
        let a = ((i % M) + M) % M, b = ((j % M) + M) % M;
        if (a >= M / 2) a = M - 1 - a;
        if (b >= M / 2) b = M - 1 - b;
        return motif[b][a];
      };
      grid(d, c, c, (x, y, i, j) => {
        const v = at(i, j);
        if (v) {
          const k = c * 0.18;
          d.stroke(join(line(x + k, y + k, x + c - k, y + c - k), line(x + c - k, y + k, x + k, y + c - k)), 1.6, 'f' + v);
        } else if (p.aida) d.solid(circle(x + c / 2, y + c / 2, 0.5));
      }, 0, 0);
    },
  });

  // 41
  def({
    id: 'orbits', name: 'Orbit Club', tags: ['celestial', 'scattered', 'playful'], fills: 3, palette: 'Night Sky',
    params: [R('size', 'System size', 14, 70, 34), R('density', 'Density', 0.2, 1, 0.8, 0.05), R('orbits', 'Orbits', 0, 3, 1), B('stars', 'Stardust', true)],
    draw(d, p, r) {
      for (const c of pack(d, { maxR: p.size, minR: p.size * 0.45, gap: 4 })) {
        if (!r.chance(p.density)) continue;
        const pr = c.r * 0.42, rot = r.range(-0.7, 0.7), ratio = r.range(0.25, 0.45), f = d.any();
        const rings = [];
        for (let k = 0; k < p.orbits; k++) rings.push(c.r * (0.7 + (0.3 * k) / Math.max(1, p.orbits)));
        for (const rx of rings) d.stroke(ellipse(c.x, c.y, rx, rx * ratio, rot), 0.8);
        d.shape(circle(c.x, c.y, pr), f);
        if (r.chance(0.4)) d.stroke(arc(c.x, c.y, pr * 0.8, pr * 0.8, PI * 0.15, PI * 0.55), 0.7);
        for (const rx of rings) {
          d.stroke(xf(arc(0, 0, rx, rx * ratio, 0, PI), { x: c.x, y: c.y, rot }), 0.8);
          const a = r.range(0, PI);
          d.shape(xf(circle(rx * Math.cos(a), rx * ratio * Math.sin(a), Math.max(1.5, c.r * 0.07)), { x: c.x, y: c.y, rot }), d.any(), 0.6);
        }
      }
      if (p.stars) for (let i = 0; i < (d.W * d.H) / 900; i++) d.solid(circle(r() * d.W, r() * d.H, r.range(0.4, 1.1)));
    },
  });

  // 42
  def({
    id: 'paisley', name: 'Paisley Drift', tags: ['ornate', 'organic', 'floral'], fills: 3, palette: 'Terracotta',
    params: [R('size', 'Paisley size', 30, 150, 64), R('inner', 'Inner outlines', 0, 4, 2), B('dotted', 'Dotted halo', true), B('mirror', 'Mirror randomly', true)],
    draw(d, p, r) {
      const U = [[0.55, -1.15], [0.2, -0.95], [-0.3, -0.6], [-0.58, -0.05], [-0.48, 0.48], [0, 0.72], [0.48, 0.52], [0.62, 0.05], [0.46, -0.42], [0.46, -0.8], [0.68, -1.02]];
      const cen = [0.02, 0.05];
      const scaled = (k) => U.map((q) => [cen[0] + (q[0] - cen[0]) * k, cen[1] + (q[1] - cen[1]) * k]);
      const sx = p.size * 1.25;
      grid(d, sx, sx * 0.9, (x, y) => {
        const rot = r.range(-0.7, 0.7), mir = p.mirror && r.chance(0.5) ? -1 : 1, s = p.size / 2;
        const T = (sh) => xf(xf(sh, { sx: mir, sy: 1 }), { x, y, rot, s });
        if (p.dotted) {
          const halo = scaled(1.22);
          for (let i = 0; i < halo.length; i++) {
            const a = halo[i], b = halo[(i + 1) % halo.length];
            for (let t = 0; t < 1; t += 0.34) d.solid(T(circle(lerp(a[0], b[0], t), lerp(a[1], b[1], t), 0.035)));
          }
        }
        d.shape(T(smooth(U, true)), d.any(), 1.1 / 1);
        for (let k = 1; k <= p.inner; k++) d.shape(T(smooth(scaled(1 - k * (0.6 / (p.inner + 1))), true)), k % 2 ? 'bg' : d.any(), 0.8);
        d.shape(T(circle(cen[0], cen[1] + 0.2, 0.12)), 'f3', 0.7);
        d.solid(T(circle(cen[0], cen[1] + 0.2, 0.04)));
      }, sx / 2);
    },
  });

  // 43
  def({
    id: 'riad', name: 'Riad Tiles', tags: ['ornate', 'geometric', 'grid'], fills: 3, palette: 'Ocean',
    params: [R('size', 'Tile size', 24, 120, 58), R('lobes', 'Lobe size', 0.6, 1.2, 0.95, 0.01), O('rot', 'Rotation', ['0°', '45°'], '0°'), B('stars', 'Corner stars', true), B('inner', 'Inner outline', true)],
    draw(d, p) {
      const s = p.size, a = s * 0.19, rot = p.rot === '45°' ? PI / 4 : 0;
      const quat = (cx, cy, k) => {
        const out = [];
        for (let q = 0; q < 4; q++) {
          const ang = rot + (q * PI) / 2;
          out.push(circle(cx + Math.cos(ang) * a * k, cy + Math.sin(ang) * a * k, a * p.lobes * k));
        }
        out.push(ngon(cx, cy, a * k * 1.02, 4, rot));
        return out;
      };
      grid(d, s, s, (x, y, i, j) => {
        const cx = x + s / 2, cy = y + s / 2;
        d.union(quat(cx, cy, 1), (i + j) & 1 ? 'f1' : 'f2', 1);
        if (p.inner) d.union(quat(cx, cy, 0.55), 'bg', 0.6);
        d.solid(circle(cx, cy, a * 0.18));
        if (p.stars) d.shape(star(x, y, s * 0.2, s * 0.07, 4, rot + PI / 4), 'f3', 0.8);
      });
    },
  });

  // 44
  def({
    id: 'moire', name: 'Moiré', tags: ['optical', 'minimal', 'radial'], fills: 3, palette: 'Ink Only',
    params: [R('spacing', 'Ring spacing', 3, 20, 6.5, 0.5), R('centers', 'Centres', 2, 3, 2), R('offset', 'Offset', 0, 200, 60), B('colored', 'Coloured centres', false)],
    draw(d, p) {
      const Rr = Math.hypot(d.W, d.H) / 2 + p.offset;
      for (let c = 0; c < p.centers; c++) {
        const a = (c * TAU) / p.centers - PI / 2, cx = d.W / 2 + Math.cos(a) * p.offset * 0.5, cy = d.H / 2 + Math.sin(a) * p.offset * 0.5;
        let path = [];
        for (let rr = p.spacing; rr < Rr; rr += p.spacing) path = path.concat(circle(cx, cy, rr));
        d.stroke(path, Math.min(1.2, p.spacing * 0.25), p.colored ? 'f' + (c + 1) : 'ink');
      }
    },
  });

  // 45
  def({
    id: 'bamboo', name: 'Bamboo Grove', tags: ['nature', 'lines', 'landscape'], fills: 3, palette: 'Sage Garden',
    params: [R('stalks', 'Stalks', 3, 20, 9), R('seg', 'Segment length', 20, 90, 52), R('leaves', 'Leaves', 0, 1, 0.5, 0.05), B('shade', 'Highlights', true)],
    draw(d, p, r) {
      const xs = [];
      for (let i = 0; i < p.stalks; i++) xs.push(((i + r.range(0.1, 0.9)) / p.stalks) * d.W);
      r.shuffle(xs);
      for (const x of xs) {
        const w = r.range(10, 20) * (d.W / 400) ** 0.3, f = r.pick(['f1', 'f2']), lean = r.range(-0.03, 0.03);
        for (let y = -r() * p.seg; y < d.H + 10; ) {
          const L = p.seg * r.range(0.8, 1.2), xx = x + lean * y;
          d.shape(rrect(xx - w / 2, y + 1.5, w, L - 3, w * 0.25), f, 0.9);
          if (p.shade) d.stroke(line(xx + w * 0.22, y + 6, xx + w * 0.22, y + L * 0.55), 0.6, 'bg');
          d.stroke(line(xx - w / 2 - 2, y + L, xx + w / 2 + 2, y + L), 1.1);
          if (r.chance(p.leaves)) {
            const side = r.sign();
            for (let k = 0; k < r.int(1, 3); k++) d.shape(leaf(xx + side * w * 0.4, y + L, p.seg * r.range(0.55, 0.85), 4, side > 0 ? r.range(-0.3, 0.5) : PI + r.range(-0.5, 0.3)), 'f3', 0.8);
          }
          y += L;
        }
      }
    },
  });

  // 46
  def({
    id: 'automata', name: 'Rule Weave', tags: ['tech', 'mosaic', 'geometric'], fills: 3, palette: 'Riso',
    params: [R('cell', 'Cell size', 4, 30, 10), O('rule', 'Rule', ['30', '45', '73', '90', '105', '110', '150', '182'], '90'), O('shape', 'Cell shape', ['square', 'circle', 'triangle', 'diamond'], 'square'), O('start', 'Start', ['random', 'single'], 'random'), B('outline', 'Outlines', false)],
    draw(d, p, r) {
      const c = p.cell, nx = Math.ceil(d.W / c) + 2, ny = Math.ceil(d.H / c) + 1, rule = parseInt(p.rule, 10);
      let row = new Uint8Array(nx);
      if (p.start === 'single') row[nx >> 1] = 1;
      else for (let i = 0; i < nx; i++) row[i] = r() < 0.5 ? 1 : 0;
      for (let j = 0; j < ny; j++) {
        const next = new Uint8Array(nx);
        for (let i = 0; i < nx; i++) {
          const l = row[(i - 1 + nx) % nx], m = row[i], rr = row[(i + 1) % nx], idx = (l << 2) | (m << 1) | rr;
          next[i] = (rule >> idx) & 1;
          if (!m) continue;
          const x = (i - 1) * c, y = j * c, f = d.cyc(idx), st = p.outline ? 'ink' : null;
          const sh = p.shape === 'circle' ? circle(x + c / 2, y + c / 2, c * 0.44) : p.shape === 'triangle' ? poly([[x + 0.5, y + c - 0.5], [x + c / 2, y + 0.5], [x + c - 0.5, y + c - 0.5]]) : p.shape === 'diamond' ? ngon(x + c / 2, y + c / 2, c * 0.52, 4) : rect(x + 0.4, y + 0.4, c - 0.8, c - 0.8);
          d.add(sh, { fill: f, stroke: st, w: 0.7 });
        }
        row = next;
      }
    },
  });

  // 47
  def({
    id: 'tangle', name: 'Tangle Quilt', tags: ['dense', 'ornate', 'grid'], fills: 3, palette: 'Sketchbook',
    params: [R('pieces', 'Pieces', 4, 40, 14), R('border', 'Gutter', 0, 14, 5, 0.5), R('scale', 'Motif scale', 0.5, 2, 1, 0.05), B('round', 'Rounded corners', true)],
    draw(d, p, r) {
      let rects = [[0, 0, d.W, d.H]];
      while (rects.length < p.pieces) {
        rects.sort((a, b) => b[2] * b[3] - a[2] * a[3]);
        const [x, y, w, h] = rects.shift(), t = r.range(0.32, 0.68);
        if (w > h) rects.push([x, y, w * t, h], [x + w * t, y, w * (1 - t), h]);
        else rects.push([x, y, w, h * t], [x, y + h * t, w, h * (1 - t)]);
      }
      const m = p.scale, g = p.border / 2;
      const motifs = ['dots', 'hatch', 'cross', 'circles', 'rings', 'waves', 'zigzag', 'checker', 'solid', 'scales', 'stars', 'bricks'];
      r.shuffle(motifs);
      rects.forEach(([x0, y0, w0, h0], idx) => {
        const x = x0 + g, y = y0 + g, w = w0 - 2 * g, h = h0 - 2 * g;
        if (w < 6 || h < 6) return;
        const kind = motifs[idx % motifs.length], rad = p.round ? Math.min(10, w / 4, h / 4) : 0;
        d.shape(rrect(x, y, w, h, rad), kind === 'solid' ? d.any() : 'bg', 1.1);
        const ix = x + 4, iy = y + 4, iw = w - 8, ih = h - 8;
        if (iw < 4 || ih < 4) return;
        if (kind === 'dots') for (let yy = iy + 4 * m; yy < iy + ih - 2; yy += 8 * m) for (let xx = ix + 4 * m; xx < ix + iw - 2; xx += 8 * m) d.solid(circle(xx, yy, 1.4 * m));
        else if (kind === 'hatch') d.stroke(hatch(rectPts(ix, iy, iw, ih), r.pick([PI / 4, -PI / 4, 0]), 4 * m), 0.7);
        else if (kind === 'cross') { d.stroke(hatch(rectPts(ix, iy, iw, ih), PI / 4, 6 * m), 0.6); d.stroke(hatch(rectPts(ix, iy, iw, ih), -PI / 4, 6 * m), 0.6); }
        else if (kind === 'circles') { const s = 13 * m; for (let yy = iy + s / 2; yy <= iy + ih - s / 2 + 0.1; yy += s) for (let xx = ix + s / 2; xx <= ix + iw - s / 2 + 0.1; xx += s) d.shape(circle(xx, yy, s * 0.36), d.any(), 0.7); }
        else if (kind === 'rings') for (let k = 0; k * 5 * m < Math.min(iw, ih) / 2 - 2; k++) d.stroke(rrect(ix + k * 5 * m, iy + k * 5 * m, iw - k * 10 * m, ih - k * 10 * m, Math.max(0, rad - k * 3)), 0.7);
        else if (kind === 'waves' || kind === 'zigzag') for (let yy = iy + 4 * m; yy < iy + ih - 3 * m; yy += 7 * m) {
          const pts = [];
          for (let xx = ix; xx <= ix + iw; xx += kind === 'waves' ? 2 : 4 * m) pts.push([xx, yy + (kind === 'waves' ? Math.sin(xx / (3 * m)) * 2.2 * m : ((Math.round((xx - ix) / (4 * m)) & 1) - 0.5) * 4 * m)]);
          d.stroke(poly(pts, false), 0.7);
        }
        else if (kind === 'checker') { const s = 7 * m; for (let yy = iy, a = 0; yy + s <= iy + ih + 0.1; yy += s, a++) for (let xx = ix, b = 0; xx + s <= ix + iw + 0.1; xx += s, b++) if ((a + b) & 1) d.solid(rect(xx, yy, s, s), (a + b) % 4 === 1 ? 'ink' : 'f2'); }
        else if (kind === 'solid') for (let k = 0; k < (iw * ih) / 300; k++) d.solid(circle(ix + r() * iw, iy + r() * ih, 1.1), 'bg');
        else if (kind === 'scales') { const s = 10 * m; for (let yy = iy, rw = 0; yy + s / 2 <= iy + ih; yy += s / 2, rw++) for (let xx = ix + s / 2 + (rw & 1 ? s / 2 : 0); xx + s / 2 <= ix + iw + 0.1; xx += s) d.stroke(arc(xx, yy, s / 2, s / 2, 0, PI), 0.7); }
        else if (kind === 'stars') { const s = 14 * m; for (let yy = iy + s / 2; yy <= iy + ih - s / 2 + 0.1; yy += s) for (let xx = ix + s / 2; xx <= ix + iw - s / 2 + 0.1; xx += s) d.shape(star(xx, yy, s * 0.4, s * 0.16, 5), 'f3', 0.6); }
        else { const bh = 6 * m, bw = 14 * m; for (let yy = iy, rw = 0; yy < iy + ih - 0.1; yy += bh, rw++) { d.stroke(line(ix, yy, ix + iw, yy), 0.6); for (let xx = ix + (rw & 1 ? bw / 2 : 0); xx < ix + iw; xx += bw) if (xx > ix) d.stroke(line(xx, yy, xx, Math.min(yy + bh, iy + ih)), 0.6); } }
      });
    },
  });

  // 48
  def({
    id: 'flow', name: 'Flow Field', tags: ['organic', 'lines', 'waves'], fills: 3, palette: 'Lagoon',
    params: [R('sep', 'Line spacing', 3, 20, 7, 0.5), R('scale', 'Swirl scale', 50, 400, 150), R('len', 'Max length', 20, 600, 220), R('curl', 'Curl', 0.2, 4, 1.4, 0.1), O('color', 'Colour', ['ink', 'fills', 'bands'], 'fills')],
    draw(d, p, r) {
      const sep = p.sep, cs = sep, nx = Math.ceil(d.W / cs) + 1, ny = Math.ceil(d.H / cs) + 1, cells = Array.from({ length: nx * ny }, () => []);
      const near = (x, y, lim, id) => {
        const i = Math.floor(x / cs), j = Math.floor(y / cs);
        for (let a = i - 1; a <= i + 1; a++) for (let b = j - 1; b <= j + 1; b++) {
          if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
          for (const q of cells[a + b * nx]) if (q[2] !== id && Math.hypot(q[0] - x, q[1] - y) < lim) return true;
        }
        return false;
      };
      const ang = (x, y) => d.noise.fbm(x / p.scale, y / p.scale, 2) * PI * p.curl * 2;
      let id = 0;
      const seeds = [];
      for (let y = sep / 2; y < d.H; y += sep * 1.5) for (let x = sep / 2; x < d.W; x += sep * 1.5) seeds.push([x + r.range(-1, 1) * sep, y + r.range(-1, 1) * sep]);
      r.shuffle(seeds);
      for (const [sx, sy] of seeds) {
        if (near(sx, sy, sep, -1)) continue;
        id++;
        const trace = (dir) => {
          const pts = [];
          let x = sx, y = sy;
          for (let s = 0; s < p.len / 2 / 2; s++) {
            const a = ang(x, y);
            x += Math.cos(a) * 2 * dir;
            y += Math.sin(a) * 2 * dir;
            if (x < -2 || y < -2 || x > d.W + 2 || y > d.H + 2 || near(x, y, sep * 0.55, id)) break;
            pts.push([x, y]);
          }
          return pts;
        };
        const pts = trace(-1).reverse().concat([[sx, sy]], trace(1));
        if (pts.length < 6) continue;
        for (const q of pts) { const i = Math.floor(q[0] / cs), j = Math.floor(q[1] / cs); if (i >= 0 && j >= 0 && i < nx && j < ny) cells[i + j * nx].push([q[0], q[1], id]); }
        const sparse = pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1);
        const slot = p.color === 'ink' ? 'ink' : p.color === 'bands' ? d.cyc(Math.floor(sy / (d.H / 6))) : d.any();
        d.stroke(smooth(sparse), p.color === 'ink' ? 1 : 1.5, slot);
      }
    },
  });

  // 49
  def({
    id: 'snowflakes', name: 'Snowfall', tags: ['celestial', 'radial', 'scattered'], fills: 3, palette: 'Blueprint',
    params: [R('size', 'Flake size', 10, 60, 26), R('density', 'Density', 0.2, 1, 0.75, 0.05), R('branches', 'Branches', 1, 4, 2), B('dots', 'Snow dots', true)],
    draw(d, p, r) {
      for (const c of pack(d, { maxR: p.size, minR: p.size * 0.4, gap: 6 })) {
        if (!r.chance(p.density)) continue;
        const R0 = c.r, rot = r() * TAU, tip = r.pick(['dot', 'diamond', 'fork', 'none']), bl = [];
        for (let b = 1; b <= p.branches; b++) bl.push([b / (p.branches + 1), r.range(0.2, 0.42) * (1 - (b / (p.branches + 2)) * 0.5)]);
        let arm = line(0, 0, R0, 0);
        for (const [t, L] of bl) arm = arm.concat(line(R0 * t, 0, R0 * t + R0 * L * 0.5, -R0 * L * 0.866), line(R0 * t, 0, R0 * t + R0 * L * 0.5, R0 * L * 0.866));
        if (tip === 'fork') arm = arm.concat(line(R0 * 0.85, 0, R0, -R0 * 0.12), line(R0 * 0.85, 0, R0, R0 * 0.12));
        let path = [];
        for (let k = 0; k < 6; k++) path = path.concat(xf(arm, { x: c.x, y: c.y, rot: rot + (k * PI) / 3 }));
        d.stroke(path, 1.1);
        d.shape(ngon(c.x, c.y, R0 * 0.16, 6, rot), d.any(), 0.8);
        for (let k = 0; k < 6 && tip !== 'none' && tip !== 'fork'; k++) {
          const a = rot + (k * PI) / 3, tx = c.x + Math.cos(a) * R0, ty = c.y + Math.sin(a) * R0;
          if (tip === 'dot') d.shape(circle(tx, ty, R0 * 0.07), d.any(), 0.6);
          else d.shape(ngon(tx, ty, R0 * 0.1, 4, a), d.any(), 0.6);
        }
      }
      if (p.dots) for (let i = 0; i < (d.W * d.H) / 1100; i++) d.solid(circle(r() * d.W, r() * d.H, r.range(0.6, 1.6)), r.chance(0.3) ? d.any() : 'ink');
    },
  });

  // 50
  def({
    id: 'coil', name: 'Telephone Cord', tags: ['curvy', 'playful', 'lines'], fills: 3, palette: 'Riso',
    params: [R('loop', 'Loop size', 3, 30, 12), R('speed', 'Stretch', 0.5, 5, 1.6, 0.1), R('coils', 'Cords', 1, 6, 3), R('length', 'Cord length', 500, 8000, 3000, 100), O('color', 'Colour', ['fills', 'ink'], 'fills')],
    draw(d, p, r) {
      for (let c = 0; c < p.coils; c++) {
        let x = r.range(0.2, 0.8) * d.W, y = r.range(0.2, 0.8) * d.H, h = r() * TAU;
        const pts = [], om = 0.35, ph = r() * TAU, nOff = r() * 100;
        for (let t = 0; t < p.length; t++) {
          h += d.noise(t / 180 + nOff, c * 5) * 0.06;
          const mx = 30 + p.loop;
          if (x < mx || x > d.W - mx || y < mx || y > d.H - mx) {
            const want = Math.atan2(d.H / 2 - y, d.W / 2 - x);
            let diff = want - h;
            while (diff > PI) diff -= TAU;
            while (diff < -PI) diff += TAU;
            h += diff * 0.05;
          }
          x += Math.cos(h) * p.speed * 0.5;
          y += Math.sin(h) * p.speed * 0.5;
          if (t % 2 === 0) pts.push([x + p.loop * Math.cos(t * om + ph), y + p.loop * Math.sin(t * om + ph)]);
        }
        d.stroke(poly(pts, false), 1.7, p.color === 'ink' ? 'ink' : d.cyc(c));
      }
    },
  });

  // 51
  def({
    id: 'stipple', name: 'Stipple Glow', tags: ['dots', 'texture', 'minimal'], fills: 3, palette: 'Ink Only',
    params: [R('dot', 'Dot size', 0.5, 4, 1.3, 0.1), R('density', 'Density', 0.2, 1, 0.7, 0.05), O('gradient', 'Gradient', ['radial', 'linear', 'noise', 'waves'], 'noise'), R('contrast', 'Contrast', 0.5, 3, 1.6, 0.1), B('colored', 'Coloured dots', false)],
    draw(d, p, r) {
      const cx = d.W / 2, cy = d.H / 2, M = Math.hypot(cx, cy);
      const g = (x, y) => {
        const v = p.gradient === 'radial' ? 1 - Math.hypot(x - cx, y - cy) / M : p.gradient === 'linear' ? 1 - y / d.H : p.gradient === 'noise' ? d.noise.fbm(x / 150, y / 150, 3) * 1.6 + 0.5 : (Math.sin(x / 40) + Math.sin(y / 55 + x / 90) + 2) / 4;
        return Math.max(0, Math.min(1, v));
      };
      const N = Math.min(15000, Math.floor(((d.W * d.H) / (p.dot * p.dot * 5)) * p.density));
      const groups = {};
      for (let i = 0; i < N; i++) {
        const x = r() * d.W, y = r() * d.H;
        if (r() > Math.pow(g(x, y), p.contrast)) continue;
        const slot = p.colored ? d.any() : 'ink';
        (groups[slot] = groups[slot] || []).push(...circle(x, y, p.dot * r.range(0.7, 1.2)));
      }
      for (const k in groups) d.solid(groups[k], k);
    },
  });

  DB.PATTERNS = P;
  DB.patternById = (id) => P.find((x) => x.id === id);
  DB.TAGS = [...new Set(P.flatMap((x) => x.tags))].sort();
})();
