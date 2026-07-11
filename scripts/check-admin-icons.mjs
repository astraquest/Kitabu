import { readFile } from "node:fs/promises";

const [app, styles] = await Promise.all([
  readFile(new URL("../apps/admin-web/app.js", import.meta.url), "utf8"),
  readFile(new URL("../apps/admin-web/styles.css", import.meta.url), "utf8")
]);

if (!app.includes('<svg class="mini-icon"')) {
  throw new Error("Admin miniIcon() must apply the mini-icon sizing class.");
}

const rule = styles.match(/\.mini-icon\s*\{([^}]+)\}/)?.[1] || "";
for (const declaration of ["width: 20px", "height: 20px", "max-width: 64px", "max-height: 64px"]) {
  if (!rule.includes(declaration)) throw new Error(`Admin mini-icon guard is missing: ${declaration}`);
}

console.log("Admin icon sizing contract passed.");
