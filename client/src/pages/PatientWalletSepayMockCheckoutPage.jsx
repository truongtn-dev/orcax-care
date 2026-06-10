import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";

export default function PatientWalletSepayMockCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("orderId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderId) {
      setError("Missing SePay order id.");
    }
  }, [orderId]);

  const onConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await PatientApiClient.confirmMockSepayTopup({ orderId });
      navigate(`/patient/wallet?payment=success&orderId=${orderId}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    navigate("/patient/wallet?payment=cancelled&reason=Mock+SePay+payment+cancelled");
  };

  return (
    <PageLayout>
      <div className="page-header">
        <h1>SePay sandbox checkout</h1>
        <p>Mock SePay page for local development. No real bank charge will occur.</p>
      </div>

      <div className="card form-card-centered">
        {error && <div className="alert alert-error">{error}</div>}
        <p>
          Order id: <strong>{orderId || "—"}</strong>
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading || !orderId}
          >
            {loading ? "Processing…" : "Simulate successful SePay payment"}
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
