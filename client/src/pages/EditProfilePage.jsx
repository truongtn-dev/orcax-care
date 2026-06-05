import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { ProfileApiClient } from "../services/profileApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatRoleLabel } from "../utils/roleLabels.js";

const GENDER_OPTIONS = [
  { value: "", label: "Không muốn tiết lộ" },
  { value: "male", label: "Nam" },
  { value: "female", label: "Nữ" },
  { value: "other", label: "Khác" },
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
      setSuccess("Cập nhật hồ sơ thành công.");
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
    return opt ? opt.label : "Chưa cập nhật";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Chưa cập nhật";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("vi-VN", {
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
        <h1>Hồ sơ cá nhân</h1>
        <p>Xem và cập nhật thông tin tài khoản của bạn.</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Đang tải hồ sơ…
        </div>
      ) : error ? (
        <div className="card form-card-centered">
          <div className="alert alert-error">{error}</div>
          <div style={{ marginTop: "1rem", textAlign: "center" }}>
            <Link to={backLink} className="btn btn-outline">
              Về trang cá nhân
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
                <div>Số điện thoại: <strong>{profileData.phone || "Chưa cập nhật"}</strong></div>
              </div>
            </div>

            <div className="profile-actions">
              <button onClick={handleOpenModal} className="btn btn-primary">
                Sửa hồ sơ
              </button>
            </div>
          </div>

          {role === "patient" && (
            <div className="profile-grid-section">
              <h3>Thông tin bệnh nhân</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="profile-item-label">Ngày sinh</span>
                  <span className="profile-item-value">{formatDate(profileData.dateOfBirth)}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">Giới tính</span>
                  <span className="profile-item-value">{getGenderLabel(profileData.gender)}</span>
                </div>
                <div className="profile-item profile-grid-full">
                  <span className="profile-item-label">Địa chỉ</span>
                  <span className="profile-item-value">{profileData.address || "Chưa cập nhật"}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">Tên liên hệ khẩn cấp</span>
                  <span className="profile-item-value">{profileData.emergencyContactName || "Chưa cập nhật"}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">SĐT liên hệ khẩn cấp</span>
                  <span className="profile-item-value">{profileData.emergencyContactPhone || "Chưa cập nhật"}</span>
                </div>
              </div>
            </div>
          )}

          {role === "doctor" && (
            <div className="profile-grid-section">
              <h3>Thông tin bác sĩ</h3>
              <div className="profile-grid">
                <div className="profile-item">
                  <span className="profile-item-label">Số giấy phép</span>
                  <span className="profile-item-value">{profileData.licenseNo || "Chưa cập nhật"}</span>
                </div>
                <div className="profile-item">
                  <span className="profile-item-label">Chuyên khoa</span>
                  <span className="profile-item-value">{profileData.specialtyName || "Chưa cập nhật"}</span>
                </div>
                <div className="profile-item profile-grid-full">
                  <span className="profile-item-label">Khoa/phòng ban</span>
                  <span className="profile-item-value">{profileData.departmentName || "Chưa cập nhật"}</span>
                </div>
                <div className="profile-item profile-grid-full">
                  <span className="profile-item-label">Tiểu sử nghề nghiệp</span>
                  <span className="profile-item-value bio-text">{profileData.bio || "Chưa có tiểu sử nghề nghiệp."}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
            <Link to={backLink} className="btn btn-outline">
              Về trang cá nhân
            </Link>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-backdrop" onClick={handleCloseModal}>
          <div className="card modal-card animate-scale" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sửa hồ sơ</h3>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                &times;
              </button>
            </div>

            <form onSubmit={onSubmit} className="form" noValidate>
              {modalError && <div className="alert alert-error">{modalError}</div>}

              <fieldset className="form-section">
                <legend>Tài khoản</legend>
                <div className="form-grid">
                  <label>
                    Họ và tên
                    <input name="fullName" value={form.fullName} onChange={onChange} required placeholder="Họ và tên đầy đủ" />
                  </label>
                  <label>
                    Số điện thoại
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
                  <legend>Thông tin bệnh nhân</legend>
                  <div className="form-grid">
                    <label>
                      Ngày sinh
                      <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={onChange} />
                    </label>
                    <CustomSelect
                      label="Giới tính"
                      value={form.gender}
                      onChange={(gender) => onChange({ target: { name: "gender", value: gender } })}
                      options={GENDER_OPTIONS}
                    />
                    <label className="form-grid-span-2">
                      Địa chỉ
                      <input name="address" value={form.address} onChange={onChange} placeholder="Thành phố, quận/huyện, đường…" />
                    </label>
                    <label>
                      Tên liên hệ khẩn cấp
                      <input
                        name="emergencyContactName"
                        value={form.emergencyContactName}
                        onChange={onChange}
                        placeholder="Tên người liên hệ"
                      />
                    </label>
                    <label>
                      SĐT liên hệ khẩn cấp
                      <input
                        name="emergencyContactPhone"
                        value={form.emergencyContactPhone}
                        onChange={onChange}
                        placeholder="Số điện thoại"
                      />
                    </label>
                  </div>
                </fieldset>
              )}

              {role === "doctor" && (
                <fieldset className="form-section">
                  <legend>Thông tin bác sĩ</legend>
                  <div className="form-grid">
                    <label>
                      Số giấy phép
                      <input name="licenseNo" value={form.licenseNo} readOnly disabled className="input-readonly" />
                    </label>
                    <label>
                      Chuyên khoa
                      <input name="specialtyName" value={form.specialtyName} readOnly disabled className="input-readonly" />
                    </label>
                    <label className="form-grid-span-2">
                      Khoa/phòng ban
                      <input name="departmentName" value={form.departmentName} readOnly disabled className="input-readonly" />
                    </label>
                    <label className="form-grid-span-2">
                      Tiểu sử nghề nghiệp
                      <textarea
                        name="bio"
                        value={form.bio}
                        onChange={onChange}
                        rows={4}
                        placeholder="Viết vài dòng giới thiệu về bản thân…"
                        maxLength={1000}
                      />
                    </label>
                  </div>
                </fieldset>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
                <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
