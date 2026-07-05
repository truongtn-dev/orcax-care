import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./BranchLocatorPage.css";

function directionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function mapEmbedUrl(lat, lng) {
  const delta = 0.01;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

export default function BranchDetailPage() {
  const { id } = useParams();
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    PublicApiClient.getBranch(id)
      .then(({ data }) => setBranch(data.branch))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const directionsHref = useMemo(() => {
    if (!branch) return "#";
    return directionsUrl(branch.lat, branch.lng);
  }, [branch]);

  return (
    <PageLayout>
      <div className="branch-detail-page">
        <header className="branch-detail-head">
          <div>
            <p className="branch-detail-kicker">Branch detail</p>
            <h1>{branch?.name || "Clinic branch"}</h1>
            <p className="branch-detail-lead">{branch?.address || "Loading branch information…"}</p>
          </div>
          <Link to="/branches" className="btn btn-outline btn-sm">Back to branches</Link>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="branch-locator-loading">Loading branch…</p>}

        {branch && (
          <div className="branch-detail-grid">
            <section className="card branch-detail-map">
              <iframe
                title={`Map for ${branch.name}`}
                src={mapEmbedUrl(branch.lat, branch.lng)}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </section>

            <section className="card branch-detail-info">
              <dl>
                <div>
                  <dt>Address</dt>
                  <dd>{branch.address}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{branch.phone || "—"}</dd>
                </div>
                <div>
                  <dt>Working hours</dt>
                  <dd>{branch.workingHours || "—"}</dd>
                </div>
              </dl>
              <a href={directionsHref} target="_blank" rel="noreferrer" className="btn btn-primary">
                Get directions
              </a>
            </section>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
