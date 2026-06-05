import { useEffect, useState } from "react";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";
import { validateEmail } from "../utils/validation.js";

export default function ResendVerificationForm({ defaultEmail = "", compact = false }) {
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((sec) => (sec <= 1 ? 0 : sec - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);
    try {
      const { data } = await AuthApiClient.resendVerification(email.trim());
      setMessage(data.message);
      setCooldown(60);
    } catch (err) {
      const retryAfter = err?.response?.data?.retryAfterSec;
      if (retryAfter) setCooldown(retryAfter);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={`form ${compact ? "form-compact" : ""}`}>
      <p className="muted resend-description">
        Chưa nhận được email xác minh? Nhập email và gửi lại bên dưới.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <label>
        Địa chỉ email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          disabled={loading || cooldown > 0}
        />
      </label>
      <button
        type="submit"
        className="btn btn-outline btn-block"
        disabled={loading || cooldown > 0}
      >
        {loading
          ? "Đang gửi…"
          : cooldown > 0
            ? `Gửi lại sau ${cooldown}s`
            : "Gửi lại email xác minh"}
      </button>
    </form>
  );
}
