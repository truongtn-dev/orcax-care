import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function PatientWalletMockCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderCode = searchParams.get("orderCode");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderCode) {
      setError("Missing PayOS order code.");
    }
  }, [orderCode]);

  const onConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await PatientApiClient.confirmMockPayosTopup({ orderCode: Number(orderCode) });
      navigate(`/patient/wallet?payment=success&orderCode=${orderCode}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    navigate("/patient/wallet?payment=cancelled&reason=Mock+PayOS+payment+cancelled");
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>PayOS sandbox checkout</h1>
        <p>Mock payment page for local development. No real charge will be made.</p>
      </div>

      <div className="card form-card-centered">
        {error && <div className="alert alert-error">{error}</div>}
        <p>
          Order code: <strong>{orderCode || "—"}</strong>
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={loading || !orderCode}>
            {loading ? "Processing…" : "Simulate successful payment"}
          </button>
          <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
            Cancel payment
          </button>
          <Link to="/patient/wallet" className="btn btn-secondary">
            Back to wallet
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
