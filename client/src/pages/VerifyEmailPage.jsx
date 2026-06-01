import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { AuthApiClient } from "../services/authApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
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

  const onResend = async (e) => {
    e.preventDefault();
    setResendMsg("");
    try {
      const { data } = await AuthApiClient.resendVerification(resendEmail);
      setResendMsg(data.message);
    } catch (err) {
      setResendMsg(getApiErrorMessage(err));
    }
  };

  return (
    <PageLayout narrow>
      <div className="card auth-card">
        <h1>Verify Email</h1>
        {status === "loading" && <p className="muted">Verifying your email…</p>}
        {status === "success" && <div className="alert alert-success">{message}</div>}
        {status === "error" && (
          <>
            <div className="alert alert-error">{message}</div>
            <form onSubmit={onResend} className="form resend-inline">
              <label>
                Resend to email
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn-outline">
                Resend verification
              </button>
              {resendMsg && <p className="hint">{resendMsg}</p>}
            </form>
          </>
        )}
        <p className="form-footer">
          <Link to="/login">Go to Login</Link>
        </p>
      </div>
    </PageLayout>
  );
}
