import { useEffect, useId, useRef, useState } from "react";
import { UploadApiClient } from "../services/uploadApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./CloudinaryAvatarUpload.css";

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

export default function CloudinaryAvatarUpload({
  label = "Profile photo",
  value = "",
  onChange,
  folder = "orcaxcare/avatars",
  name,
  fallbackName = "",
  helperText = "JPG, PNG or WebP. Max 5 MB.",
}) {
  const inputId = useId();
  const fileRef = useRef(null);
  const [configured, setConfigured] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);

  useEffect(() => {
    let active = true;
    UploadApiClient.getCloudinaryConfig()
      .then(({ data }) => {
        if (active) setConfigured(Boolean(data?.configured));
      })
      .catch(() => {
        if (active) setConfigured(false);
      })
      .finally(() => {
        if (active) setConfigLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const emitChange = (url) => {
    if (onChange) {
      onChange({ target: { name, value: url } });
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    if (!configured) {
      setError("Image upload is not available. Paste an image URL instead.");
      setShowUrlField(true);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const image = await readFileAsDataUrl(file);
      const { data } = await UploadApiClient.uploadImage({ image, folder });
      emitChange(data.url || "");
    } catch (err) {
      setError(getApiErrorMessage(err) || "Could not upload image.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onFileChange = (e) => {
    uploadFile(e.target.files?.[0]);
  };

  const onRemove = () => {
    setError("");
    emitChange("");
  };

  return (
    <div className="avatar-upload">
      <span className="avatar-upload-label">{label}</span>

      <div className="avatar-upload-body">
        <div className="avatar-upload-preview" aria-hidden="true">
          {value ? (
            <img src={value} alt="" />
          ) : (
            <span className="avatar-upload-initials">{getInitials(fallbackName)}</span>
          )}
        </div>

        <div className="avatar-upload-controls">
          {configLoading ? (
            <p className="avatar-upload-hint">Checking upload service…</p>
          ) : (
            <>
              <div className="avatar-upload-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={uploading || !configured}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "Uploading…" : value ? "Change photo" : "Upload photo"}
                </button>
                {value && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove} disabled={uploading}>
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowUrlField((current) => !current)}
                >
                  {showUrlField ? "Hide URL" : "Paste URL"}
                </button>
              </div>
              <p className="avatar-upload-hint">{helperText}</p>
              {!configured && !configLoading && (
                <p className="avatar-upload-warn">
                  Upload is off — set Cloudinary credentials in server <code>.env</code>, or paste a URL.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="avatar-upload-file"
        onChange={onFileChange}
      />

      {showUrlField && (
        <label className="avatar-upload-url">
          Image URL
          <input
            type="url"
            name={name}
            value={value}
            onChange={onChange}
            placeholder="https://res.cloudinary.com/..."
          />
        </label>
      )}

      {error && <p className="avatar-upload-error">{error}</p>}
    </div>
  );
}
