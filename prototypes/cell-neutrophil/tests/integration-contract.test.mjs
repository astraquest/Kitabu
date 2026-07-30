import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../", import.meta.url);

test("mobile-first document exposes every learning view", async () => {
  const html = await readFile(new URL("index.html", base), "utf8");
  for (const mode of ["explore", "transparent", "cross-section", "explode"]) {
    assert.match(html, new RegExp(`data-mode=["']${mode}["']`));
  }
  assert.match(html, /width=device-width/);
  assert.match(html, /Model limits/);
});

test("runtime honours reduced motion and exposes deterministic metrics", async () => {
  const source = await readFile(new URL("src/main.js", base), "utf8");
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /__NEUTROPHIL_DEBUG__/);
  assert.match(source, /renderer\.info\.render\.triangles/);
});

test("prototype imports separately owned geometry, materials and learning content", async () => {
  const source = await readFile(new URL("src/main.js", base), "utf8");
  assert.match(source, /model-geometry\.js/);
  assert.match(source, /model-materials\.js/);
  assert.match(source, /hotspots\.js/);
});
