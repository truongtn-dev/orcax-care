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

export function createBranchMarkerIcon(isSelected = false) {
  return L.divIcon({
    className: "",
    html: `<span class="branch-leaflet-marker${isSelected ? " is-selected" : ""}" aria-hidden="true"></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -34],
  });
}

export const HCM_CENTER = [10.8231, 106.6297];
export const HCM_DEFAULT_ZOOM = 11;
