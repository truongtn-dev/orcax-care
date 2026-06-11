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
              <WalletCard className="wallet-checkout-pay-panel" elevated>
                <div className="wallet-checkout-summary">
                  <div>
                    <span>Top-up amount</span>
                    <p className="wallet-checkout-amount">{formatWalletCurrency(checkout.amount)}</p>
                  </div>
                  <WalletProviderBadge provider={provider} />
                </div>
                <p className="wallet-card-lead" style={{ margin: 0 }}>
                  {checkout.description}
                </p>

                {provider === "payos" && snapshot.qrCode && (
                  <div className="wallet-checkout-qr-wrap">
                    <div className="wallet-checkout-qr">
                      {isWalletQrImageSource(snapshot.qrCode) ? (
                        <img src={snapshot.qrCode} alt="PayOS VietQR code" />
                      ) : (
                        <QRCodeSVG value={snapshot.qrCode} size={280} level="M" includeMargin />
                      )}
                    </div>
                    <p className="wallet-checkout-qr-hint">
                      Open your banking app → Scan QR / VietQR → Confirm the amount shown.
                    </p>
                    {snapshot.checkoutUrl && (
                      <a
                        href={snapshot.checkoutUrl}
                        className="btn btn-outline btn-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open PayOS page
                      </a>
                    )}
                  </div>
                )}

                {provider === "sepay" && snapshot.qrCode && (
                  <div className="wallet-checkout-qr-wrap">
                    <div className="wallet-checkout-qr">
                      {isWalletQrImageSource(snapshot.qrCode) ? (
                        <img src={snapshot.qrCode} alt="SePay VietQR code" />
                      ) : (
                        <QRCodeSVG value={snapshot.qrCode} size={280} level="M" includeMargin />
                      )}
                    </div>
                    <p className="wallet-checkout-qr-hint">
                      Open your banking app → Scan VietQR → Confirm the amount and transfer memo.
                    </p>
                  </div>
                )}

                {provider === "sepay" && !snapshot.qrCode && (
                  <div className="wallet-sepay-launcher wallet-sepay-launcher--error">
                    <p>Could not load the SePay QR code. Cancel the transaction and try again from the wallet page.</p>
                  </div>
                )}

                {expiryText && (
                  <p className="wallet-checkout-timer">Payment link expires: {expiryText}</p>
                )}
              </WalletCard>

              <div className="wallet-checkout-side">
                <WalletCard title={`How to pay — ${providerLabel}`}>
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
                  <WalletCard title="Bank transfer details">
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
      </WalletShell>
    </PageLayout>
  );
}
