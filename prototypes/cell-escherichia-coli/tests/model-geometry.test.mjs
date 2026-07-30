import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadThree() {
  try {
    return await import("three");
  } catch {
    return import("../../interactive-specimen/node_modules/three/build/three.module.js");
  }
}

const THREE = await loadThree();
const source = await readFile(new URL("../src/model-geometry.js", import.meta.url), "utf8");
const {
  ECOLI_GEOMETRY_CONTRACT,
  auditEColiGeometry,
  computeEColiGeometryMetrics,
  createEColiGeometry,
  createSpherocylinderGeometry,
} = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

test("builds a volumetric rod with all canonical semantic parts", () => {
  const model = createEColiGeometry(THREE, { detailLevel: "mobile" });
  const audit = auditEColiGeometry(THREE, model.root);

  assert.equal(audit.passed, true, audit.failures.join(", "));
  assert.deepEqual(audit.missingSemanticParts, []);
  assert.ok(audit.metrics.bounds.width > audit.metrics.bounds.height * 2, "E. coli should read as a rod, not a sphere");
  assert.ok(audit.metrics.bounds.depth >= 2, "the cell body must have meaningful front-to-back volume");
  assert.ok(audit.metrics.distinctDepthPlanes > 20, "the cell must not be a shallow extrusion");
  assert.equal(audit.metrics.meshCount, audit.metrics.namedMeshCount);
  model.dispose();
});

test("keeps envelope surfaces nested and independently peelable", () => {
  const model = createEColiGeometry(THREE, { detailLevel: "mobile" });
  let priorRadius = Infinity;
  let priorLength = Infinity;

  for (const id of ECOLI_GEOMETRY_CONTRACT.envelopeParts) {
    const part = model.nodes[id];
    const shape = part.children[0].geometry.userData.shape;
    assert.equal(part.userData.peelable, true);
    assert.ok(shape.radius < priorRadius, `${id} radius must nest inside the previous layer`);
    assert.ok(shape.totalLength < priorLength, `${id} length must nest inside the previous layer`);
    priorRadius = shape.radius;
    priorLength = shape.totalLength;
  }
  assert.equal(model.root.userData.crossSection.axis, "z");
  assert.equal(model.root.userData.crossSection.clipCapRequired, true);
  model.dispose();
});

test("exposes one stable runtime definition for isolate and explode controls", () => {
  const model = createEColiGeometry(THREE, { detailLevel: "mobile" });

  assert.deepEqual(model.root.userData.semanticParts, [...ECOLI_GEOMETRY_CONTRACT.semanticParts]);
  assert.strictEqual(model.root.userData.sculptRuntime.nodes, model.nodes);
  assert.strictEqual(model.root.userData.sculptRuntime.sockets, model.anchors);
  for (const id of ECOLI_GEOMETRY_CONTRACT.semanticParts) {
    assert.ok(model.nodes[id], `missing semantic node ${id}`);
    assert.equal(model.nodes[id].userData.isolatable ?? model.nodes[id].userData.peelable, true);
    assert.equal(model.anchors[id].userData.semanticId, id);
  }
  model.dispose();
});

test("is deterministic for the same seed and changes stochastic placements for another seed", () => {
  const first = createEColiGeometry(THREE, { detailLevel: "quality", seed: 91 });
  const second = createEColiGeometry(THREE, { detailLevel: "quality", seed: 91 });
  const third = createEColiGeometry(THREE, { detailLevel: "quality", seed: 92 });
  const firstMatrix = [...first.nodes.ribosomes.children[0].instanceMatrix.array];
  const secondMatrix = [...second.nodes.ribosomes.children[0].instanceMatrix.array];
  const thirdMatrix = [...third.nodes.ribosomes.children[0].instanceMatrix.array];

  assert.deepEqual(computeEColiGeometryMetrics(THREE, first.root), computeEColiGeometryMetrics(THREE, second.root));
  assert.deepEqual(firstMatrix, secondMatrix);
  assert.notDeepEqual(firstMatrix, thirdMatrix);
  assert.ok(first.metrics.triangles < 250_000);
  first.dispose();
  second.dispose();
  third.dispose();
});

test("produces an X-axis spherocylinder and validates inputs", () => {
  const geometry = createSpherocylinderGeometry(THREE, 6.2, 1, 16, 8);
  geometry.computeBoundingBox();
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x - 6.2) < 0.01);
  assert.ok(Math.abs(size.y - 2) < 0.01);
  assert.throws(() => createSpherocylinderGeometry(THREE, 2, 1), /must exceed/);
  geometry.dispose();
});

test("does not dispose caller-owned materials and rejects invalid configuration", () => {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  let disposed = false;
  material.addEventListener("dispose", () => { disposed = true; });
  const materials = Object.fromEntries(ECOLI_GEOMETRY_CONTRACT.materialKeys.map((key) => [key, material]));
  const model = createEColiGeometry(THREE, { materials, detailLevel: "mobile" });
  model.dispose();
  assert.equal(disposed, false);
  assert.throws(() => createEColiGeometry(THREE, { detailLevel: "cinematic" }), /Unknown E\. coli detail level/);
  assert.throws(() => createEColiGeometry(THREE, { seed: 1.25 }), /seed must be an integer/);
  material.dispose();
});
