import { useCallback, useEffect, useState } from "react";

import { Link, useParams } from "react-router-dom";

import PageLayout from "../components/PageLayout.jsx";

import AdminLayout from "../components/AdminLayout.jsx";

import ConfirmDialog from "../components/ConfirmDialog.jsx";
import RecordAvatar from "../components/RecordAvatar.jsx";
import CustomSelect from "../components/CustomSelect.jsx";

import { AdminApiClient } from "../services/adminApi.js";
import { PublicApiClient } from "../services/publicApi.js";

import { getApiErrorMessage } from "../services/api.js";

import { useAuth } from "../context/AuthContext.jsx";



const GENDER_LABELS = {

  male: "Male",

  female: "Female",

  other: "Other",

};



const CHANGE_ROLE_OPTIONS = [

  { value: "patient", label: "Patient" },

  { value: "doctor", label: "Doctor" },

  { value: "staff", label: "Staff" },

  { value: "admin", label: "Administrator" },

];



const EMPTY_ROLE_FORM = {

  role: "",

  specialtyId: "",

  departmentId: "",

  licenseNo: "",

  bio: "",

};



function formatRoleLabel(role) {

  const labels = { admin: "Administrator", doctor: "Doctor", staff: "Staff", patient: "Patient" };

  return labels[role] || role;

}



function formatDate(value) {

  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {

    month: "short",

    day: "numeric",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

  });

}



function formatDateOnly(value) {

  if (!value) return "—";

  return new Date(value).toLocaleDateString();

}



function StatusBadge({ active, label }) {

  return (

    <span className={`status-badge ${active ? "status-badge-active" : "status-badge-inactive"}`}>

      {label}

    </span>

  );

}



function DetailItem({ label, value }) {

  return (

    <div className="detail-item">

      <span className="detail-label">{label}</span>

      <span className="detail-value">{value ?? "—"}</span>

    </div>

  );

}



export default function AdminAccountDetailPage() {

  const { id } = useParams();

  const { email: currentAdminEmail } = useAuth();

  const [account, setAccount] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const [statusLoading, setStatusLoading] = useState(false);

  const [roleForm, setRoleForm] = useState(EMPTY_ROLE_FORM);

  const [specialties, setSpecialties] = useState([]);

  const [departments, setDepartments] = useState([]);

  const [showRoleConfirm, setShowRoleConfirm] = useState(false);

  const [roleLoading, setRoleLoading] = useState(false);

  const [roleError, setRoleError] = useState("");



  const loadAccount = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const { data } = await AdminApiClient.getAccount(id);

      setAccount(data);

    } catch (err) {

      setError(getApiErrorMessage(err));

      setAccount(null);

    } finally {

      setLoading(false);

    }

  }, [id]);



  useEffect(() => {

    loadAccount();

  }, [loadAccount]);



  useEffect(() => {

    PublicApiClient.getSpecialties()

      .then(({ data }) => setSpecialties(data.items || []))

      .catch(() => setSpecialties([]));

    PublicApiClient.getDepartments()

      .then(({ data }) => setDepartments(data.items || []))

      .catch(() => setDepartments([]));

  }, []);



  useEffect(() => {

    if (!account) return;

    setRoleForm({

      role: account.role,

      specialtyId: account.profile?.specialty?._id || account.profile?.specialtyId || "",

      departmentId: account.profile?.department?._id || account.profile?.departmentId || "",

      licenseNo: account.profile?.licenseNo || "",

      bio: account.profile?.bio || "",

    });

    setRoleError("");

  }, [account]);



  const handleReactivate = async () => {

    setStatusLoading(true);

    setStatusMessage({ type: "", text: "" });

    try {

      await AdminApiClient.reactivateUser(id);

      setStatusMessage({ type: "success", text: "Account reactivated successfully." });

      await loadAccount();

    } catch (err) {

      setStatusMessage({ type: "error", text: getApiErrorMessage(err) });

    } finally {

      setStatusLoading(false);

    }

  };



  const handleDeactivate = async () => {

    setStatusLoading(true);

    setStatusMessage({ type: "", text: "" });

    try {

      await AdminApiClient.deactivateUser(id);

      setStatusMessage({ type: "success", text: "Account deactivated. Active sessions terminated." });

      setShowDeactivateConfirm(false);

      await loadAccount();

    } catch (err) {

      setStatusMessage({ type: "error", text: getApiErrorMessage(err) });

    } finally {

      setStatusLoading(false);

    }

  };



  const onRoleFieldChange = (event) => {

    const { name, value } = event.target;

    setRoleForm((current) => ({ ...current, [name]: value }));

    setRoleError("");

  };



  const isSelf = account?.email === currentAdminEmail;



  const roleHasChanges = account && roleForm.role && roleForm.role !== account.role;



  const canSubmitRoleChange =

    roleHasChanges &&

    !isSelf &&

    (roleForm.role !== "doctor" ||

      (roleForm.specialtyId && roleForm.departmentId && roleForm.licenseNo.trim()));



  const handleChangeRole = async () => {

    if (!canSubmitRoleChange) return;

    setRoleLoading(true);

    setRoleError("");

    setStatusMessage({ type: "", text: "" });

    try {

      const extra = {};

      if (roleForm.role === "doctor") {

        extra.specialtyId = roleForm.specialtyId;

        extra.departmentId = roleForm.departmentId;

        extra.licenseNo = roleForm.licenseNo.trim();

        extra.bio = roleForm.bio.trim();

      }

      await AdminApiClient.changeRole(id, roleForm.role, extra);

      setShowRoleConfirm(false);

      setStatusMessage({

        type: "success",

        text: "Role updated. The user must sign in again for permissions to take effect.",

      });

      await loadAccount();

    } catch (err) {

      setRoleError(getApiErrorMessage(err));

    } finally {

      setRoleLoading(false);

    }

  };



  return (

    <PageLayout dashboard>

      <AdminLayout

        title="Account details"

        actions={

          account && (

            <>

              <Link to={`/admin/account/${id}/edit`} className="btn btn-primary">

                Edit account

              </Link>

              {account.isActive ? (

                <button

                  type="button"

                  className="btn btn-outline"

                  disabled={isSelf || statusLoading}

                  onClick={() => setShowDeactivateConfirm(true)}

                >

                  Deactivate

                </button>

              ) : (

                <button

                  type="button"

                  className="btn btn-primary"

                  disabled={statusLoading}

                  onClick={handleReactivate}

                >

                  {statusLoading ? "Processing…" : "Reactivate"}

                </button>

              )}

              <Link to="/admin/account" className="btn btn-secondary">

                Back to list

              </Link>

            </>

          )

        }

      >

      {loading && (

        <div className="loading-state">

          <div className="loading-spinner" />

          Loading account…

        </div>

      )}



      {error && !loading && <div className="alert alert-error">{error}</div>}



      {statusMessage.text && (

        <div className={`alert alert-${statusMessage.type === "success" ? "success" : "error"}`}>

          {statusMessage.text}

        </div>

      )}



      {!loading && account && (

        <>

          <div className="card account-detail-header">

            <RecordAvatar
              name={account.fullName}
              imageUrl={account.role === "doctor" ? account.profile?.photoUrl : account.profile?.avatarUrl}
            />

            <div>

              <h2>{account.fullName}</h2>

              <p>{account.email}</p>

              <div className="status-badge-group">

                <span className="role-badge">{formatRoleLabel(account.role)}</span>

                <StatusBadge active={account.isActive} label={account.isActive ? "Active" : "Inactive"} />

                <StatusBadge

                  active={account.isEmailVerified}

                  label={account.isEmailVerified ? "Email verified" : "Email not verified"}

                />

                {account.isLocked && <span className="status-badge status-badge-locked">Locked</span>}

              </div>

            </div>

          </div>



          <div className="detail-grid">

            <section className="card detail-section">

              <h3>Account information</h3>

              <div className="detail-list">

                <DetailItem label="Full name" value={account.fullName} />

                <DetailItem label="Email" value={account.email} />

                <DetailItem label="Phone number" value={account.phone || "—"} />

                <DetailItem label="Role" value={formatRoleLabel(account.role)} />

                <DetailItem label="Last login" value={formatDate(account.lastLoginAt)} />

                <DetailItem label="Last password change" value={formatDate(account.passwordChangedAt)} />

                <DetailItem label="Created" value={formatDate(account.createdAt)} />

                <DetailItem label="Last updated" value={formatDate(account.updatedAt)} />

              </div>

            </section>



            {account.role === "patient" && (

              <section className="card detail-section">

                <h3>Patient profile</h3>

                <div className="detail-list">

                  <DetailItem label="Date of birth" value={formatDateOnly(account.profile.dateOfBirth)} />

                  <DetailItem

                    label="Gender"

                    value={GENDER_LABELS[account.profile.gender] || account.profile.gender || "—"}

                  />

                  <DetailItem label="Address" value={account.profile.address || "—"} />

                  <DetailItem label="Emergency contact" value={account.profile.emergencyContactName || "—"} />

                  <DetailItem label="Emergency phone" value={account.profile.emergencyContactPhone || "—"} />

                  <DetailItem

                    label="Profile status"

                    value={account.profile.isActive ? "Active" : "Inactive"}

                  />

                </div>

              </section>

            )}



            {account.role === "doctor" && (

              <section className="card detail-section">

                <div className="detail-section-header">

                  <h3>Doctor profile</h3>

                  {account.doctorId && (

                    <Link to={`/admin/doctors/${account.doctorId}/edit`} className="btn btn-outline btn-sm">

                      Edit professional profile

                    </Link>

                  )}

                </div>

                <div className="detail-list">

                  <DetailItem label="License number" value={account.profile.licenseNo || "—"} />

                  <DetailItem label="Specialty" value={account.profile.specialty?.name || "—"} />

                  <DetailItem label="Department" value={account.profile.department?.name || "—"} />

                  <DetailItem label="Profile status" value={account.profile.isActive ? "Active" : "Inactive"} />

                  <div className="detail-item detail-item-full">

                    <span className="detail-label">Bio</span>

                    <span className="detail-value">{account.profile.bio || "—"}</span>

                  </div>

                </div>

              </section>

            )}



            {account.role === "admin" && (

              <section className="card detail-section">

                <h3>Administrator</h3>

                <p className="detail-note">This account has system administrator privileges.</p>

              </section>

            )}



            <section className="card detail-section">

              <h3>Change role</h3>

              <p className="detail-note">

                Permissions take effect on the user&apos;s next sign-in. All active sessions are revoked after a role

                change.

              </p>

              {isSelf && (

                <div className="alert alert-error">You cannot change your own role from this screen.</div>

              )}

              {roleError && <div className="alert alert-error">{roleError}</div>}

              <div className="form-grid">

                <CustomSelect

                  label="New role"

                  value={roleForm.role}

                  onChange={(role) => setRoleForm((current) => ({ ...current, role }))}

                  options={CHANGE_ROLE_OPTIONS}

                  disabled={isSelf || roleLoading}

                />

                {roleForm.role === "doctor" && (

                  <>

                    <CustomSelect

                      label="Specialty"

                      value={roleForm.specialtyId}

                      onChange={(specialtyId) => setRoleForm((current) => ({ ...current, specialtyId }))}

                      options={[

                        { value: "", label: "Select specialty" },

                        ...specialties.map((item) => ({ value: item._id, label: item.name })),

                      ]}

                      disabled={isSelf || roleLoading}

                    />

                    <CustomSelect

                      label="Department"

                      value={roleForm.departmentId}

                      onChange={(departmentId) => setRoleForm((current) => ({ ...current, departmentId }))}

                      options={[

                        { value: "", label: "Select department" },

                        ...departments.map((item) => ({ value: item._id, label: item.name })),

                      ]}

                      disabled={isSelf || roleLoading}

                    />

                    <label>

                      License number

                      <input

                        type="text"

                        name="licenseNo"

                        value={roleForm.licenseNo}

                        onChange={onRoleFieldChange}

                        disabled={isSelf || roleLoading}

                        required

                      />

                    </label>

                    <label className="form-grid-full">

                      Bio

                      <textarea

                        name="bio"

                        value={roleForm.bio}

                        onChange={onRoleFieldChange}

                        rows={3}

                        disabled={isSelf || roleLoading}

                      />

                    </label>

                  </>

                )}

              </div>

              <div className="form-actions">

                <button

                  type="button"

                  className="btn btn-primary"

                  disabled={!canSubmitRoleChange || roleLoading}

                  onClick={() => setShowRoleConfirm(true)}

                >

                  Change role

                </button>

              </div>

            </section>

          </div>

        </>

      )}



      <ConfirmDialog

        open={showDeactivateConfirm}

        title="Deactivate account"

        description={

          account

            ? `Deactivate ${account.fullName}? The user will be signed out and all active sessions will end.`

            : ""

        }

        confirmText="Deactivate"

        variant="danger"

        loading={statusLoading}

        onConfirm={handleDeactivate}

        onCancel={() => setShowDeactivateConfirm(false)}

      />



      <ConfirmDialog

        open={showRoleConfirm}

        title="Confirm role change"

        description={

          account && roleForm.role

            ? `Change ${account.fullName}'s role from ${formatRoleLabel(account.role)} to ${formatRoleLabel(roleForm.role)}? Active sessions will be revoked.`

            : ""

        }

        confirmText="Change role"

        loading={roleLoading}

        onConfirm={handleChangeRole}

        onCancel={() => setShowRoleConfirm(false)}

      />

      </AdminLayout>

    </PageLayout>

  );

}

