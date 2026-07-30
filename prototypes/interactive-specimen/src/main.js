import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as modelModule from "./butterfly-model.js";
import * as hotspotModule from "./hotspots.js";
import { ACTIVITY_DEFINITIONS, SPECIMEN_COMPONENT, getActivityDefinition } from "./activity-definitions.js";
import { createActivityRuntime } from "./activity-runtime.js";
import { gradeHotspotSelection } from "./demo-grading-service.js";
import "../styles.css";

const canvas = document.querySelector("#specimen-canvas");
const viewer = document.querySelector("#viewer");
const loadingState = document.querySelector("#loading-state");
const loadingMessage = document.querySelector("#loading-message");
const hotspotLayer = document.querySelector("#hotspot-layer");
const detailPanel = document.querySelector("#detail-panel");
const detailIndex = document.querySelector("#detail-index");
const detailTitle = document.querySelector("#detail-title");
const detailCopy = document.querySelector("#detail-copy");
const detailMeta = document.querySelector("#detail-meta");
const panelClose = document.querySelector("#panel-close");
const status = document.querySelector("#view-status");
const gestureHint = document.querySelector("#gesture-hint");
const specimenFallback = document.querySelector("#specimen-fallback");
const fallbackAnnotations = document.querySelector("#fallback-annotations");
const fallbackAnnotationList = document.querySelector("#fallback-annotation-list");
const specimenCard = document.querySelector("#specimen-card");
const activityTabs = document.querySelector("#activity-tabs");
const activityEyebrow = document.querySelector("#activity-eyebrow");
const activityPurpose = document.querySelector("#activity-purpose");
const activityPrompt = document.querySelector("#activity-prompt");
const activityInstructions = document.querySelector("#activity-instructions");
const activityWorkspace = document.querySelector("#activity-workspace");
const activityFeedback = document.querySelector("#activity-feedback");
const latestEvent = document.querySelector("#latest-event");
const expandButton = document.querySelector("#expand-card");
const expandLabel = document.querySelector("#expand-label");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionEnabled = !prefersReducedMotion;
let activeHotspotId = null;
let specimen = null;
let hotspotRecords = getHotspotRecords();
let activeActivity = ACTIVITY_DEFINITIONS[0];
let activityRuntime = null;
let activityState = null;
let componentReady = false;
const activityEvents = [];
const screenHotspotWorldPosition = new THREE.Vector3();

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xe9e2d2, 0.035);

const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
const DEFAULT_CAMERA = new THREE.Vector3(0, 0.25, 6.2);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.05, 0);
camera.position.copy(DEFAULT_CAMERA);

function revealStaticFallback(message = "Interactive 3D is unavailable; showing the illustrated specimen") {
  loadingState.classList.add("is-error");
  loadingMessage.textContent = message;
  specimenFallback.hidden = false;
  canvas.hidden = true;
  hotspotLayer.hidden = true;
  hotspotRecords = getHotspotRecords();
  renderFallbackAnnotations(hotspotRecords);
  fallbackAnnotations.hidden = false;
  status.textContent = "Illustrated fallback";
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (error) {
  revealStaticFallback();
  throw error;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 3.4;
controls.maxDistance = 9.2;
controls.minPolarAngle = Math.PI * 0.18;
controls.maxPolarAngle = Math.PI * 0.82;
controls.target.copy(DEFAULT_TARGET);

const hemiLight = new THREE.HemisphereLight(0xfff7e6, 0x6d7158, 2.2);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffe8c5, 4.1);
keyLight.position.set(4.5, 6, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 18;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xc9d8c7, 2.4);
rimLight.position.set(-5, 1.5, -3.5);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xd47a4e, 1.35, 14);
fillLight.position.set(2.5, -2.5, 3);
scene.add(fillLight);

const clock = new THREE.Clock();
const frameDurations = new Float32Array(180);
let frameSampleCount = 0;

function normalizeSpecimen(candidate) {
  if (candidate?.isObject3D) return { root: candidate };

  const root = candidate?.root ?? candidate?.group ?? candidate?.object3D ?? candidate?.model;
  if (!root?.isObject3D) {
    throw new TypeError("createButterflyModel must return a THREE.Object3D or an object with a root Object3D.");
  }

  return { ...candidate, root };
}

function getHotspotRecords() {
  const records = hotspotModule.HOTSPOTS;
  return Array.isArray(records) ? records : [];
}

function recordActivityEvent(envelope) {
  activityEvents.push(envelope);
  latestEvent.textContent = JSON.stringify({
    type: envelope.type,
    sequence: envelope.sequence,
    sceneId: envelope.sceneId,
    payload: envelope.payload,
  }, null, 2);
}

function selectedMarkerLabel(hotspotId) {
  const index = hotspotRecords.findIndex((record) => record.id === hotspotId);
  return index >= 0 ? `Marker ${String(index + 1).padStart(2, "0")}` : "No marker selected";
}

function buildActivityWorkspace(definition) {
  activityWorkspace.replaceChildren();

  if (definition.mode === "explore") {
    const intro = document.createElement("p");
    intro.className = "workspace-value";
    intro.textContent = "My name is the African Monarch.";
    const scientific = document.createElement("p");
    scientific.className = "workspace-help";
    scientific.innerHTML = "My scientific name is <i>Danaus chrysippus</i>. Select a point and I will introduce that part of my body.";
    const progress = document.createElement("div");
    progress.className = "progress-row";
    progress.setAttribute("aria-label", "Structures explored");
    for (let index = 0; index < hotspotRecords.length; index += 1) {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      dot.dataset.progressIndex = String(index);
      progress.append(dot);
    }
    activityWorkspace.append(intro, scientific, progress);
    return;
  }

  if (definition.mode === "identify-hotspot") {
    const label = document.createElement("p");
    label.className = "workspace-label";
    label.textContent = "Your selection";
    const value = document.createElement("p");
    value.className = "workspace-value";
    value.id = "selected-marker";
    value.textContent = "No marker selected";
    const help = document.createElement("p");
    help.className = "workspace-help";
    help.textContent = "Marker names stay hidden until checking so the question remains meaningful and accessible.";
    const submit = document.createElement("button");
    submit.id = "activity-submit";
    submit.className = "submit-button";
    submit.type = "button";
    submit.disabled = true;
    submit.textContent = "Check selection";
    submit.addEventListener("click", () => activityRuntime?.submit());
    activityWorkspace.append(label, value, help, submit);
    return;
  }

  const inputLabel = document.createElement("label");
  inputLabel.className = "workspace-label";
  inputLabel.htmlFor = "structured-response";
  inputLabel.textContent = definition.response.inputLabel;
  const textarea = document.createElement("textarea");
  textarea.id = "structured-response";
  textarea.className = "response-input";
  textarea.placeholder = definition.response.placeholder;
  textarea.maxLength = definition.response.maxLength;
  textarea.addEventListener("input", (event) => activityRuntime?.changeResponse(event.currentTarget.value));
  const responseMeta = document.createElement("div");
  responseMeta.className = "response-meta";
  const counter = document.createElement("span");
  counter.id = "response-counter";
  counter.textContent = `0 / ${definition.response.maxLength}`;
  responseMeta.append(counter);
  const submit = document.createElement("button");
  submit.id = "activity-submit";
  submit.className = "submit-button";
  submit.type = "button";
  submit.disabled = true;
  submit.textContent = "Submit response";
  submit.addEventListener("click", () => activityRuntime?.submit());
  activityWorkspace.append(inputLabel, textarea, responseMeta, submit);
}

function renderActivityState(state) {
  activityState = state;
  activityFeedback.hidden = !state.feedback;
  activityFeedback.textContent = state.feedback ?? "";
  activityFeedback.dataset.tone = state.feedbackTone ?? "";

  if (activeActivity.mode === "explore") {
    for (const [index, record] of hotspotRecords.entries()) {
      const dot = activityWorkspace.querySelector(`[data-progress-index="${index}"]`);
      dot?.classList.toggle("is-visited", state.visitedHotspotIds.includes(record.id));
    }
    return;
  }

  const submit = activityWorkspace.querySelector("#activity-submit");
  if (activeActivity.mode === "identify-hotspot") {
    const selected = activityWorkspace.querySelector("#selected-marker");
    if (selected) selected.textContent = selectedMarkerLabel(state.selectedHotspotId);
    if (submit) {
      submit.disabled = !state.selectedHotspotId || state.completed;
      submit.textContent = state.completed ? "Activity complete" : "Check selection";
    }
    return;
  }

  const counter = activityWorkspace.querySelector("#response-counter");
  if (counter) counter.textContent = `${state.response.length} / ${activeActivity.response.maxLength}`;
  if (submit) {
    submit.disabled = !state.response.trim() || state.completed;
    submit.textContent = state.completed ? "Response submitted" : "Submit response";
  }
}

function updateHotspotPresentation() {
  const concealNames = activeActivity.mode === "identify-hotspot" && !activityState?.completed;
  for (const [index, record] of hotspotRecords.entries()) {
    const marker = String(index + 1).padStart(2, "0");
    record.__screenButton?.setAttribute(
      "aria-label",
      concealNames ? `Select marker ${marker}` : `Open note: ${record.label}`,
    );
    record.__fallbackButton?.setAttribute(
      "aria-label",
      concealNames ? `Select marker ${marker}` : `Open note: ${record.label}`,
    );
    if (record.__fallbackButton) record.__fallbackButton.textContent = concealNames ? marker : record.label;
  }
}

function activateActivity(activityId) {
  const definition = getActivityDefinition(activityId);
  if (!definition) return;

  activeActivity = definition;
  specimenCard.dataset.activityMode = definition.mode;
  closeHotspotDetail();
  activityEyebrow.textContent = definition.eyebrow;
  activityPurpose.textContent = definition.purpose;
  activityPrompt.textContent = definition.prompt;
  activityInstructions.textContent = definition.instructions;
  activityFeedback.hidden = true;
  buildActivityWorkspace(definition);

  for (const tab of activityTabs.querySelectorAll(".activity-tab")) {
    const selected = tab.dataset.activityId === definition.activityId;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }

  activityRuntime = createActivityRuntime({
    definition,
    component: SPECIMEN_COMPONENT,
    gradeHotspot: gradeHotspotSelection,
    onEvent: recordActivityEvent,
    onState(state) {
      renderActivityState(state);
      updateHotspotPresentation();
      if (definition.mode === "identify-hotspot" && state.completed) {
        const revealedId = state.feedbackTone === "success" ? state.selectedHotspotId : state.revealedHotspotId;
        const record = hotspotRecords.find((hotspot) => hotspot.id === revealedId);
        if (record) showHotspotDetail(record, hotspotRecords.indexOf(record));
      }
    },
  });
  renderActivityState(activityRuntime.getState());
  updateHotspotPresentation();
  if (componentReady) activityRuntime.ready();
}

function renderActivityTabs() {
  activityTabs.replaceChildren();
  for (const definition of ACTIVITY_DEFINITIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "activity-tab";
    button.role = "tab";
    button.dataset.activityId = definition.activityId;
    button.textContent = definition.label;
    button.setAttribute("aria-selected", "false");
    button.addEventListener("click", () => activateActivity(definition.activityId));
    activityTabs.append(button);
  }
}

function renderFallbackAnnotations(records) {
  fallbackAnnotationList.replaceChildren();

  records.forEach((record, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = record.label ?? record.title ?? `Point ${index + 1}`;
    button.addEventListener("click", () => handleHotspotSelection(record, index));
    item.append(button);
    fallbackAnnotationList.append(item);
    record.__fallbackButton = button;
  });
  updateHotspotPresentation();
}

function showHotspotDetail(record, requestedIndex = 0) {
  const recordIndex = hotspotRecords.indexOf(record);
  const index = Number.isInteger(requestedIndex) ? requestedIndex : Math.max(0, recordIndex);
  const id = record?.id ?? String(index + 1);
  activeHotspotId = id;
  detailIndex.textContent = record?.category ?? record?.eyebrow ?? `Anatomy note ${String(index + 1).padStart(2, "0")}`;
  detailTitle.textContent = record?.title ?? record?.label ?? "Specimen detail";
  const summary = record?.summary ?? record?.description ?? record?.body ?? record?.copy;
  const detail = record?.detail;
  detailCopy.textContent = [summary, detail].filter(Boolean).join(" ") || "A highlighted structure on the specimen.";
  detailMeta.textContent = record?.meta ?? record?.scientificName ?? `${record?.category ?? "anatomy"} \u00b7 Danaus chrysippus`;
  detailPanel.classList.add("is-open");
  detailPanel.setAttribute("aria-hidden", "false");

  for (const button of hotspotLayer.querySelectorAll(".hotspot")) {
    button.classList.toggle("is-active", button.dataset.hotspotId === String(id));
  }
}

function closeHotspotDetail({ restoreFocus = false } = {}) {
  const activeButton = hotspotLayer.querySelector(".hotspot.is-active");
  detailPanel.classList.remove("is-open");
  detailPanel.setAttribute("aria-hidden", "true");
  activeHotspotId = null;
  hotspotLayer.querySelectorAll(".hotspot").forEach((button) => button.classList.remove("is-active"));
  if (restoreFocus) activeButton?.focus();
}

function handleHotspotSelection(record, index) {
  activityRuntime?.selectHotspot(record.id);
  if (activeActivity.mode === "identify-hotspot" && !activityState?.completed) {
    closeHotspotDetail();
    for (const button of hotspotLayer.querySelectorAll(".hotspot")) {
      button.classList.toggle("is-active", button.dataset.hotspotId === String(record.id));
    }
    return;
  }
  showHotspotDetail(record, index);
}

function recordPosition(record) {
  const raw = record?.position ?? record?.anchor?.position ?? record?.anchor ?? record?.point;
  if (raw?.isVector3) return raw.clone();
  if (Array.isArray(raw)) return new THREE.Vector3(raw[0] ?? 0, raw[1] ?? 0, raw[2] ?? 0);
  if (raw && typeof raw === "object") return new THREE.Vector3(raw.x ?? 0, raw.y ?? 0, raw.z ?? 0);
  return new THREE.Vector3();
}

function createScreenHotspots(records) {
  hotspotLayer.replaceChildren();

  records.forEach((record, index) => {
    const button = document.createElement("button");
    const id = record.id ?? String(index + 1);
    button.type = "button";
    button.className = "hotspot";
    button.dataset.hotspotId = id;
    button.textContent = record.marker ?? String(index + 1).padStart(2, "0");
    button.setAttribute("aria-label", `Open note: ${record.title ?? record.label ?? `marker ${index + 1}`}`);
    button.addEventListener("click", () => handleHotspotSelection(record, index));
    hotspotLayer.append(button);
    record.__screenButton = button;
    record.__localPosition = recordPosition(record);
  });
  updateHotspotPresentation();
}

function updateScreenHotspots(records) {
  if (!specimen?.root || !records.length) return;

  const viewport = viewer.getBoundingClientRect();
  for (const record of records) {
    const button = record.__screenButton;
    if (!button) continue;

    screenHotspotWorldPosition.copy(record.__localPosition);
    specimen.root.localToWorld(screenHotspotWorldPosition);
    screenHotspotWorldPosition.project(camera);

    const visible = screenHotspotWorldPosition.z > -1 && screenHotspotWorldPosition.z < 1;
    button.hidden = !visible;
    if (!visible) continue;

    button.style.left = `${(screenHotspotWorldPosition.x * 0.5 + 0.5) * viewport.width}px`;
    button.style.top = `${(-screenHotspotWorldPosition.y * 0.5 + 0.5) * viewport.height}px`;
  }
}

function handleViewerKeydown(event) {
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const angleStep = 0.12;
  let handled = true;

  switch (event.key) {
    case "ArrowLeft":
      spherical.theta -= angleStep;
      break;
    case "ArrowRight":
      spherical.theta += angleStep;
      break;
    case "ArrowUp":
      spherical.phi = Math.max(controls.minPolarAngle, spherical.phi - angleStep);
      break;
    case "ArrowDown":
      spherical.phi = Math.min(controls.maxPolarAngle, spherical.phi + angleStep);
      break;
    case "+":
    case "=":
      spherical.radius = Math.max(controls.minDistance, spherical.radius * 0.9);
      break;
    case "-":
    case "_":
      spherical.radius = Math.min(controls.maxDistance, spherical.radius * 1.1);
      break;
    default:
      handled = false;
  }

  if (!handled) return;
  event.preventDefault();
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  controls.update();
  status.textContent = "View adjusted";
}

function resizeRenderer() {
  const { width, height } = viewer.getBoundingClientRect();
  const renderWidth = Math.max(1, Math.round(width));
  const renderHeight = Math.max(1, Math.round(height));
  renderer.setSize(renderWidth, renderHeight, false);
  camera.aspect = renderWidth / renderHeight;
  camera.updateProjectionMatrix();
}

function fitSpecimenToView() {
  if (!specimen?.root) return;

  specimen.root.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(specimen.root);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
  const verticalDistance = size.y / (2 * Math.tan(verticalFov / 2));
  const horizontalDistance = size.x / (2 * Math.tan(horizontalFov / 2));
  const distance = Math.max(verticalDistance, horizontalDistance) * 1.12 + size.z / 2;

  DEFAULT_TARGET.copy(center);
  DEFAULT_CAMERA.copy(center).add(new THREE.Vector3(0, 0, distance));
  controls.minDistance = Math.max(3.2, distance * 0.45);
  controls.maxDistance = Math.max(12, distance * 1.8);
  camera.position.copy(DEFAULT_CAMERA);
  controls.target.copy(DEFAULT_TARGET);
  controls.update();
}

function disposeScene() {
  specimen?.dispose?.();
  controls.dispose();
  renderer.dispose();
}

async function initializeSpecimen() {
  const createModel = modelModule.createButterflyModel ?? modelModule.default;
  if (typeof createModel !== "function") {
    throw new TypeError("butterfly-model.js must export createButterflyModel.");
  }

  const created = await createModel(THREE, { scene, renderer, camera });
  specimen = normalizeSpecimen(created);
  scene.add(specimen.root);
  fitSpecimenToView();

  hotspotRecords = getHotspotRecords();
  if (hotspotRecords.length) createScreenHotspots(hotspotRecords);

  loadingState.classList.add("is-hidden");
  status.textContent = motionEnabled ? "Motion active" : "Motion paused";
  componentReady = true;
  activityRuntime?.ready();
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  frameDurations[frameSampleCount % frameDurations.length] = delta * 1000;
  frameSampleCount += 1;

  controls.update();
  specimen?.update?.(delta, elapsed, motionEnabled);
  updateScreenHotspots(hotspotRecords);
  renderer.render(scene, camera);

  if (frameSampleCount % 60 === 0) {
    const metrics = window.__SPECIMEN_DEBUG__.getRendererStats();
    canvas.dataset.renderCalls = String(metrics.calls);
    canvas.dataset.triangles = String(metrics.triangles);
    canvas.dataset.frameP95Ms = metrics.frameP95Ms.toFixed(2);
    canvas.dataset.frameMaxMs = metrics.frameMaxMs.toFixed(2);
  }
}

window.__SPECIMEN_DEBUG__ = {
  getRendererStats() {
    const sampleCount = Math.min(frameSampleCount, frameDurations.length);
    const samples = Array.from(frameDurations.slice(0, sampleCount)).sort((a, b) => a - b);
    const percentile = (value) => samples[Math.min(samples.length - 1, Math.floor(samples.length * value))] ?? 0;
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      frameSamples: sampleCount,
      frameP50Ms: percentile(0.5),
      frameP95Ms: percentile(0.95),
      frameMaxMs: samples.at(-1) ?? 0,
    };
  },
  getMotionEnabled: () => motionEnabled,
  getActivityEvents: () => activityEvents.map((event) => ({ ...event })),
};

function setCardExpanded(expanded) {
  specimenCard.classList.toggle("is-expanded", expanded);
  document.body.classList.toggle("card-expanded", expanded);
  expandButton.setAttribute("aria-pressed", String(expanded));
  expandLabel.textContent = expanded ? "Exit expanded view" : "Expand";
  requestAnimationFrame(() => {
    resizeRenderer();
    fitSpecimenToView();
  });
}

panelClose.addEventListener("click", () => closeHotspotDetail({ restoreFocus: true }));
expandButton.addEventListener("click", () => setCardExpanded(!specimenCard.classList.contains("is-expanded")));
canvas.addEventListener("keydown", handleViewerKeydown);
window.addEventListener("resize", resizeRenderer, { passive: true });
window.addEventListener("beforeunload", disposeScene, { once: true });
window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (specimenCard.classList.contains("is-expanded")) setCardExpanded(false);
  else closeHotspotDetail({ restoreFocus: true });
});

controls.addEventListener("start", () => {
  gestureHint.style.opacity = "0";
});

renderActivityTabs();
activateActivity(activeActivity.activityId);
window.scrollTo({ top: 0, left: 0 });
resizeRenderer();
animate();

initializeSpecimen().catch((error) => {
  console.error("Unable to initialize interactive specimen", error);
  revealStaticFallback("The 3D specimen could not be prepared");
});
