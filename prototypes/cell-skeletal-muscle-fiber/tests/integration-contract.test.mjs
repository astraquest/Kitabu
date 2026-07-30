import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../", import.meta.url);

test("one-screen mobile document exposes core learning controls", async () => {
  const html = await readFile(new URL("index.html", base), "utf8");
  for (const mode of ["longitudinal", "cross-section", "explode"]) {
    assert.match(html, new RegExp(`data-mode=["']${mode}["']`));
  }
  assert.match(html, /contraction-toggle/);
  assert.match(html, /layer-select/);
  assert.match(html, /width=device-width/);
  assert.match(html, /Model limits/);
});

test("runtime integrates independently owned modules and deterministic metrics", async () => {
  const source = await readFile(new URL("src/main.js", base), "utf8");
  for (const module of ["model-geometry.js", "model-materials.js", "hotspots.js", "activity-definitions.js"]) {
    assert.match(source, new RegExp(module.replace(".", "\\.")));
  }
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /__MUSCLE_FIBER_DEBUG__/);
  assert.match(source, /renderer\.info\.render\.triangles/);
});

test("styles constrain the 390 by 844 experience to one screen", async () => {
  const css = await readFile(new URL("styles.css", base), "utf8");
  assert.match(css, /height:\s*100svh/);
  assert.match(css, /max-width:\s*720px/);
  assert.match(css, /prefers-reduced-motion/);
});
