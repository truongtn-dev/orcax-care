import { useEffect, useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import BranchMap from "../components/BranchMap.jsx";
import ClinicBranchCard from "../components/ClinicBranchCard.jsx";
import { PublicApiClient } from "../services/publicApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./BranchLocatorPage.css";

export default function BranchLocatorPage() {
  const [branches, setBranches] = useState([]);
  const [activeBranchId, setActiveBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    PublicApiClient.listBranches()
      .then(({ data }) => setBranches(data.items || []))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function highlightBranch(branch) {
    setActiveBranchId(branch.slug || branch._id);
  }

  return (
    <PageLayout>
      <div className="branch-locator">
        <section className="branch-locator-hero">
          <div className="branch-locator-hero-shapes" aria-hidden="true">
            <div className="branch-locator-hero-shape branch-locator-hero-shape-1" />
            <div className="branch-locator-hero-shape branch-locator-hero-shape-2" />
          </div>

          <div className="branch-locator-hero-content">
            <span className="branch-locator-hero-label">Branch locator</span>
            <h1>Find an OrcaX Care clinic near you</h1>
            <p>
              Explore our Ho Chi Minh City locations on the map, compare hours and contact details,
              then open a clinic page for directions.
            </p>

            {!loading && branches.length > 0 && (
              <div className="branch-locator-hero-stats">
                <div className="branch-locator-stat">
                  <span className="branch-locator-stat-value">{branches.length}</span>
                  <span className="branch-locator-stat-label">Active clinics</span>
                </div>
                <div className="branch-locator-stat">
                  <span className="branch-locator-stat-value">HCM</span>
                  <span className="branch-locator-stat-label">City coverage</span>
                </div>
                <div className="branch-locator-stat">
                  <span className="branch-locator-stat-value">7 days</span>
                  <span className="branch-locator-stat-label">Flexible hours</span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="branch-locator-body">
          {error && <div className="alert alert-error">{error}</div>}

          {loading && (
            <div className="branch-locator-loading-grid" aria-busy="true" aria-label="Loading branches">
              <div className="branch-locator-map-skeleton" />
              <div className="branch-locator-cards">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="clinic-branch-card clinic-branch-card--skeleton" aria-hidden="true" />
                ))}
              </div>
            </div>
          )}

          {!loading && !error && branches.length === 0 && (
            <p className="branch-locator-empty">No clinic branches are available right now.</p>
          )}

          {!loading && branches.length > 0 && (
            <>
              <div className="branch-locator-map-stage">
                <div className="branch-locator-map-head">
                  <h2>Clinic map</h2>
                  <p>Click a pin for quick info, or select a card below to view full details.</p>
                </div>
                <BranchMap
                  branches={branches}
                  selectedId={activeBranchId}
                  className="branch-map--locator"
                  onBranchSelect={highlightBranch}
                />
              </div>

              <div className="branch-locator-cards-section">
                <div className="branch-locator-cards-head">
                  <h2>All locations</h2>
                  <p>{branches.length} clinics across Ho Chi Minh City</p>
                </div>

                <div className="branch-locator-cards">
                  {branches.map((branch, index) => (
                    <div
                      key={branch._id}
                      className={
                        activeBranchId === (branch.slug || branch._id)
                          ? "branch-locator-card-wrap is-active"
                          : "branch-locator-card-wrap"
                      }
                      onMouseEnter={() => highlightBranch(branch)}
                    >
                      <ClinicBranchCard branch={branch} index={index} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
