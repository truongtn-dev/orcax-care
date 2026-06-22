import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageLayout from "../../components/PageLayout.jsx";
import AdminLayout from "../../components/AdminLayout.jsx";
import CustomSelect from "../../components/CustomSelect.jsx";
import CloudinaryAvatarUpload from "../../components/CloudinaryAvatarUpload.jsx";
import { AdminApiClient } from "../../services/adminApi.js";
import { getApiErrorMessage } from "../../services/api.js";
import { DEFAULT_CONSULTATION_FEE_VND } from "../../utils/booking.js";

const emptyForm = {
  email: "",
  fullName: "",
  phone: "",
  specialtyId: "",
  departmentId: "",
  licenseNo: "",
  consultationFee: String(DEFAULT_CONSULTATION_FEE_VND),
  bio: "",
  photoUrl: "",
  isActive: true,
  accountIsActive: true,
};

export default function DoctorEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [specialties, setSpecialties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDoctor() {
      setLoading(true);
      setError("");
      try {
        const [doctorRes, specialtyRes, departmentRes] = await Promise.all([
          AdminApiClient.getDoctor(id),
          AdminApiClient.getSpecialties({ activeOnly: false }),
          AdminApiClient.getDepartments({ activeOnly: false }),
        ]);
        if (ignore) return;
        const doctor = doctorRes.data;
        setForm({
          email: doctor.email || "",
          fullName: doctor.fullName || "",
          phone: doctor.phone || "",
          specialtyId: doctor.specialtyId || "",
          departmentId: doctor.departmentId || "",
          licenseNo: doctor.licenseNo || "",
          consultationFee: String(doctor.consultationFee ?? DEFAULT_CONSULTATION_FEE_VND),
          bio: doctor.bio || "",
          photoUrl: doctor.photoUrl || "",
          isActive: Boolean(doctor.isActive),
          accountIsActive: Boolean(doctor.accountIsActive),
        });
        setSpecialties(specialtyRes.data.items || []);
        setDepartments(departmentRes.data.items || []);
      } catch (err) {
        if (!ignore) setError(getApiErrorMessage(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDoctor();
    return () => {
      ignore = true;
    };
  }, [id]);

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setSuccess("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const { data } = await AdminApiClient.updateDoctor(id, {
        ...form,
        consultationFee: Number(form.consultationFee),
      });
      setForm({
        email: data.email || "",
        fullName: data.fullName || "",
        phone: data.phone || "",
        specialtyId: data.specialtyId || "",
        departmentId: data.departmentId || "",
        licenseNo: data.licenseNo || "",
        consultationFee: String(data.consultationFee ?? DEFAULT_CONSULTATION_FEE_VND),
        bio: data.bio || "",
        photoUrl: data.photoUrl || "",
        isActive: Boolean(data.isActive),
        accountIsActive: Boolean(data.accountIsActive),
      });
      setSuccess("Doctor updated successfully. Patient search will use the new data.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout dashboard>
      <AdminLayout
        title="Update doctor"
        description="Edit professional details, linked account, and patient-facing visibility status."
      >
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Loading doctor...
        </div>
      ) : (
        <div className="card form-card-centered profile-form-card">
          <form onSubmit={onSubmit} className="form">
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <fieldset className="form-section">
              <legend>Linked account</legend>
              <div className="form-grid">
                <label>
                  Email
                  <input type="email" name="email" value={form.email} onChange={onChange} required />
                </label>
                <label>
                  Full name
                  <input type="text" name="fullName" value={form.fullName} onChange={onChange} minLength={2} required />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    pattern="[0-9+\-\s()]{8,20}"
                    title="Use 8–20 characters including digits, spaces, +, -, or parentheses."
                  />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" name="accountIsActive" checked={form.accountIsActive} onChange={onChange} />
                  Account is active
                </label>
              </div>
            </fieldset>

            <fieldset className="form-section">
              <legend>Professional details</legend>
              <CloudinaryAvatarUpload
                label="Doctor photo"
                name="photoUrl"
                value={form.photoUrl}
                onChange={onChange}
                fallbackName={form.fullName}
                folder="orcaxcare/avatars/doctors"
              />
              <div className="form-grid">
                <CustomSelect
                  label="Specialty"
                  value={form.specialtyId}
                  placeholder="Select specialty"
                  onChange={(specialtyId) => onChange({ target: { name: "specialtyId", value: specialtyId } })}
                  options={[
                    { value: "", label: "Select specialty" },
                    ...specialties.map((specialty) => ({ value: specialty._id, label: specialty.name })),
                  ]}
                />
                <CustomSelect
                  label="Department"
                  value={form.departmentId}
                  placeholder="Select department"
                  onChange={(departmentId) => onChange({ target: { name: "departmentId", value: departmentId } })}
                  options={[
                    { value: "", label: "Select department" },
                    ...departments.map((department) => ({ value: department._id, label: department.name })),
                  ]}
                />
                <label>
                  License number
                  <input type="text" name="licenseNo" value={form.licenseNo} onChange={onChange} minLength={3} required />
                </label>
                <label>
                  Consultation fee (VND)
                  <input
                    type="number"
                    name="consultationFee"
                    value={form.consultationFee}
                    onChange={onChange}
                    min={0}
                    step={1000}
                    required
                  />
                </label>
                <label className="checkbox-row">
                  <input type="checkbox" name="isActive" checked={form.isActive} onChange={onChange} />
                  Doctor is active
                </label>
              </div>
              <label>
                Bio
                <textarea name="bio" value={form.bio} onChange={onChange} rows="5" maxLength="1000" />
              </label>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate("/admin/doctors")}>
                Cancel
              </button>
              <Link to="/search-doctors" className="btn btn-outline btn-sm">
                View patient side
              </Link>
            </div>
          </form>
        </div>
      )}
      </AdminLayout>
    </PageLayout>
  );
}
