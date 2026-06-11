import { useState } from "react";
import { useNavigate } from "react-router-dom";
import WalletShell, {
  WalletAlert,
  WalletBackLink,
  WalletCard,
  WalletHero,
  WalletPageBody,
  WalletProviderBadge,
  WalletToolbar,
} from "./WalletShell.jsx";
import { PatientApiClient } from "../../services/patientApi.js";
import { getWalletErrorMessage } from "../../utils/walletUtils.js";

const MOCK_CONFIG = {
  payos: {
    provider: "payos",
    title: "PayOS sandbox",
    lead: "Dev simulation page. No real money is charged.",
    refLabel: "Order code",
    confirm: (ref) => PatientApiClient.confirmMockPayosTopup({ orderCode: Number(ref) }),
    successParam: (ref) => `orderCode=${ref}`,
    cancelReason: "Mock PayOS payment cancelled",
  },
  sepay: {
    provider: "sepay",
    title: "SePay sandbox",
    lead: "Dev SePay simulation. No real bank transfer is made.",
    refLabel: "Transaction ID",
    confirm: (ref) => PatientApiClient.confirmMockSepayTopup({ orderId: ref }),
    successParam: (ref) => `orderId=${ref}`,
    cancelReason: "Mock SePay payment cancelled",
  },
};

export default function WalletMockCheckout({ provider, reference }) {
  const navigate = useNavigate();
  const config = MOCK_CONFIG[provider];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(reference ? "" : `Missing ${config?.refLabel || "reference"}.`);

  if (!config) return null;

  const onConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      await config.confirm(reference);
      navigate(`/patient/wallet?payment=success&${config.successParam(reference)}`);
    } catch (err) {
      setError(getWalletErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    navigate(`/patient/wallet?payment=cancelled&reason=${encodeURIComponent(config.cancelReason)}`);
  };

  return (
    <WalletShell variant="checkout">
      <WalletHero
        eyebrow="Dev sandbox"
        title={config.title}
        lead={config.lead}
        variant="slate"
        meta={
          <div className="wallet-hero-meta">
            <WalletProviderBadge provider={config.provider} />
          </div>
        }
      />

      <WalletToolbar>
        <WalletBackLink to="/patient/wallet" label="Back to wallet" />
      </WalletToolbar>

      <WalletPageBody>
        {error && <WalletAlert type="error">{error}</WalletAlert>}

        <div className="wallet-mock-stage">
          <WalletCard elevated>
            <div className="wallet-mock-ref">
              <span>{config.refLabel}</span>
              <strong>{reference || "—"}</strong>
            </div>
            <p className="wallet-mock-hint">
              Tap the button below to simulate a successful payment and credit your wallet.
            </p>
            <div className="wallet-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={loading || !reference}
              >
                {loading ? "Processing…" : "Simulate successful payment"}
              </button>
              <button type="button" className="btn btn-outline" onClick={onCancel} disabled={loading}>
                Cancel payment
              </button>
            </div>
          </WalletCard>
        </div>
      </WalletPageBody>
    </WalletShell>
  );
}
