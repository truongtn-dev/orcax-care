import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./BranchMap.css";

function projectPoint(lat, lng, bounds) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng || 1)) * 100;
  const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat || 1)) * 100;
  return { x, y };
}

export default function BranchMap({ branches = [], selectedId = "" }) {
  const navigate = useNavigate();

  const bounds = useMemo(() => {
    if (!branches.length) {
      return { minLat: 10.7, maxLat: 10.9, minLng: 106.6, maxLng: 106.8 };
    }
    const lats = branches.map((item) => item.lat);
    const lngs = branches.map((item) => item.lng);
    const padding = 0.02;
    return {
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLng: Math.min(...lngs) - padding,
      maxLng: Math.max(...lngs) + padding,
    };
  }, [branches]);

  return (
    <div className="branch-map" role="img" aria-label="Branch locations map">
      <div className="branch-map-grid" aria-hidden="true" />
      {branches.map((branch) => {
        const point = projectPoint(branch.lat, branch.lng, bounds);
        const isSelected = selectedId === branch._id;
        return (
          <button
            key={branch._id}
            type="button"
            className={`branch-map-pin${isSelected ? " is-selected" : ""}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={branch.name}
            onClick={() => navigate(`/branches/${branch._id}`)}
          >
            <span>{branch.name}</span>
          </button>
        );
      })}
    </div>
  );
}
