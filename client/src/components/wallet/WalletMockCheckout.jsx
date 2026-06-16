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
import WalletCancelConfirmDialog from "./WalletCancelConfirmDialog.jsx";
import { IconWalletSimulate } from "./WalletPanelIcons.jsx";
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
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [error, setError] = useState(reference ? "" : `Missing ${config?.refLabel || "reference"}.`);

  if (!config) return null;

  const onConfirm = async () => {
    setConfirming(true);
    setError("");
    try {
      await config.confirm(reference);
      navigate(`/patient/wallet?payment=success&${config.successParam(reference)}`);
    } catch (err) {
      setError(getWalletErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const openCancelConfirm = () => {
    if (confirming || cancelling) return;
    setCancelConfirmOpen(true);
  };

  const closeCancelConfirm = () => {
    if (cancelling) return;
    setCancelConfirmOpen(false);
  };

  const confirmCancelPayment = async () => {
    setCancelling(true);
    setError("");
    try {
      if (reference) {
        await PatientApiClient.cancelTopup(config.provider, reference);
      }
      setCancelConfirmOpen(false);
      navigate(
        `/patient/wallet?payment=cancelled&reason=${encodeURIComponent(config.cancelReason)}`
      );
    } catch (err) {
      setError(getWalletErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const busy = confirming || cancelling;

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
        <div className="wallet-toolbar-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm wallet-checkout-cancel-btn"
            onClick={openCancelConfirm}
            disabled={busy}
          >
            Cancel payment
          </button>
        </div>
      </WalletToolbar>

      <WalletPageBody>
        {error && <WalletAlert type="error">{error}</WalletAlert>}

        <div className="wallet-mock-stage">
          <WalletCard title="Simulate payment" lead={config.lead} icon={<IconWalletSimulate />} elevated>
            <p className="patient-section-label">{config.refLabel}</p>
            <p className="wallet-mock-ref-value">{reference || "—"}</p>
            <p className="wallet-mock-hint">
              Tap the button below to simulate a successful payment and credit your wallet.
            </p>
            <div className="wallet-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={busy || !reference}
              >
                {confirming ? "Processing…" : "Simulate successful payment"}
              </button>
              <button
                type="button"
                className="btn btn-outline wallet-checkout-cancel-btn"
                onClick={openCancelConfirm}
                disabled={busy}
              >
                Cancel payment
              </button>
            </div>
          </WalletCard>
        </div>
      </WalletPageBody>

      <WalletCancelConfirmDialog
        open={cancelConfirmOpen}
        loading={cancelling}
        provider={config.provider}
        reference={reference}
        onConfirm={confirmCancelPayment}
        onCancel={closeCancelConfirm}
      />
    </WalletShell>
  );
}
