import ConfirmDialog from "../ConfirmDialog.jsx";
import { WALLET_PROVIDER_LABELS, formatWalletCurrency } from "../../utils/walletUtils.js";

export default function WalletCancelConfirmDialog({
  open,
  loading = false,
  amount,
  provider,
  reference,
  onConfirm,
  onCancel,
}) {
  const providerLabel = provider ? WALLET_PROVIDER_LABELS[provider] || provider : "";

  return (
    <ConfirmDialog
      open={open}
      title="Cancel this top-up?"
      description="Your wallet balance will not change. You can start a new top-up from your wallet anytime."
      confirmText="Yes, cancel payment"
      cancelText="Keep paying"
      variant="danger"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <ul className="confirm-dialog-stats">
        {amount != null && (
          <li>
            <span>Amount</span>
            <strong>{formatWalletCurrency(amount)}</strong>
          </li>
        )}
        {providerLabel && (
          <li>
            <span>Payment gateway</span>
            <strong>{providerLabel}</strong>
          </li>
        )}
      </ul>
      {reference && (
        <p className="confirm-dialog-note">
          Reference: <strong>{reference}</strong>
        </p>
      )}
      <p className="confirm-dialog-warning">
        Only cancel if you have not completed the bank transfer yet. If money was already sent, wait for
        confirmation or contact support.
      </p>
    </ConfirmDialog>
  );
}
