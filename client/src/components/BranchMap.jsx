import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  createBranchMarkerIcon,
  escapeMapHtml,
  HCM_CENTER,
  HCM_DEFAULT_ZOOM,
  setupLeafletIcons,
} from "../utils/leafletSetup.js";
import { getBranchPath } from "../utils/branchUrls.js";
import "./BranchMap.css";

setupLeafletIcons();

function buildPopupHtml(branch) {
  const phone = branch.phone ? `<p class="branch-map-popup-phone">${escapeMapHtml(branch.phone)}</p>` : "";
  const hours = branch.workingHours
    ? `<p class="branch-map-popup-hours">${escapeMapHtml(branch.workingHours)}</p>`
    : "";
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${branch.lat},${branch.lng}`;

  return `
    <div class="branch-map-popup">
      <strong>${escapeMapHtml(branch.name)}</strong>
      ${branch.address ? `<p>${escapeMapHtml(branch.address)}</p>` : ""}
      ${phone}
      ${hours}
      <div class="branch-map-popup-actions">
        <button type="button" class="branch-map-popup-link" data-branch-slug="${escapeMapHtml(branch.slug || branch._id)}">View details</button>
        <a href="${directionsUrl}" target="_blank" rel="noreferrer" class="branch-map-popup-directions">Directions</a>
      </div>
    </div>
  `;
}

function bindPopupActions(marker, branchKey, navigate) {
  marker.on("popupopen", () => {
    const popupEl = marker.getPopup()?.getElement();
    const detailBtn = popupEl?.querySelector(".branch-map-popup-link");
    if (!detailBtn) return;

    detailBtn.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        navigate(getBranchPath(branchKey));
      },
      { once: true }
    );
  });
}

export default function BranchMap({
  branches = [],
  selectedId = "",
  className = "",
  onBranchSelect,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    if (container._leaflet_id != null) {
      return;
    }

    const map = L.map(container, {
      scrollWheelZoom: true,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(({ marker }) => marker.remove());
    markersRef.current = [];

    const validBranches = branches.filter(
      (branch) => Number.isFinite(Number(branch.lat)) && Number.isFinite(Number(branch.lng))
    );

    if (!validBranches.length) {
      map.setView(HCM_CENTER, HCM_DEFAULT_ZOOM);
      window.requestAnimationFrame(() => map.invalidateSize());
      return;
    }

    const bounds = L.latLngBounds([]);

    validBranches.forEach((branch) => {
      const lat = Number(branch.lat);
      const lng = Number(branch.lng);
      const branchKey = branch.slug || branch._id;
      const isSelected = selectedId === branch._id || selectedId === branch.slug;
      const marker = L.marker([lat, lng], {
        icon: createBranchMarkerIcon(isSelected),
        title: branch.name,
      });

      marker.bindPopup(buildPopupHtml(branch), { maxWidth: 280, closeButton: true });
      bindPopupActions(marker, branchKey, navigate);
      marker.on("click", () => {
        if (onBranchSelect) {
          onBranchSelect(branch);
        }
      });

      marker.addTo(map);
      markersRef.current.push({ marker, branchId: branch._id, branchSlug: branch.slug });
      bounds.extend([lat, lng]);
    });

    if (validBranches.length === 1) {
      map.setView([Number(validBranches[0].lat), Number(validBranches[0].lng)], 15);
    } else if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
    }

    if (selectedId) {
      const selected = markersRef.current.find(
        (item) => item.branchId === selectedId || item.branchSlug === selectedId
      );
      selected?.marker.openPopup();
    }

    window.requestAnimationFrame(() => map.invalidateSize());
  }, [branches, selectedId, navigate, onBranchSelect, mapReady]);

  const mapClassName = ["branch-map", className].filter(Boolean).join(" ");

  return (
    <div
      ref={containerRef}
      className={mapClassName}
      role="application"
      aria-label="Interactive branch locations map"
    />
  );
}
