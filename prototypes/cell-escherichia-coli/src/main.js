import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createEColiGeometry } from "./model-geometry.js";
import { createEColiMaterials, applyVisualizationMode } from "./model-materials.js";
import { HOTSPOTS } from "./hotspots.js";
import "../styles.css";

const canvas = document.querySelector("#cell-canvas");
const viewer = document.querySelector("#viewer");
const loading = document.querySelector("#loading");
const hotspotLayer = document.querySelector("#hotspot-layer");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const isolateButton = document.querySelector("#isolate-part");
const detailKicker = document.querySelector("#detail-kicker");
const detailTitle = document.querySelector("#detail-title");
const detailCopy = document.querySelector("#detail-copy");
const runtimeStatus = document.querySelector("#runtime-status");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, .05, 60);
camera.position.set(0, 2.8, 8.8);
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
scene.add(new THREE.HemisphereLight(0xd8ffe9, 0x11241b, 2.5));
const key = new THREE.DirectionalLight(0xffffff, 3.5); key.position.set(5, 6, 7); scene.add(key);
const rim = new THREE.DirectionalLight(0x83ffc4, 2); rim.position.set(-5, 1, -4); scene.add(rim);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !reducedMotion; controls.enablePan = false; controls.minDistance = 4; controls.maxDistance = 16;
const materials = createEColiMaterials(THREE);
const model = createEColiGeometry(THREE, { materials });
const root = model.root ?? model;
if (!root?.isObject3D) throw new TypeError("createEColiGeometry must return a Three.js Object3D or { root }.");
scene.add(root);

let activeMode = "explore";
let selectedHotspot = null;
const markers = [];
const projected = new THREE.Vector3();

function setMode(mode, partId = selectedHotspot?.semanticPartId ?? null) {
  activeMode = mode;
  applyVisualizationMode(root, materials, mode, partId, { reducedMotion });
  modeButtons.forEach((button) => { const active = button.dataset.mode === mode; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); });
  runtimeStatus.textContent = `${mode.replace("-", " ")} view · ${reducedMotion ? "reduced motion" : "subtle motion"}`;
}

function selectHotspot(record, button) {
  selectedHotspot = record;
  markers.forEach((entry) => entry.button.classList.toggle("is-active", entry.record.id === record.id));
  detailKicker.textContent = record.category ?? "Cell structure";
  detailTitle.textContent = record.title ?? record.label;
  detailCopy.textContent = record.summary ?? record.copy ?? record.description;
  isolateButton.disabled = false;
  isolateButton.textContent = `Isolate ${String(record.label ?? record.title).toLowerCase()}`;
  if (activeMode === "isolate") setMode("isolate", record.semanticPartId);
}

HOTSPOTS.forEach((record, index) => {
  const button = document.createElement("button"); button.type = "button"; button.className = "hotspot"; button.textContent = record.marker ?? String(index + 1);
  button.setAttribute("aria-label", `Learn about ${record.label ?? record.title}`); button.addEventListener("click", () => selectHotspot(record, button)); hotspotLayer.append(button);
  markers.push({ record, button, local: new THREE.Vector3(...(record.position ?? [0, 0, 0])) });
});

function updateMarkers() {
  const bounds = viewer.getBoundingClientRect();
  markers.forEach((marker) => { projected.copy(marker.local); root.localToWorld(projected); projected.project(camera); const visible = projected.z > -1 && projected.z < 1; marker.button.hidden = !visible; if (visible) { marker.button.style.left = `${(projected.x * .5 + .5) * bounds.width}px`; marker.button.style.top = `${(-projected.y * .5 + .5) * bounds.height}px`; } });
}
function resize() { const { width, height } = viewer.getBoundingClientRect(); renderer.setSize(Math.max(1, width), Math.max(1, height), false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); }
modeButtons.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
isolateButton.addEventListener("click", () => setMode(activeMode === "isolate" ? "explore" : "isolate"));
document.querySelector("#reset-view").addEventListener("click", () => { camera.position.set(0, 2.8, 8.8); controls.target.set(0, 0, 0); controls.update(); setMode("explore"); });
addEventListener("resize", resize, { passive: true });
const clock = new THREE.Clock();
function frame() { requestAnimationFrame(frame); if (!reducedMotion && activeMode === "explore") root.rotation.y = Math.sin(clock.getElapsedTime() * .24) * .07; controls.update(); updateMarkers(); renderer.render(scene, camera); }
resize(); setMode("explore"); loading.classList.add("is-hidden"); frame();
window.__ECOLI_DEBUG__ = { getMode: () => activeMode, getSemanticIds: () => root.userData?.semanticParts ?? [], getRendererMetrics: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries }) };
