# Doodlebook

A generative sketchbook: **51 doodle patterns** you can tune, recolour, save, and print on standard paper sizes. It's a static web app with no build step and no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder (for example `python3 -m http.server`) and visit `http://localhost:8000`. It also works on GitHub Pages as is.

## What's inside

- **Library.** 51 patterns in many styles (geometric, organic, floral, optical, maze, woven, celestial, and more). Filter them by search or by 25 style keywords (match any or match all), and preview the whole library in any palette.
- **Editor.** Every pattern has its own knobs. Every pattern also shares scale, line weight, a *hand-drawn wobble*, and a reproducible random seed (press `R` to reroll). There's a strip of random **variations** to try, a **Surprise** button, and **share links** that recreate an exact doodle.
- **Colour.**
  - Four **magic wands**: Monochrome, High contrast, Pastel, and Colouring page. Wave one again to get a different palette.
  - Manual colour pickers for paper, ink, and each fill slot.
  - Paste any text that contains hex codes, and the colours get randomly shuffled onto the slots. Optionally the lightest goes to the paper and the darkest to the ink.
  - Fills can be applied *by shape role* or *scattered randomly*, and there are 13 preset palettes.
- **Print and export.** Paper sizes are A5, A4, A3, B5, US Letter, US Legal, Tabloid, and a 20 cm square, in portrait or landscape, with an adjustable margin and an optional frame.
  - **Print** sets the page size for you.
  - **PDF** is true vector output from a built-in writer.
  - **SVG** and 300 dpi **PNG** downloads are also available.
- **My sketchbook.** Saved doodles are kept in localStorage. You can print all of them, or export them all as one multi-page PDF.

## Code map

| File | Purpose |
| --- | --- |
| `js/engine.js` | Seeded RNG, Perlin noise, vector shape helpers, circle packing, marching squares, the wobble post-process, and SVG rendering |
| `js/patterns.js` | The pattern library. Each pattern declares `params`, `tags`, a default palette, and a `draw(d, p, r)` function |
| `js/palettes.js` | Colour utilities, preset palettes, magic wands, and hex-code parsing and assignment |
| `js/pdf.js` | Paper sizes, page layout, and a small dependency-free PDF writer |
| `js/app.js` | The UI: library, editor, colour tools, print and export, and saved doodles |

Patterns draw with colour *slots* (`bg`, `ink`, `f1`…`fN`) rather than actual colours. That's why one drawing can be recoloured instantly and written to SVG or PDF with the same geometry.

### Adding a pattern

```js
def({
  id: 'my-pattern', name: 'My Pattern', tags: ['geometric', 'grid'], fills: 3, palette: 'Riso',
  params: [R('size', 'Tile size', 10, 80, 30)],
  draw(d, p, r) {
    grid(d, p.size, p.size, (x, y) => d.shape(circle(x, y, p.size * 0.4), d.any()));
  },
});
```
