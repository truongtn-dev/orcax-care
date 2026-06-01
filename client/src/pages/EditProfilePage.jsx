import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { ProfileApiClient } from "../services/profileApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export default function EditProfilePage() {
  const { role, updateProfileMeta } = useAuth();
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    ProfileApiClient.getProfile()
      .then(({ data }) => {
        setForm({
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
        });
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
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
      setSuccess("Profile updated successfully.");
      updateProfileMeta(data.fullName, data.phone);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const backLink = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";

  return (
    <PageLayout>
      <div className="page-header">
        <h1>Edit Profile</h1>
        <p>Update your personal information. Email cannot be changed here.</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading profile…
        </div>
      ) : (
        <div className="card form-card-centered profile-form-card">
          <form onSubmit={onSubmit} className="form" noValidate>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <fieldset className="form-section">
              <legend>Account</legend>
              <div className="form-grid">
                <label>
                  Full name
                  <input name="fullName" value={form.fullName} onChange={onChange} required placeholder="Your full name" />
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
                <legend>Patient details</legend>
                <div className="form-grid">
                  <label>
                    Date of birth
                    <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} />
                  </label>
                  <label>
                    Gender
                    <select name="gender" value={form.gender} onChange={onChange}>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value || "none"} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
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
                      placeholder="Contact person name"
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
                <legend>Doctor details</legend>
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
                      placeholder="Brief introduction for patients…"
                      maxLength={1000}
                    />
                  </label>
                </div>
              </fieldset>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <Link to={backLink} className="btn btn-outline">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}
