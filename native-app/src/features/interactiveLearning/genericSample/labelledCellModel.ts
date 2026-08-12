export type LabelledCellModelMarker = {
  id: string;
  label: string;
  position: [number, number, number];
};

export type LabelledCellModelProps = {
  url: string;
  fallback: string;
  markers: LabelledCellModelMarker[];
  activeMarker?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] ?? character));
}

export function buildLabelledCellModelHtml({ url, fallback, markers, activeMarker }: LabelledCellModelProps) {
  const markerMarkup = markers.map((marker, index) => {
    const [x, y, z] = marker.position;
    const activeClass = marker.id === activeMarker ? ' active' : '';
    return `<span slot="hotspot-${index + 1}" class="marker${activeClass}" data-position="${x}m ${y}m ${z}m" data-normal="0 1 0" aria-label="Marker ${index + 1}: ${escapeHtml(marker.label)}">${index + 1}</span>`;
  }).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<script type="module" src="https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script>
<style>
  :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  body { margin: 0; background: #eef6ff; color: #173b5c; }
  model-viewer { width: 100%; height: 285px; background: radial-gradient(circle at 50% 42%, #ffffff 0, #e6f1ff 68%, #d9e7f7 100%); --poster-color: transparent; }
  .marker { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 2px solid #ffffff; border-radius: 50%; background: #2563eb; color: #ffffff; font-weight: 900; font-size: 15px; box-shadow: 0 2px 7px rgba(15, 23, 42, .32); }
  .marker.active { background: #e85d75; transform: scale(1.16); }
  #status { padding: 7px 12px; font-size: 12px; color: #486581; }
  #fallback { padding: 10px 12px; border-top: 1px solid #bfd2e6; background: #fffaf0; color: #7c4a03; font-size: 13px; line-height: 18px; }
</style></head><body>
<model-viewer id="cell-model" src="${escapeHtml(url)}" alt="Labelled human cell model" camera-controls interaction-prompt="none" shadow-intensity="0.4" exposure="1.05" min-camera-orbit="auto auto 0.45m" max-camera-orbit="auto auto 1.5m">${markerMarkup}</model-viewer>
<div id="status" role="status">Loading the 3D human-cell model…</div>
<div id="fallback" hidden><strong>3D model unavailable.</strong> ${escapeHtml(fallback)}</div>
<script>
  const viewer = document.getElementById('cell-model');
  const status = document.getElementById('status');
  const fallbackBox = document.getElementById('fallback');
  const fail = () => { status.textContent = 'The 3D model could not be loaded.'; fallbackBox.hidden = false; };
  viewer.addEventListener('load', () => { status.textContent = 'Drag to rotate. The five numbered markers identify the labelled parts.'; });
  viewer.addEventListener('error', fail);
  setTimeout(() => { if (!viewer.loaded) fail(); }, 8000);
</script></body></html>`;
}
