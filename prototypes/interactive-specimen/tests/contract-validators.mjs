const DEFAULT_HOTSPOT_REQUIRED_FIELDS = [
  "id",
  "label",
  "category",
  "summary",
  "detail",
  "anchor",
  "modelParts",
];

const DEFAULT_MODEL_METHODS = ["update"];

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteVector3(value) {
  if (Array.isArray(value)) {
    return value.length === 3 && value.every(Number.isFinite);
  }

  return (
    isPlainObject(value) &&
    ["x", "y", "z"].every((key) => Number.isFinite(value[key]))
  );
}

export function validateHotspots(
  hotspots,
  { requiredFields = DEFAULT_HOTSPOT_REQUIRED_FIELDS } = {},
) {
  const errors = [];

  if (!Array.isArray(hotspots) || hotspots.length === 0) {
    return ["hotspots must be a non-empty array"];
  }

  const ids = new Map();

  hotspots.forEach((hotspot, index) => {
    const path = `hotspots[${index}]`;

    if (!isPlainObject(hotspot)) {
      errors.push(`${path} must be an object`);
      return;
    }

    for (const field of requiredFields) {
      if (!(field in hotspot)) {
        errors.push(`${path}.${field} is required`);
      }
    }

    for (const field of ["id", "label", "category", "summary", "detail"]) {
      if (field in hotspot && !isNonEmptyString(hotspot[field])) {
        errors.push(`${path}.${field} must be a non-empty string`);
      }
    }

    if ("anchor" in hotspot) {
      if (!isPlainObject(hotspot.anchor)) {
        errors.push(`${path}.anchor must be an object`);
      } else {
        if (!isFiniteVector3(hotspot.anchor.position)) {
          errors.push(`${path}.anchor.position must be a finite 3D vector`);
        }
        if (!isFiniteVector3(hotspot.anchor.normal)) {
          errors.push(`${path}.anchor.normal must be a finite 3D vector`);
        }
        if (!Number.isFinite(hotspot.anchor.radius) || hotspot.anchor.radius <= 0) {
          errors.push(`${path}.anchor.radius must be a positive finite number`);
        }
      }
    }

    if (
      "modelParts" in hotspot &&
      (!Array.isArray(hotspot.modelParts) ||
        hotspot.modelParts.length === 0 ||
        hotspot.modelParts.some((part) => !isNonEmptyString(part)))
    ) {
      errors.push(`${path}.modelParts must contain non-empty part names`);
    }

    if (isNonEmptyString(hotspot.id)) {
      const normalizedId = hotspot.id.trim().toLowerCase();
      if (ids.has(normalizedId)) {
        errors.push(
          `${path}.id duplicates hotspots[${ids.get(normalizedId)}].id`,
        );
      } else {
        ids.set(normalizedId, index);
      }
    }
  });

  return errors;
}

export function validateModelApi(
  api,
  { requiredMethods = DEFAULT_MODEL_METHODS } = {},
) {
  if (!isPlainObject(api)) {
    return ["model API must be an object"];
  }

  const errors = requiredMethods
    .filter((method) => typeof api[method] !== "function")
    .map((method) => `model API must implement ${method}()`);

  if (!("root" in api) || !isPlainObject(api.root)) {
    errors.push("model API must expose a root object");
  }

  for (const optionalMethod of ["reset", "dispose"]) {
    if (
      optionalMethod in api &&
      api[optionalMethod] !== undefined &&
      typeof api[optionalMethod] !== "function"
    ) {
      errors.push(`model API ${optionalMethod} must be a function when present`);
    }
  }

  return errors;
}

export function validateMotionSnapshot(snapshot) {
  const errors = [];

  if (!isPlainObject(snapshot)) {
    return ["motion snapshot must be an object"];
  }

  if (typeof snapshot.paused !== "boolean") {
    errors.push("motion snapshot.paused must be boolean");
  }

  if (typeof snapshot.reducedMotion !== "boolean") {
    errors.push("motion snapshot.reducedMotion must be boolean");
  }

  if (
    snapshot.reducedMotion === true &&
    snapshot.autoAnimationActive !== false
  ) {
    errors.push("reduced motion must disable automatic animation");
  }

  if (
    (snapshot.paused === true || snapshot.reducedMotion === true) &&
    snapshot.modelMotionEnabled !== false
  ) {
    errors.push("paused or reduced-motion state must disable model motion");
  }

  return errors;
}

export function validateStaticFallbackMarkup(markup) {
  const errors = [];
  const source = String(markup ?? "");
  const hasRasterFallback = /<(?:img|picture)\b/i.test(source);
  const hasAccessibleSvg =
    /<svg\b/i.test(source) &&
    /\b(?:role\s*=\s*["']img["']|aria-label\s*=|aria-labelledby\s*=)/i.test(
      source,
    );

  if (!hasRasterFallback && !hasAccessibleSvg) {
    errors.push("fallback must include a static image, picture, or accessible SVG");
  }

  const imageMatch = source.match(/<img\b[^>]*>/i);
  if (imageMatch && !/\balt\s*=\s*["'][^"']+["']/i.test(imageMatch[0])) {
    errors.push("fallback image must have non-empty alt text");
  }

  if (!/<(?:button|a)\b/i.test(source)) {
    errors.push("fallback must expose at least one keyboard-operable control");
  }

  if (!/\b(?:aria-label|aria-labelledby)\s*=/i.test(source)) {
    errors.push("fallback region or controls must have an accessible name");
  }

  return errors;
}

export function validateMobileDocumentMarkup(markup) {
  const source = String(markup ?? "");
  const errors = [];

  if (!/<meta\b[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(source)) {
    errors.push("document must declare a viewport meta tag");
  }

  if (!/<main\b/i.test(source)) {
    errors.push("document must include a main landmark");
  }

  if (!/<h1\b/i.test(source)) {
    errors.push("document must include an h1");
  }

  return errors;
}
