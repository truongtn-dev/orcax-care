import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import BranchMap from "../components/BranchMap.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { getBranchPath } from "../utils/branchUrls.js";
import "./BranchLocatorPage.css";

export default function BranchLocatorPage() {
  const [branches, setBranches] = useState([]);
  const [tab, setTab] = useState("map");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    PublicApiClient.listBranches()
      .then(({ data }) => setBranches(data.items || []))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageLayout>
      <div className="branch-locator-page">
        <header className="branch-locator-head">
          <div>
            <p className="branch-locator-kicker">Branch locator</p>
            <h1>Find an OrcaX Care clinic</h1>
            <p className="branch-locator-lead">Browse locations, view contact details, and get directions.</p>
          </div>
          <div className="branch-locator-tabs" role="tablist" aria-label="Branch view">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "list"}
              className={tab === "list" ? "is-active" : ""}
              onClick={() => setTab("list")}
            >
              List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "map"}
              className={tab === "map" ? "is-active" : ""}
              onClick={() => setTab("map")}
            >
              Map
            </button>
          </div>
        </header>

        {error && <div className="alert alert-error">{error}</div>}
        {loading && <p className="branch-locator-loading">Loading branches…</p>}

        {!loading && !error && branches.length === 0 && (
          <p className="branch-locator-empty">No clinic branches are available right now.</p>
        )}

        {!loading && tab === "map" && branches.length > 0 && (
          <section className="branch-locator-map-panel">
            <BranchMap branches={branches} />
          </section>
        )}

        {!loading && tab === "list" && (
          <section className="branch-locator-list">
            {branches.map((branch) => (
              <Link key={branch._id} to={getBranchPath(branch)} className="card branch-card">
                <div>
                  <h2>{branch.name}</h2>
                  <p>{branch.address}</p>
                  <p className="branch-card-meta">{branch.phone} · {branch.workingHours}</p>
                </div>
                <span className="branch-card-cta">View details</span>
              </Link>
            ))}
          </section>
        )}

        {!loading && tab === "map" && branches.length > 0 && (
          <section className="branch-locator-list branch-locator-list--compact" aria-label="Branch list">
            {branches.map((branch) => (
              <Link key={branch._id} to={getBranchPath(branch)} className="card branch-card branch-card--compact">
                <div>
                  <h2>{branch.name}</h2>
                  <p className="branch-card-meta">{branch.workingHours}</p>
                </div>
                <span className="branch-card-cta">Details</span>
              </Link>
            ))}
          </section>
        )}
      </div>
    </PageLayout>
  );
}
