import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { getApiErrorMessage } from "../services/api.js";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PatientWalletPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState("100000");
  const [paymentMethod, setPaymentMethod] = useState("payos");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.getWallet();
      setWallet(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const orderCode = searchParams.get("orderCode");
    const orderId = searchParams.get("orderId");
    const receiptRef = orderCode || orderId;
    const reason = searchParams.get("reason");

    if (!paymentStatus) return;

    if (paymentStatus === "success" && receiptRef) {
      setNotice("Top-up successful. Your wallet balance has been updated.");
      PatientApiClient.getTopupReceipt(receiptRef)
        .then(({ data }) => setReceipt(data.receipt))
        .catch(() => setReceipt(null));
      loadWallet();
    } else if (paymentStatus === "cancelled") {
      setError(reason || "Payment was cancelled. Your balance is unchanged.");
    } else if (paymentStatus === "failed") {
      setError(reason || "Payment failed. Your balance is unchanged.");
    }

    setSearchParams({}, { replace: true });
  }, [loadWallet, searchParams, setSearchParams]);

  const redirectToCheckout = (data) => {
    if (data.checkoutMethod === "POST" && data.checkoutFields) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.checkoutUrl;
      Object.entries(data.checkoutFields).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = String(value);
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
      return;
    }

    window.location.href = data.checkoutUrl;
  };

  const onTopup = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    setReceipt(null);
    try {
      const payload = { amount: Number(amount) };
      let response;
      if (paymentMethod === "vnpay") {
        response = await PatientApiClient.createVnpayTopup(payload);
      } else if (paymentMethod === "sepay") {
        response = await PatientApiClient.createSepayTopup(payload);
      } else {
        response = await PatientApiClient.createPayosTopup(payload);
      }
      redirectToCheckout(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Wallet</h1>
            <p>Top up with PayOS, VNPay, or SePay and use your balance when confirming bookings.</p>
          </div>
          <Link to="/patient" className="btn btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      {loading ? (
        <p>Loading wallet…</p>
      ) : (
        <>
          <div className="card wallet-balance-card">
            <p className="text-muted">Current balance</p>
            <h2 className="wallet-balance-value">{formatCurrency(wallet?.balance)}</h2>
            {(wallet?.payosMockMode || wallet?.vnpayMockMode || wallet?.sepayMockMode) && (
              <p className="text-muted">
                Payment sandbox mock mode is active for local development.
              </p>
            )}
          </div>

          {receipt && (
            <div className="card wallet-receipt-card">
              <h3>Receipt summary</h3>
              <dl className="detail-list">
                <div>
                  <dt>Reference</dt>
                  <dd>{receipt.referenceId || receipt.providerOrderId || receipt.orderCode}</dd>
                </div>
                <div>
                  <dt>Provider</dt>
                  <dd>{receipt.provider}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatCurrency(receipt.amount)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{receipt.status}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="card form-card-centered">
            <form onSubmit={onTopup} className="form">
              <fieldset className="form-section">
                <legend>Top up wallet</legend>
                <label>
                  Payment method
                  <select
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    {(wallet?.paymentMethods || []).map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount (VND)
                  <input
                    type="number"
                    min={wallet?.limits?.minTopup || 10000}
                    max={wallet?.limits?.maxTopup || 50000000}
                    step="1000"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </label>
                <p className="text-muted">
                  Min {formatCurrency(wallet?.limits?.minTopup)} · Max{" "}
                  {formatCurrency(wallet?.limits?.maxTopup)}
                </p>
              </fieldset>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? "Redirecting…"
                    : paymentMethod === "vnpay"
                      ? "Continue to VNPay"
                      : paymentMethod === "sepay"
                        ? "Continue to SePay"
                        : "Continue to PayOS"}
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <h3>Recent transactions</h3>
            {!wallet?.transactions?.length ? (
              <p className="text-muted">No transactions yet.</p>
            ) : (
              <ul className="wallet-transaction-list">
                {wallet.transactions.map((txn) => (
                  <li key={txn._id} className="wallet-transaction-item">
                    <div>
                      <strong>{txn.type === "topup" ? "Top-up" : txn.type}</strong>
                      <span>{txn.description || txn.provider}</span>
                    </div>
                    <div>
                      <strong>{formatCurrency(txn.amount)}</strong>
                      <span className={`wallet-status wallet-status-${txn.status}`}>
                        {txn.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </PageLayout>
  );
}
