/* Colour utilities, preset palettes and the "magic wands". */
(function () {
  'use strict';
  const DB = window.DB;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  }
  function hsl(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    const f = (n) => {
      const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return rgbToHex(f(0) * 255, f(8) * 255, f(4) * 255);
  }
  function toHsl(hex) {
    let [r, g, b] = hexToRgb(hex).map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  DB.color = { hsl, toHsl, luminance, hexToRgb, rgbToHex };

  DB.PALETTES = [
    { name: 'Sketchbook', bg: '#fbf7ef', ink: '#2b2a28', fills: ['#f2b880', '#9fc5b8', '#e9897e', '#f6d776', '#a7b7e0'] },
    { name: 'Riso', bg: '#f5f0e6', ink: '#1d3b8b', fills: ['#ff5c8a', '#ffd23f', '#00a6a6', '#1d3b8b', '#ffffff'] },
    { name: 'Terracotta', bg: '#f3e9dc', ink: '#3d2c22', fills: ['#c8553d', '#f28f3b', '#588b8b', '#ffd5c2', '#2d3047'] },
    { name: 'Sage Garden', bg: '#f4f1e8', ink: '#2f3e2e', fills: ['#8da47e', '#e7b98f', '#c9d6b8', '#5f7a61', '#f1e3c8'] },
    { name: 'Night Sky', bg: '#1b1f3b', ink: '#f4e9cd', fills: ['#f7c548', '#6a7bd1', '#e4572e', '#2e3a6b', '#a3c4f3'] },
    { name: 'Bubblegum', bg: '#fff5f8', ink: '#3a2e39', fills: ['#ff8fab', '#a0e7e5', '#fbe7c6', '#b4f8c8', '#ffc2d1'] },
    { name: 'Ocean', bg: '#eef6f7', ink: '#0b3c49', fills: ['#1b6a7b', '#a7d7c5', '#f2c57c', '#5fb3b3', '#ef8354'] },
    { name: 'Citrus', bg: '#fffbef', ink: '#2e2a24', fills: ['#ff9f1c', '#2ec4b6', '#ffbf69', '#e71d36', '#cbf3f0'] },
    { name: 'Blueprint', bg: '#1f4e8c', ink: '#eaf2ff', fills: ['#2b64ae', '#8fb3e8', '#163b6b', '#eaf2ff', '#3c7ac9'] },
    { name: 'Autumn', bg: '#faf3e3', ink: '#3b2417', fills: ['#b5451b', '#e09f3e', '#9e2a2b', '#fff3b0', '#540b0e'] },
    { name: 'Ink Only', bg: '#fcfcfa', ink: '#161616', fills: ['#161616', '#fcfcfa', '#9b9b9b', '#d6d6d2', '#4a4a4a'] },
    { name: 'Lagoon', bg: '#f2f7f2', ink: '#1f2d3d', fills: ['#3d9970', '#ffdc73', '#83c5be', '#ff6b6b', '#e8f1d8'] },
    { name: 'Plum Jam', bg: '#fbf3f5', ink: '#2a1a2e', fills: ['#7b2d55', '#e8a0bf', '#f6c667', '#4c6085', '#f3d9e3'] },
  ];

  DB.paletteByName = (n) => DB.PALETTES.find((p) => p.name === n) || DB.PALETTES[0];
  DB.clonePalette = (p) => ({ bg: p.bg, ink: p.ink, fills: p.fills.slice(), mode: 'role', coloring: false });

  /* ---------- magic wands: each wave produces a fresh palette ---------- */
  DB.WANDS = [
    {
      id: 'mono',
      name: 'Monochrome',
      hint: 'one hue, many shades',
      make(r) {
        const h = r() * 360, s = r.range(0.3, 0.65);
        const ls = [0.46, 0.8, 0.62, 0.3, 0.9];
        return { bg: hsl(h, s * 0.45, 0.965), ink: hsl(h, s * 0.7, 0.14), fills: ls.map((l) => hsl(h + r.range(-6, 6), s, l)), mode: 'role', coloring: false };
      },
    },
    {
      id: 'contrast',
      name: 'High contrast',
      hint: 'bold & punchy',
      make(r) {
        const h = r() * 360, dark = r.chance(0.4);
        const scheme = r.pick([[0, 180, 30, 210], [0, 120, 240, 60], [0, 150, 210, 30]]);
        const fills = scheme.map((o, i) => hsl(h + o, r.range(0.75, 0.95), i % 2 ? 0.62 : 0.5));
        fills.splice(2, 0, dark ? '#ffffff' : '#111111');
        return { bg: dark ? hsl(h + 200, 0.3, 0.08) : '#ffffff', ink: dark ? '#ffffff' : '#0d0d0d', fills, mode: 'role', coloring: false };
      },
    },
    {
      id: 'pastel',
      name: 'Pastel',
      hint: 'soft & dreamy',
      make(r) {
        const h0 = r() * 360, step = r.range(50, 90);
        const fills = [0, 1, 2, 3, 4].map((i) => hsl(h0 + i * step + r.range(-10, 10), r.range(0.55, 0.8), r.range(0.8, 0.88)));
        return { bg: hsl(h0 + 30, 0.5, 0.975), ink: hsl(h0 + 200, 0.18, 0.32), fills: r.shuffle(fills), mode: 'role', coloring: false };
      },
    },
    {
      id: 'coloring',
      name: 'Colouring page',
      hint: 'line art, ready for crayons',
      make() {
        return { bg: '#ffffff', ink: '#111111', fills: ['#ffffff'], mode: 'role', coloring: true };
      },
    },
  ];

  /* pull hex codes out of any text */
  DB.parseColors = function (text) {
    const out = [];
    const re = /#?\b([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
    let m;
    while ((m = re.exec(text))) {
      let h = m[1].toLowerCase();
      if (h.length === 3) h = h.split('').map((c) => c + c).join('');
      out.push('#' + h);
    }
    return out;
  };

  /* shuffle a list of colours onto the paper / ink / fill slots */
  DB.assignColors = function (list, smart, r) {
    list = list.slice();
    if (list.length === 1) list.push(luminance(list[0]) > 0.4 ? '#1a1a1a' : '#ffffff');
    if (smart) {
      const sorted = list.slice().sort((a, b) => luminance(b) - luminance(a));
      const bg = sorted[0], ink = sorted[sorted.length - 1];
      let rest = sorted.slice(1, -1);
      if (!rest.length) rest = [ink, bg];
      return { bg, ink, fills: r.shuffle(rest), mode: 'role', coloring: false };
    }
    r.shuffle(list);
    const fills = list.length > 2 ? list.slice(2) : list.slice();
    return { bg: list[0], ink: list[1], fills, mode: 'role', coloring: false };
  };
})();
