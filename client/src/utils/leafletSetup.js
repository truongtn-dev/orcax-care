import L from "leaflet";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

let configured = false;

export function setupLeafletIcons() {
  if (configured) return;
  configured = true;

  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });
}

export function escapeMapHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Google Maps–style teardrop location pin (SVG). */
export function createBranchMarkerIcon(isSelected = false) {
  const fill = isSelected ? "#ea4335" : "#0891b2";
  const fillDark = isSelected ? "#c5221f" : "#0e7490";
  const size = isSelected ? 44 : 40;
  const anchorY = isSelected ? 44 : 40;
  const half = size / 2;

  const svg = `
    <svg class="branch-map-pin-svg" width="${size}" height="${size}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        fill="${fill}"
        d="M20 2.5c-7.3 0-13.2 5.9-13.2 13.2 0 9.9 11.4 20.4 12.5 21.4a1.1 1.1 0 0 0 1.4 0c1.1-1 12.5-11.5 12.5-21.4C33.2 8.4 27.3 2.5 20 2.5z"
      />
      <circle cx="20" cy="15.2" r="6.2" fill="#ffffff"/>
      <circle cx="20" cy="15.2" r="3.15" fill="${fillDark}"/>
    </svg>
  `.trim();

  return L.divIcon({
    className: `branch-map-pin${isSelected ? " is-selected" : ""}`,
    html: svg,
    iconSize: [size, size],
    iconAnchor: [half, anchorY],
    popupAnchor: [0, -anchorY + 6],
  });
}

export const HCM_CENTER = [10.8231, 106.6297];
export const HCM_DEFAULT_ZOOM = 11;
