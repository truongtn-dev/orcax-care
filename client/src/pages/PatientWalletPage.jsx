import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import WalletShell, {
  WalletAlert,
  WalletCard,
  WalletHero,
  WalletLoading,
  WalletPageBody,
} from "../components/wallet/WalletShell.jsx";
import WalletPaymentMethodPicker from "../components/wallet/WalletPaymentMethodPicker.jsx";
import WalletTransactionList from "../components/wallet/WalletTransactionList.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import {
  WALLET_AMOUNT_PRESETS,
  WALLET_LIMITS,
  WALLET_PAYMENT_METHODS,
  formatWalletCurrency,
  getWalletErrorMessage,
  resolveCheckoutPath,
} from "../utils/walletUtils.js";

export default function PatientWalletPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState("100000");
  const [paymentMethod, setPaymentMethod] = useState("payos");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState(null);

  const minTopup = wallet?.limits?.minTopup ?? WALLET_LIMITS.minTopup;
  const maxTopup = wallet?.limits?.maxTopup ?? WALLET_LIMITS.maxTopup;

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await PatientApiClient.getWallet();
      setWallet(data);
    } catch (err) {
      setLoadError(getWalletErrorMessage(err));
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  const enabledMethods = WALLET_PAYMENT_METHODS.filter((method) => {
    const remote = wallet?.paymentMethods?.find((item) => item.id === method.id);
    return remote ? remote.enabled : true;
  });

  useEffect(() => {
    if (!enabledMethods.length) return;
    if (!enabledMethods.some((method) => method.id === paymentMethod)) {
      setPaymentMethod(enabledMethods[0].id);
    }
  }, [enabledMethods, paymentMethod]);

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
      setFormError(reason || "Payment cancelled. Your balance was not changed.");
    } else if (paymentStatus === "failed") {
      setFormError(reason || "Payment failed. Your balance was not changed.");
    }

    setSearchParams({}, { replace: true });
  }, [loadWallet, searchParams, setSearchParams]);

  const onTopup = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    setNotice("");
    setReceipt(null);
    try {
      const payload = { amount: Number(amount) };
      let response;
      if (paymentMethod === "sepay") {
        response = await PatientApiClient.createSepayTopup(payload);
      } else {
        response = await PatientApiClient.createPayosTopup(payload);
      }
      const checkoutPath =
        response.data.checkoutPath || resolveCheckoutPath(response.data.checkoutUrl);
      if (!checkoutPath) {
        throw new Error("No checkout link returned from the server.");
      }
      navigate(checkoutPath);
    } catch (err) {
      setFormError(getWalletErrorMessage(err));
      setSubmitting(false);
    }
  };

  const handleCancelPending = async (txn) => {
    const ref = txn.provider === "payos" ? txn.orderCode : txn.providerOrderId;
    if (!ref) return;
    try {
      await PatientApiClient.cancelTopup(txn.provider, ref);
      await loadWallet();
    } catch (err) {
      setFormError(getWalletErrorMessage(err));
    }
  };

  const submitLabel =
    paymentMethod === "payos" ? "Continue — scan QR" : "Continue with SePay";

  return (
    <PageLayout>
      <WalletShell>
        <WalletHero
          eyebrow="Patient wallet"
          title="OrcaXCare Wallet"
          lead="Top up securely via PayOS VietQR or SePay. Balance is used when you confirm an appointment."
          balance={formatWalletCurrency(wallet?.balance)}
          balanceLoading={loading}
          actions={
            <div className="wallet-hero-actions">
              <Link
                to="/patient"
                className="btn btn-outline btn-sm"
                style={{ color: "#fff", borderColor: "rgba(255,255,255,0.45)" }}
              >
                Back to dashboard
              </Link>
            </div>
          }
        />

        <WalletPageBody>
        {loadError && (
          <WalletAlert type="error" title="Could not load wallet" onRetry={loadWallet}>
            {loadError}
          </WalletAlert>
        )}
        {formError && (
          <WalletAlert type="error" title="Payment unsuccessful">{formError}</WalletAlert>
        )}
        {notice && <WalletAlert type="success" title="Success">{notice}</WalletAlert>}

        {receipt && (
          <div className="wallet-receipt">
            <h3>Transaction receipt</h3>
            <div className="wallet-receipt-grid">
              <div className="wallet-receipt-item">
                <span>Reference</span>
                <strong>{receipt.referenceId || receipt.providerOrderId || receipt.orderCode}</strong>
              </div>
              <div className="wallet-receipt-item">
                <span>Payment gateway</span>
                <strong>{receipt.provider}</strong>
              </div>
              <div className="wallet-receipt-item">
                <span>Amount</span>
                <strong>{formatWalletCurrency(receipt.amount)}</strong>
              </div>
              <div className="wallet-receipt-item">
                <span>Status</span>
                <strong>{receipt.status}</strong>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <WalletLoading label="Loading wallet…" />
        ) : (
          <div className="wallet-layout">
            <WalletCard
              title="Top up wallet"
              lead="Choose a payment gateway and amount. PayOS shows a VietQR code on the checkout page to scan."
              elevated
            >
              <form onSubmit={onTopup} className="wallet-topup-form">
                <section className="wallet-form-block">
                  <h3 className="wallet-form-block-title">Payment method</h3>
                  <WalletPaymentMethodPicker
                    methods={enabledMethods}
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                  />
                  {!enabledMethods.length && (
                    <WalletAlert type="error" title="Not ready">
                      Payment gateways are not configured. Please contact support.
                    </WalletAlert>
                  )}
                </section>

                <section className="wallet-form-block">
                  <h3 className="wallet-form-block-title">Amount (VND)</h3>
                  <div className="wallet-presets">
                    {WALLET_AMOUNT_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`wallet-preset ${Number(amount) === preset ? "is-active" : ""}`}
                        onClick={() => setAmount(String(preset))}
                      >
                        {formatWalletCurrency(preset)}
                      </button>
                    ))}
                  </div>
                  <div className="wallet-amount-field">
                    <label>
                      Custom amount
                      <input
                        type="number"
                        min={minTopup}
                        max={maxTopup}
                        step="1000"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        required
                      />
                    </label>
                    <p className="wallet-amount-hint">
                      Min {formatWalletCurrency(minTopup)} · Max {formatWalletCurrency(maxTopup)}
                    </p>
                  </div>
                </section>

                <div className="wallet-form-footer">
                  <button type="submit" className="btn btn-primary" disabled={submitting || !enabledMethods.length}>
                    {submitting ? "Creating transaction…" : submitLabel}
                  </button>
                </div>
              </form>
            </WalletCard>

            <WalletCard title="Recent transactions" elevated variant="transactions">
              <WalletTransactionList
                transactions={wallet?.transactions}
                emptyText="No transactions yet. Top up to get started."
                onCancelPending={handleCancelPending}
              />
            </WalletCard>
          </div>
        )}
        </WalletPageBody>
      </WalletShell>
    </PageLayout>
  );
}
