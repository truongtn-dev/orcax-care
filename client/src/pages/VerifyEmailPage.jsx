import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import AuthPageLayout from "../components/AuthPageLayout.jsx";
import ResendVerificationForm from "../components/ResendVerificationForm.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const verifyStarted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    if (verifyStarted.current) return;
    verifyStarted.current = true;

    AuthApiClient.verifyEmail(token)
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message);
        setTimeout(() => navigate("/login", { replace: true }), 3000);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(getApiErrorMessage(err));
      });
  }, [token, navigate]);

  return (
    <AuthPageLayout title="Verify email" subtitle="Confirming your email address">
      {status === "loading" && (
        <div className="loading-state">
          <div className="loading-spinner" />
          Verifying your email…
        </div>
      )}
      {status === "success" && <div className="alert alert-success">{message}</div>}
      {status === "error" && (
        <>
          <div className="alert alert-error">{message}</div>
          <p className="muted resend-description">
            Link có thể đã hết hạn. Gửi lại email xác nhận bên dưới.
          </p>
          <ResendVerificationForm compact />
        </>
      )}
      <p className="form-footer">
        <Link to="/login">Go to Sign In</Link>
      </p>
    </AuthPageLayout>
  );
}
