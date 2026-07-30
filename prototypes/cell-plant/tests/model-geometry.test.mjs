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
const geometrySource = await readFile(new URL("../src/model-geometry.js", import.meta.url), "utf8");
const {
  PLANT_CELL_GEOMETRY_CONTRACT,
  auditPlantCellGeometry,
  computePlantCellGeometryMetrics,
  createPlantCellGeometry,
} = await import(`data:text/javascript;base64,${Buffer.from(geometrySource).toString("base64")}`);

test("builds a named, genuinely volumetric plant-cell cross-section", () => {
  const model = createPlantCellGeometry(THREE, { detailLevel: "mobile" });
  const audit = auditPlantCellGeometry(THREE, model.root);

  assert.equal(audit.passed, true, audit.failures.join(", "));
  assert.ok(audit.metrics.bounds.depth >= 2, "the specimen must retain meaningful front-to-back depth");
  assert.ok(audit.metrics.distinctDepthPlanes > 20, "curved organelles must not collapse into an extruded slab");
  assert.equal(audit.metrics.meshCount, audit.metrics.namedMeshCount);
  assert.deepEqual(audit.missingSemanticParts, []);
  assert.equal(model.root.userData.crossSection.open, true);
  assert.equal(model.root.userData.crossSection.openingDirection, "+Z");
  model.dispose();
});

test("exposes stable semantic nodes and hotspot anchors for integration", () => {
  const model = createPlantCellGeometry(THREE, { detailLevel: "mobile" });

  for (const id of PLANT_CELL_GEOMETRY_CONTRACT.semanticParts) {
    assert.ok(model.nodes[id], `missing runtime node ${id}`);
  }
  for (const id of ["cell-wall", "cell-membrane", "central-vacuole", "nucleus", "nuclear-envelope", "chloroplasts", "mitochondria", "golgi-apparatus", "peroxisome", "plasmodesmata"]) {
    assert.equal(model.anchors[id].userData.semanticId, id);
    assert.ok(model.anchors[id].name.startsWith("hotspot."));
  }
  assert.strictEqual(model.root.userData.sculptRuntime.nodes, model.nodes);
  assert.strictEqual(model.root.userData.sculptRuntime.sockets, model.anchors);
  model.dispose();
});

test("models requested hotspot structures as visible volumetric geometry", () => {
  const model = createPlantCellGeometry(THREE, { detailLevel: "mobile" });

  for (const id of ["nuclear-envelope", "peroxisome", "plasmodesmata"]) {
    const node = model.nodes[id];
    const bounds = new THREE.Box3().setFromObject(node);
    const size = bounds.getSize(new THREE.Vector3());
    let meshCount = 0;
    node.traverse((child) => { if (child.isMesh) meshCount += 1; });
    assert.ok(meshCount > 0, `${id} must own visible geometry`);
    assert.ok(size.x > 0.08 && size.y > 0.08 && size.z > 0.08, `${id} must have three-axis volume`);
    assert.strictEqual(model.anchors[id].userData.semanticId, id);
  }
  assert.equal(model.nodes["nuclear-envelope"].userData.attachment.parentId, "nucleus");
  assert.equal(model.nodes.peroxisome.userData.attachment.parentId, "cytoplasm");
  assert.equal(model.nodes.plasmodesmata.userData.attachment.parentId, "cell-wall");
  model.dispose();
});

test("produces deterministic metrics without random geometry", () => {
  const first = createPlantCellGeometry(THREE, { detailLevel: "quality" });
  const second = createPlantCellGeometry(THREE, { detailLevel: "quality" });

  assert.deepEqual(computePlantCellGeometryMetrics(THREE, first.root), computePlantCellGeometryMetrics(THREE, second.root));
  assert.ok(first.metrics.triangles < 250_000, "quality geometry must remain below the Kitabu mobile hard ceiling");
  assert.equal(first.metrics.meshCount, first.metrics.namedMeshCount);
  first.dispose();
  second.dispose();
});

test("supports caller-owned materials and does not dispose them", () => {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  let disposed = false;
  material.addEventListener("dispose", () => { disposed = true; });
  const materials = Object.fromEntries(PLANT_CELL_GEOMETRY_CONTRACT.materialKeys.map((key) => [key, material]));
  const model = createPlantCellGeometry(THREE, materials, { detailLevel: "mobile" });

  model.dispose();
  assert.equal(disposed, false);
  material.dispose();
});

test("rejects unsupported detail levels explicitly", () => {
  assert.throws(
    () => createPlantCellGeometry(THREE, { detailLevel: "cinematic" }),
    /Unknown plant-cell detail level/,
  );
});
