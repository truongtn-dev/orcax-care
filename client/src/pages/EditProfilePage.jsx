import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { ProfileApiClient } from "../services/profileApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatRoleLabel } from "../utils/roleLabels.js";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function EditProfilePage() {
  const { role, updateProfileMeta } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bio: "",
    licenseNo: "",
    specialtyName: "",
    departmentName: "",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    ProfileApiClient.getProfile()
      .then(({ data }) => {
        const mappedData = {
          fullName: data.fullName || "",
          phone: data.phone || "",
          email: data.email || "",
          dateOfBirth: data.profile?.dateOfBirth || "",
          gender: data.profile?.gender || "",
          address: data.profile?.address || "",
          emergencyContactName: data.profile?.emergencyContactName || "",
          emergencyContactPhone: data.profile?.emergencyContactPhone || "",
          bio: data.profile?.bio || "",
          licenseNo: data.profile?.licenseNo || "",
          specialtyName: data.profile?.specialty?.name || "",
          departmentName: data.profile?.department?.name || "",
        };
        setProfileData(mappedData);
        setForm(mappedData);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setModalError("");
    setSuccess("");
  };

  const handleOpenModal = () => {
    setForm(profileData);
    setModalError("");
    setSuccess("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setSuccess("");
    setSaving(true);

    const payload = {
      fullName: form.fullName,
      phone: form.phone,
    };

    if (role === "patient") {
      Object.assign(payload, {
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        address: form.address,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
      });
    }

    if (role === "doctor") {
      payload.bio = form.bio;
    }

    try {
      const { data } = await ProfileApiClient.updateProfile(payload);
      const updatedData = {
        ...profileData,
        fullName: data.fullName || "",
        phone: data.phone || "",
        dateOfBirth: data.profile?.dateOfBirth || "",
        gender: data.profile?.gender || "",
        address: data.profile?.address || "",
        emergencyContactName: data.profile?.emergencyContactName || "",
        emergencyContactPhone: data.profile?.emergencyContactPhone || "",
        bio: data.profile?.bio || "",
      };
      setProfileData(updatedData);
      setForm(updatedData);
      setSuccess("Profile updated successfully.");
      updateProfileMeta(data.fullName, data.phone);
      setIsModalOpen(false);
    } catch (err) {
      setModalError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const backLink = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getGenderLabel = (val) => {
    const opt = GENDER_OPTIONS.find((o) => o.value === val);
    return opt ? opt.label : "Not provided";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not provided";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Profile</h1>
        <p>View and update your account information.</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading profile…
        </div>
      ) : error ? (
        <div className="card form-card-centered">
          <div className="alert alert-error">{error}</div>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to={backLink} className="btn btn-outline">
              Back to dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="profile-card-layout">
          {success && <div className="alert alert-success">{success}</div>}

          <div className="profile-hero">
            <div className="profile-avatar-wrapper">
              {getInitials(profileData.fullName)}
            </div>

            <div className="profile-meta-info">
              <h2>
                {profileData.fullName}
                <span className={`profile-role-badge ${role}`}>
                  {formatRoleLabel(role)}
                </span>
              </h2>
              <div className="profile-sub-meta">
                <div>Email: <strong>{profileData.email}</strong></div>
                <div>Phone: <strong>{profileData.phone || "Not provided"}</strong></div>
              </div>
            </div>

            <div className="profile-actions">
              <button onClick={handleOpenModal} className="btn btn-primary">
                Edit profile
              </button>
            </div>
          </div>

          {role === "patient" && (
            <div className="profile-grid-section">
              <h3>Patient information</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="profile-item-label">Date of birth</span>
                  <span className="profile-item-value">{formatDate(profileData.dateOfBirth)}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">Gender</span>
                  <span className="profile-item-value">{getGenderLabel(profileData.gender)}</span>
                </div>
                <div className="profile-item profile-grid-full">
                  <span className="profile-item-label">Address</span>
                  <span className="profile-item-value">{profileData.address || "Not provided"}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">Emergency contact name</span>
                  <span className="profile-item-value">{profileData.emergencyContactName || "Not provided"}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">Emergency contact phone</span>
                  <span className="profile-item-value">{profileData.emergencyContactPhone || "Not provided"}</span>
                </div>
              </div>
            </div>
          )}

          {role === "doctor" && (
            <div className="profile-grid-section">
              <h3>Doctor information</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="profile-item-label">License number</span>
                  <span className="profile-item-value">{profileData.licenseNo || "Not provided"}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">Specialty</span>
                  <span className="profile-item-value">{profileData.specialtyName || "Not provided"}</span>
                </div>
                <div className="profile-item profile-grid-full">
                  <span className="profile-item-label">Department</span>
                  <span className="profile-item-value">{profileData.departmentName || "Not provided"}</span>
                </div>
                <div className="profile-item profile-grid-full">
                  <span className="profile-item-label">Professional bio</span>
                  <span className="profile-item-value bio-text">{profileData.bio || "No professional bio yet."}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
            <Link to={backLink} className="btn btn-outline">
              Back to dashboard
            </Link>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="card modal-card animate-scale" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit profile</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                &times;
              </button>
            </div>

            <form onSubmit={onSubmit} className="form" noValidate>
              {modalError && <div className="alert alert-error">{modalError}</div>}

              <fieldset className="form-section">
                <legend>Account</legend>
                <div className="form-grid">
                  <label>
                    Full name
                    <input name="fullName" value={form.fullName} onChange={onChange} required placeholder="Full legal name" />
                  </label>
                  <label>
                    Phone number
                    <input name="phone" value={form.phone} onChange={onChange} placeholder="0901234567" />
                  </label>
                  <label className="form-grid-span-2">
                    Email
                    <input name="email" value={form.email} readOnly disabled className="input-readonly" />
                  </label>
                </div>
              </fieldset>

              {role === "patient" && (
                <fieldset className="form-section">
                  <legend>Patient information</legend>
                  <div className="form-grid">
                    <label>
                      Date of birth
                      <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} />
                    </label>
                    <CustomSelect
                      label="Gender"
                      value={form.gender}
                      onChange={(gender) => onChange({ target: { name: "gender", value: gender } })}
                      options={GENDER_OPTIONS}
                    />
                    <label className="form-grid-span-2">
                      Address
                      <input name="address" value={form.address} onChange={onChange} placeholder="City, district, street…" />
                    </label>
                    <label>
                      Emergency contact name
                      <input
                        name="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={onChange}
                        placeholder="Contact name"
                      />
                    </label>
                    <label>
                      Emergency contact phone
                      <input
                        name="emergencyContactPhone"
                        value={form.emergencyContactPhone}
                        onChange={onChange}
                        placeholder="Phone number"
                      />
                    </label>
                  </div>
                </fieldset>
              )}

              {role === "doctor" && (
                <fieldset className="form-section">
                  <legend>Doctor information</legend>
                  <div className="form-grid">
                    <label>
                      License number
                      <input name="licenseNo" value={form.licenseNo} readOnly disabled className="input-readonly" />
                    </label>
                    <label>
                      Specialty
                      <input name="specialtyName" value={form.specialtyName} readOnly disabled className="input-readonly" />
                    </label>
                    <label className="form-grid-span-2">
                      Department
                      <input name="departmentName" value={form.departmentName} readOnly disabled className="input-readonly" />
                    </label>
                    <label className="form-grid-span-2">
                      Professional bio
                      <textarea
                        name="bio"
                        value={form.bio}
                        onChange={onChange}
                        rows={4}
                        placeholder="Write a brief introduction about yourself…"
                        maxLength={1000}
                      />
                    </label>
                  </div>
                </fieldset>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
