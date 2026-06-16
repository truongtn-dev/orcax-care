import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PageLayout from "../components/PageLayout.jsx";
import WalletShell, {
  WalletAlert,
  WalletBackLink,
  WalletCard,
  WalletHero,
  WalletLoading,
  WalletPageBody,
  WalletProviderBadge,
  WalletToolbar,
} from "../components/wallet/WalletShell.jsx";
import {
  IconWalletBank,
  IconWalletHelp,
  IconWalletQrScan,
} from "../components/wallet/WalletPanelIcons.jsx";
import WalletCancelConfirmDialog from "../components/wallet/WalletCancelConfirmDialog.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import {
  WALLET_PROVIDER_LABELS,
  formatWalletCurrency,
  formatWalletExpiry,
  getWalletErrorMessage,
  isWalletQrImageSource,
} from "../utils/walletUtils.js";

function redirectToWalletSuccess(checkout) {
  const ref = checkout.orderCode || checkout.providerOrderId;
  const params = new URLSearchParams({ payment: "success" });
  if (ref) params.set(checkout.orderCode ? "orderCode" : "orderId", String(ref));
  return `/patient/wallet?${params.toString()}`;
}

export default function PatientWalletCheckoutPage() {
  const { provider, ref } = useParams();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pollStatus, setPollStatus] = useState("pending");
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const canCancel =
    checkout &&
    pollStatus !== "success" &&
    pollStatus !== "failed" &&
    pollStatus !== "cancelled" &&
    checkout.status !== "success";

  const openCancelConfirm = () => {
    if (!canCancel || cancelling) return;
    setCancelConfirmOpen(true);
  };

  const closeCancelConfirm = () => {
    if (cancelling) return;
    setCancelConfirmOpen(false);
  };

  const confirmCancelPayment = async () => {
    if (!canCancel || cancelling) return;

    setCancelling(true);
    setError("");
    try {
      await PatientApiClient.cancelTopup(provider, ref);
      setPollStatus("cancelled");
      setCancelConfirmOpen(false);
      navigate(
        `/patient/wallet?payment=cancelled&reason=${encodeURIComponent("Payment cancelled. Your balance was not changed.")}`,
        { replace: true }
      );
    } catch (err) {
      setError(getWalletErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const loadCheckout = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.getTopupCheckout(provider, ref);
      setCheckout(data);
      if (data.status === "success") {
        setPollStatus("success");
      } else if (data.status === "failed" || data.status === "cancelled") {
        setPollStatus(data.status);
      }
    } catch (err) {
      setError(getWalletErrorMessage(err));
      setCheckout(null);
    } finally {
      setLoading(false);
    }
  }, [provider, ref]);

  useEffect(() => {
    loadCheckout();
  }, [loadCheckout]);

  useEffect(() => {
    if (!checkout || pollStatus === "success" || pollStatus === "failed" || pollStatus === "cancelled") {
      return undefined;
    }

    let active = true;
    const poll = async () => {
      try {
        const { data } = await PatientApiClient.getTopupStatus(provider, ref);
        if (!active) return;
        if (data.paid) {
          setPollStatus("success");
          setTimeout(() => navigate(redirectToWalletSuccess(checkout)), 1200);
        } else if (data.status === "failed" || data.status === "cancelled") {
          setPollStatus(data.status);
        }
      } catch {
        /* keep polling */
      }
    };

    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [checkout, navigate, pollStatus, provider, ref]);

  const snapshot = checkout?.checkoutSnapshot || {};
  const providerLabel = WALLET_PROVIDER_LABELS[provider] || provider;
  const expiryText = formatWalletExpiry(snapshot.expiredAt);
  const qrCode = snapshot.qrCode;
  const scanHint =
    provider === "payos"
      ? "Scan with your banking app and confirm the exact amount."
      : "Scan VietQR and include the transfer memo shown in bank details.";
  const scanSteps =
    provider === "payos"
      ? ["Open banking app", "Scan VietQR", "Confirm amount"]
      : ["Open banking app", "Scan VietQR", "Check memo"];

  return (
    <PageLayout>
      <WalletShell variant="checkout">
        <WalletHero
          variant="checkout"
          eyebrow="Secure payment"
          title="Complete top-up"
          lead="Scan the QR code or pay on the gateway — your wallet balance updates automatically when payment succeeds."
          meta={
            <div className="wallet-hero-meta">
              <WalletProviderBadge provider={provider} />
              {checkout && (
                <span className="wallet-provider-badge" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                  {formatWalletCurrency(checkout.amount)}
                </span>
              )}
            </div>
          }
        />

        <WalletToolbar>
          <WalletBackLink to="/patient/wallet" label="Back to wallet" />
          {canCancel && (
            <div className="wallet-toolbar-actions">
              <button
                type="button"
                className="btn btn-outline btn-sm wallet-checkout-cancel-btn"
                onClick={openCancelConfirm}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling…" : "Cancel payment"}
              </button>
            </div>
          )}
        </WalletToolbar>

        <WalletPageBody>
          {error && (
            <WalletAlert type="error" title="Could not load checkout" onRetry={loadCheckout}>
              {error}
            </WalletAlert>
          )}

          {loading ? (
            <WalletLoading label="Loading payment details…" />
          ) : checkout ? (
            <div className="wallet-checkout-stage">
              <WalletCard
                className="wallet-checkout-pay-panel"
                title="Scan to pay"
                lead={`Pay with ${providerLabel} — balance updates automatically after confirmation.`}
                icon={<IconWalletQrScan />}
                elevated
              >
                {qrCode ? (
                  <div className={`wallet-checkout-pay-stage wallet-checkout-pay-stage--${provider}`}>
                    <div className="wallet-checkout-pay-stage-head">
                      <div className="wallet-checkout-pay-amount">
                        <span className="patient-section-label">Top-up amount</span>
                        <strong>{formatWalletCurrency(checkout.amount)}</strong>
                      </div>
                      <WalletProviderBadge provider={provider} />
                    </div>

                    <div className="wallet-checkout-pay-stage-body">
                      <span className="wallet-checkout-vietqr-badge">VietQR</span>
                      <div className="wallet-checkout-qr-shell">
                        {isWalletQrImageSource(qrCode) ? (
                          <img src={qrCode} alt={`${providerLabel} VietQR code`} className="wallet-checkout-qr-img" />
                        ) : (
                          <QRCodeSVG value={qrCode} size={240} level="M" includeMargin className="wallet-checkout-qr-svg" />
                        )}
                      </div>

                      <p className="wallet-checkout-qr-hint">{scanHint}</p>

                      <div className="wallet-checkout-scan-steps" aria-label="Quick steps">
                        {scanSteps.map((step) => (
                          <span key={step} className="wallet-checkout-scan-step">
                            {step}
                          </span>
                        ))}
                      </div>

                      {provider === "payos" && snapshot.checkoutUrl && (
                        <a
                          href={snapshot.checkoutUrl}
                          className="btn btn-outline btn-sm wallet-checkout-alt-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open PayOS page
                        </a>
                      )}
                    </div>

                    {(expiryText || canCancel) && (
                      <div className="wallet-checkout-pay-stage-foot">
                        {expiryText && (
                          <p className="wallet-checkout-timer">Link expires: {expiryText}</p>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm wallet-checkout-cancel-btn"
                            onClick={openCancelConfirm}
                            disabled={cancelling}
                          >
                            {cancelling ? "Cancelling…" : "Cancel payment"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="wallet-checkout-pay-stage wallet-checkout-pay-stage--error">
                    <p>
                      Could not load the payment QR code. Cancel this transaction and try again from your wallet.
                    </p>
                    {canCancel && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm wallet-checkout-cancel-btn"
                        onClick={openCancelConfirm}
                        disabled={cancelling}
                      >
                        {cancelling ? "Cancelling…" : "Cancel payment"}
                      </button>
                    )}
                  </div>
                )}
              </WalletCard>

              <div className="wallet-checkout-side">
                <WalletCard
                  title="How to pay"
                  lead={`Steps for ${providerLabel}`}
                  icon={<IconWalletHelp />}
                  elevated
                >
                  {provider === "payos" ? (
                    <ol className="wallet-checkout-steps">
                      <li>Open your banking app on your phone.</li>
                      <li>Choose Scan QR / VietQR.</li>
                      <li>Scan the code on the left and confirm the amount.</li>
                      <li>Keep this page open — payment is detected automatically.</li>
                    </ol>
                  ) : (
                    <ol className="wallet-checkout-steps">
                      <li>Open your banking app on your phone.</li>
                      <li>Choose Scan QR / VietQR.</li>
                      <li>Scan the code on the left — check the amount and transfer memo.</li>
                      <li>Keep this page open — SePay confirmation is detected automatically.</li>
                    </ol>
                  )}
                </WalletCard>

                {(snapshot.accountNumber ||
                  snapshot.accountName ||
                  snapshot.transferContent ||
                  snapshot.bin) && (
                  <WalletCard title="Bank transfer details" icon={<IconWalletBank />} elevated>
                    <div className="wallet-checkout-bank">
                      {snapshot.accountName && (
                        <div className="wallet-checkout-bank-row">
                          <span>Account name</span>
                          <strong>{snapshot.accountName}</strong>
                        </div>
                      )}
                      {snapshot.accountNumber && (
                        <div className="wallet-checkout-bank-row">
                          <span>Account number</span>
                          <strong>{snapshot.accountNumber}</strong>
                        </div>
                      )}
                      {snapshot.bin && (
                        <div className="wallet-checkout-bank-row">
                          <span>Bank code (BIN)</span>
                          <strong>{snapshot.bin}</strong>
                        </div>
                      )}
                      {snapshot.transferContent && (
                        <div className="wallet-checkout-bank-row">
                          <span>Transfer memo</span>
                          <strong>{snapshot.transferContent}</strong>
                        </div>
                      )}
                      <div className="wallet-checkout-bank-row">
                        <span>Order ID</span>
                        <strong>{checkout.orderCode || checkout.providerOrderId}</strong>
                      </div>
                    </div>
                  </WalletCard>
                )}

                <div
                  className={`wallet-checkout-status wallet-checkout-status--${
                    pollStatus === "success"
                      ? "success"
                      : pollStatus === "failed" || pollStatus === "cancelled"
                        ? "failed"
                        : "pending"
                  }`}
                >
                  {pollStatus === "success" ? (
                    <>Payment received. Returning to wallet…</>
                  ) : pollStatus === "failed" || pollStatus === "cancelled" ? (
                    <>Payment {pollStatus === "cancelled" ? "cancelled" : "failed"}. Try again from the wallet page.</>
                  ) : (
                    <>
                      <span className="wallet-checkout-spinner" aria-hidden="true" />
                      Waiting for payment confirmation…
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </WalletPageBody>

        <WalletCancelConfirmDialog
          open={cancelConfirmOpen}
          loading={cancelling}
          amount={checkout?.amount}
          provider={provider}
          reference={checkout?.orderCode || checkout?.providerOrderId || ref}
          onConfirm={confirmCancelPayment}
          onCancel={closeCancelConfirm}
        />
      </WalletShell>
    </PageLayout>
  );
}
