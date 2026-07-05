import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import BranchMap from "../components/BranchMap.jsx";
import { StaffApiClient } from "../services/staffApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { getBranchPath } from "../utils/branchUrls.js";
import "./StaffBranchPage.css";

function RoleBadge({ isBranchManager }) {
  return (
    <span className={`status-badge ${isBranchManager ? "status-badge-active" : "status-badge-inactive"}`}>
      {isBranchManager ? "Branch manager" : "Assigned staff"}
    </span>
  );
}

export default function StaffBranchPage() {
  const [branch, setBranch] = useState(null);
  const [form, setForm] = useState({ phone: "", workingHours: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    StaffApiClient.getMyBranch()
      .then(({ data }) => {
        setBranch(data.branch);
        setForm({
          phone: data.branch.phone || "",
          workingHours: data.branch.workingHours || "",
        });
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const pageDescription = useMemo(() => {
    if (loading) return "Loading your assigned clinic branch…";
    if (!branch) return "No branch has been assigned to your staff account yet.";
    if (branch.isBranchManager) {
      return "You manage this clinic — update phone and operating hours below.";
    }
    return "View-only access to your assigned clinic branch.";
  }, [branch, loading]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSuccess("");
    setError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!branch?.isBranchManager) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await StaffApiClient.updateMyBranch(form);
      setBranch(data.branch);
      setForm({
        phone: data.branch.phone || "",
        workingHours: data.branch.workingHours || "",
      });
      setSuccess(data.message || "Branch updated successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="My clinic branch"
        description={pageDescription}
        actions={
          branch ? (
            <Link
              to={getBranchPath(branch)}
              className="btn btn-outline btn-sm"
              target="_blank"
              rel="noreferrer"
            >
              View public page
            </Link>
          ) : null
        }
      >
        <div className="dash-page-stack staff-branch-page">
          <div className="staff-branch-toolbar card">
            <p className="staff-branch-toolbar-lead">
              {branch?.isBranchManager
                ? "Branch managers maintain day-to-day contact details. Structural changes are handled by admin."
                : "Contact your branch manager or admin if clinic details need updating."}
            </p>
            <Link to="/staff" className="btn btn-outline btn-sm">
              Back to overview
            </Link>
          </div>

          {loading && (
            <div className="loading-state">
              <div className="loading-spinner" />
              Loading branch…
            </div>
          )}

          {!loading && error && !branch && (
            <div className="empty-state card">
              <h3>No branch assigned</h3>
              <p>{error}</p>
              <Link to="/staff" className="btn btn-outline">
                Return to staff overview
              </Link>
            </div>
          )}

          {!loading && branch && (
            <>
              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <div className="detail-grid staff-branch-grid">
                <section className="card detail-section staff-branch-profile">
                  <div className="detail-section-header">
                    <h3>Branch profile</h3>
                    <RoleBadge isBranchManager={branch.isBranchManager} />
                  </div>

                  <div className="detail-list">
                    <div className="detail-item">
                      <span className="detail-label">Branch name</span>
                      <span className="detail-value">{branch.name}</span>
                    </div>
                    <div className="detail-item detail-item-full">
                      <span className="detail-label">Address</span>
                      <span className="detail-value">{branch.address || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Phone</span>
                      <span className="detail-value">{branch.phone || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Working hours</span>
                      <span className="detail-value">{branch.workingHours || "—"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Public slug</span>
                      <span className="detail-value">
                        <span className="code-badge">{branch.slug || "—"}</span>
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Coordinates</span>
                      <span className="detail-value">{branch.lat}, {branch.lng}</span>
                    </div>
                  </div>
                </section>

                {branch.isBranchManager ? (
                  <section className="card form form-compact staff-branch-form-card">
                    <div className="staff-branch-form-head">
                      <div>
                        <h3>Update clinic operations</h3>
                        <p className="form-help">
                          Phone and working hours only. Address, map pin, and branch name are managed by admin.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={onSubmit}>
                      <label>
                        Phone
                        <input
                          name="phone"
                          value={form.phone}
                          onChange={onChange}
                          placeholder="028-1234-2001"
                          disabled={saving}
                        />
                      </label>

                      <label>
                        Working hours
                        <input
                          name="workingHours"
                          value={form.workingHours}
                          onChange={onChange}
                          placeholder="Mon–Fri 8:00–17:00"
                          disabled={saving}
                        />
                      </label>

                      <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                          {saving ? "Saving…" : "Save changes"}
                        </button>
                      </div>
                    </form>
                  </section>
                ) : (
                  <section className="card detail-section staff-branch-readonly">
                    <div className="detail-section-header">
                      <h3>View-only access</h3>
                    </div>
                    <p className="staff-branch-readonly-copy">
                      You are assigned to this branch but only the designated branch manager can update operating
                      details. Contact admin if structural changes are needed.
                    </p>
                  </section>
                )}
              </div>

              <section className="card staff-branch-map-card">
                <div className="detail-section-header">
                  <div>
                    <h3>Branch map</h3>
                    <p className="form-help">Location preview for your assigned clinic.</p>
                  </div>
                </div>
                <BranchMap
                  branches={[branch]}
                  selectedId={branch.slug || branch._id}
                  className="branch-map--detail staff-branch-map"
                />
              </section>
            </>
          )}
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
