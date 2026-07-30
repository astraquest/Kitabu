import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = new URL("../", import.meta.url);

test("mobile-first document exposes every learning view and scientific limits", async () => {
  const html = await readFile(new URL("index.html", base), "utf8");
  for (const mode of ["explore", "peel", "cross-section", "explode"]) assert.match(html, new RegExp(`data-mode=["']${mode}["']`));
  assert.match(html, /width=device-width/);
  assert.match(html, /no nucleus or membrane-bound organelles/i);
  assert.match(html, /vary by strain and conditions/i);
  assert.match(html, /Synthetic reference views are hypotheses/i);
});

test("runtime honors reduced motion and exposes deterministic metrics", async () => {
  const source = await readFile(new URL("src/main.js", base), "utf8");
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /__ECOLI_DEBUG__/);
  assert.match(source, /renderer\.info\.render\.triangles/);
});

test("prototype integrates separately owned geometry, materials, and learning content", async () => {
  const source = await readFile(new URL("src/main.js", base), "utf8");
  for (const module of ["model-geometry.js", "model-materials.js", "hotspots.js"]) assert.match(source, new RegExp(module.replace(".", "\\.")));
});
