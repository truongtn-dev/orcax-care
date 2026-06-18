import { Link } from "react-router-dom";
import {
  formatWalletCurrency,
  formatWalletTransactionDate,
  getTransactionCheckoutPath,
} from "../../utils/walletUtils.js";

const TYPE_LABELS = {
  topup: "Top-up",
  deduct: "Payment",
  refund: "Refund",
};

const STATUS_LABELS = {
  success: "Success",
  pending: "Pending",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function WalletTransactionList({
  transactions = [],
  emptyText = "No transactions yet.",
  onCancelPending,
}) {
  if (!transactions.length) {
    return (
      <div className="wallet-txn-empty">
        <div className="wallet-txn-empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
            <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
          </svg>
        </div>
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="wallet-txn-list">
      {transactions.map((txn) => {
        const resumePath = getTransactionCheckoutPath(txn);
        return (
          <li key={txn._id} className="wallet-txn-item">
            <div className={`wallet-txn-icon wallet-txn-icon--${txn.type}`} aria-hidden="true">
              {txn.type === "topup" ? "+" : txn.type === "refund" ? "↩" : "−"}
            </div>
            <div className="wallet-txn-main">
              <strong>{TYPE_LABELS[txn.type] || txn.type}</strong>
              {txn.createdAt && (
                <time className="wallet-txn-date" dateTime={txn.createdAt}>
                  {formatWalletTransactionDate(txn.createdAt)}
                </time>
              )}
              <span>{txn.description || txn.provider}</span>
              {txn.status === "pending" && (
                <span className="wallet-txn-pending-hint">
                  Incomplete — scan the QR or pay on the gateway to credit your wallet.
                </span>
              )}
              {resumePath && (
                <div className="wallet-txn-actions">
                  <Link to={resumePath} className="wallet-txn-resume">
                    Resume payment
                  </Link>
                  {onCancelPending && (
                    <button
                      type="button"
                      className="wallet-txn-cancel"
                      onClick={() => onCancelPending(txn)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="wallet-txn-meta">
              <strong className={txn.type === "deduct" ? "wallet-txn-amount--deduct" : ""}>
                {txn.type === "deduct" ? "−" : "+"}
                {formatWalletCurrency(txn.amount)}
              </strong>
              <span className={`wallet-txn-status wallet-txn-status--${txn.status}`}>
                {STATUS_LABELS[txn.status] || txn.status}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
