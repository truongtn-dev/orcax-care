import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import {
  WalletAlert,
  WalletCard,
  WalletLoading,
} from "../components/wallet/WalletShell.jsx";
import WalletPaymentMethodPicker from "../components/wallet/WalletPaymentMethodPicker.jsx";
import WalletTransactionList from "../components/wallet/WalletTransactionList.jsx";
import DatePicker from "../components/DatePicker.jsx";
import CustomSelect from "../components/CustomSelect.jsx";
import { IconWalletReceipt, IconWalletTopup, IconWalletTransactions } from "../components/wallet/WalletPanelIcons.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import {
  WALLET_AMOUNT_PRESETS,
  WALLET_LIMITS,
  WALLET_PAYMENT_METHODS,
  WALLET_TXN_TYPE_OPTIONS,
  computeWalletStats,
  formatWalletCurrency,
  getWalletErrorMessage,
  resolveCheckoutPath,
} from "../utils/walletUtils.js";
import "../styles/patient.shared.css";
import "../styles/wallet.shared.css";
import "./PatientWalletPage.css";

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
      <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
    </svg>
  );
}

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
  const [txnFilters, setTxnFilters] = useState({ type: "", from: "", to: "" });
  const [txnFilterDraft, setTxnFilterDraft] = useState({ type: "", from: "", to: "" });
  const [txnLoading, setTxnLoading] = useState(false);
  const isInitialWalletLoad = useRef(true);

  const minTopup = wallet?.limits?.minTopup ?? WALLET_LIMITS.minTopup;
  const maxTopup = wallet?.limits?.maxTopup ?? WALLET_LIMITS.maxTopup;

  const stats = useMemo(() => {
    if (wallet?.stats) return wallet.stats;
    return computeWalletStats(wallet?.transactions || []);
  }, [wallet?.stats, wallet?.transactions]);

  const walletStatus = useMemo(() => {
    if (loading) return { label: "Loading…", tone: "pending" };
    if (loadError) return { label: "Unavailable", tone: "error" };
    if (stats.pendingTopups > 0) return { label: "Pending top-up", tone: "pending" };
    return { label: "Ready to pay", tone: "active" };
  }, [loading, loadError, stats.pendingTopups]);

  const loadWallet = useCallback(async (filters, { silent = false } = {}) => {
    const activeFilters = filters || { type: "", from: "", to: "" };
    if (!silent) setLoading(true);
    else setTxnLoading(true);
    setLoadError("");
    try {
      const params = { limit: 100 };
      if (activeFilters.type) params.type = activeFilters.type;
      if (activeFilters.from) params.from = activeFilters.from;
      if (activeFilters.to) params.to = activeFilters.to;
      const { data } = await PatientApiClient.getWallet(params);
      setWallet(data);
    } catch (err) {
      setLoadError(getWalletErrorMessage(err));
      if (!silent) setWallet(null);
    } finally {
      if (!silent) setLoading(false);
      else setTxnLoading(false);
    }
  }, []);

  useEffect(() => {
    const silent = !isInitialWalletLoad.current;
    loadWallet(txnFilters, { silent }).finally(() => {
      isInitialWalletLoad.current = false;
    });
  }, [loadWallet, txnFilters]);

  const refreshWallet = () => loadWallet(txnFilters);

  const applyTxnFilters = () => {
    setTxnFilters({ ...txnFilterDraft });
  };

  const clearTxnFilters = () => {
    const empty = { type: "", from: "", to: "" };
    setTxnFilterDraft(empty);
    setTxnFilters(empty);
  };

  const hasActiveTxnFilters = Boolean(txnFilters.type || txnFilters.from || txnFilters.to);
  const txnFilterDraftDirty =
    txnFilterDraft.type !== txnFilters.type
    || txnFilterDraft.from !== txnFilters.from
    || txnFilterDraft.to !== txnFilters.to;

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
      loadWallet(txnFilters, { silent: true });
    } else if (paymentStatus === "cancelled") {
      setFormError(reason || "Payment cancelled. Your balance was not changed.");
    } else if (paymentStatus === "failed") {
      setFormError(reason || "Payment failed. Your balance was not changed.");
    }

    setSearchParams({}, { replace: true });
  }, [loadWallet, searchParams, setSearchParams, txnFilters]);

  const scrollToTopup = () => {
    document.getElementById("wallet-topup")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      await loadWallet(txnFilters, { silent: true });
    } catch (err) {
      setFormError(getWalletErrorMessage(err));
    }
  };

  const submitLabel =
    paymentMethod === "payos" ? "Continue — scan QR" : "Continue with SePay";

  return (
    <PageLayout>
      <div className="patient-wallet-fullpage">
        <div className="patient-wallet-toolbar">
          <Link to="/patient" className="patient-wallet-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            My dashboard
          </Link>
          <button
            type="button"
            className={`patient-wallet-refresh${loading ? " is-spinning" : ""}`}
            onClick={refreshWallet}
            disabled={loading}
            aria-label="Refresh wallet"
          >
            <RefreshIcon />
          </button>
        </div>

        <section className="patient-wallet-hero" aria-label="Wallet overview">
          <span className="patient-wallet-hero-orb patient-wallet-hero-orb--1" aria-hidden="true" />
          <span className="patient-wallet-hero-orb patient-wallet-hero-orb--2" aria-hidden="true" />

          <div className="patient-wallet-hero-inner">
            <div className="patient-wallet-hero-main">
              <div className="patient-wallet-hero-icon" aria-hidden="true">
                <WalletIcon />
              </div>
              <div>
                <p className="patient-wallet-eyebrow">Payments & insurance</p>
                <h1>Wallet</h1>
                <p className="patient-wallet-hero-lead">
                  Manage your balance, top up via PayOS or SePay, and review transactions.
                </p>
                <span className={`patient-wallet-status patient-wallet-status--${walletStatus.tone}`}>
                  <span className="patient-wallet-status-dot" aria-hidden="true" />
                  {walletStatus.label}
                </span>
              </div>
            </div>

            <div className="patient-wallet-hero-balance">
              <span className="patient-wallet-hero-balance-label">Current balance</span>
              <strong className={loading ? "is-loading" : ""}>
                {loading ? "…" : formatWalletCurrency(wallet?.balance ?? 0)}
              </strong>
              <button type="button" className="patient-wallet-topup-btn" onClick={scrollToTopup}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Top up
              </button>
            </div>
          </div>
        </section>

        <div className="patient-wallet-page-body">
        {loadError && (
          <WalletAlert type="error" title="Could not load wallet" onRetry={refreshWallet}>
            {loadError}
          </WalletAlert>
        )}
        {formError && (
          <WalletAlert type="error" title="Payment unsuccessful">{formError}</WalletAlert>
        )}
        {notice && <WalletAlert type="success" title="Success">{notice}</WalletAlert>}

        <div className="patient-wallet-stats">
          <div className="patient-wallet-stat">
            <span className="patient-wallet-stat-icon patient-wallet-stat-icon--up" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="m18 15-6-6-6 6" />
              </svg>
            </span>
            <div>
              <span className="patient-wallet-stat-value">
                {loading ? "…" : formatWalletCurrency(stats.totalTopup)}
              </span>
              <span className="patient-wallet-stat-label">Total topped up</span>
            </div>
          </div>
          <div className="patient-wallet-stat">
            <span className="patient-wallet-stat-icon patient-wallet-stat-icon--down" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
            <div>
              <span className="patient-wallet-stat-value">
                {loading ? "…" : formatWalletCurrency(stats.totalSpent)}
              </span>
              <span className="patient-wallet-stat-label">Total spent</span>
            </div>
          </div>
          <div className="patient-wallet-stat">
            <span className="patient-wallet-stat-icon patient-wallet-stat-icon--pending" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </span>
            <div>
              <span className="patient-wallet-stat-value">{loading ? "…" : stats.pendingTopups}</span>
              <span className="patient-wallet-stat-label">Pending top-ups</span>
            </div>
          </div>
        </div>

        <section aria-label="Quick actions">
          <h2 className="patient-wallet-section-title">Quick actions</h2>
          <div className="patient-wallet-quick-grid">
            <button type="button" className="patient-wallet-quick patient-wallet-quick--emerald patient-wallet-quick--button" onClick={scrollToTopup}>
              <span className="patient-wallet-quick-icon patient-wallet-quick-icon--emerald" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v8" />
                  <path d="M8 12h8" />
                </svg>
              </span>
              <h3>Top up wallet</h3>
              <p>Add funds via PayOS or SePay</p>
              <span className="patient-wallet-quick-arrow">Go to top-up →</span>
            </button>
            <Link to="/patient/book" className="patient-wallet-quick patient-wallet-quick--cyan">
              <span className="patient-wallet-quick-icon patient-wallet-quick-icon--cyan" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M12 14v4" />
                  <path d="M10 16h4" />
                </svg>
              </span>
              <h3>Book appointment</h3>
              <p>Pay for a consultation slot</p>
              <span className="patient-wallet-quick-arrow">Start booking →</span>
            </Link>
            <Link to="/patient/appointments" className="patient-wallet-quick patient-wallet-quick--violet">
              <span className="patient-wallet-quick-icon patient-wallet-quick-icon--violet" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 2v4" />
                  <path d="M16 2v4" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>
              </span>
              <h3>My appointments</h3>
              <p>View and manage your bookings</p>
              <span className="patient-wallet-quick-arrow">View visits →</span>
            </Link>
          </div>
        </section>

        {receipt && (
          <div className="wallet-receipt">
            <div className="wallet-receipt-head patient-panel-head">
              <span className="patient-panel-icon" aria-hidden="true">
                <IconWalletReceipt />
              </span>
              <div className="patient-panel-head-main">
                <h3 className="patient-panel-title">Transaction receipt</h3>
              </div>
            </div>
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
          <WalletLoading label="Loading wallet details…" />
        ) : (
          <div className="patient-wallet-panels">
            <div id="wallet-topup">
            <WalletCard
              title="Top up wallet"
              lead="Choose a payment gateway and amount. PayOS shows a VietQR code on checkout."
              icon={<IconWalletTopup />}
              elevated
            >
              <form onSubmit={onTopup} className="wallet-topup-form">
                <section className="patient-form-block">
                  <p className="patient-section-label">Payment method</p>
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

                <section className="patient-form-block">
                  <p className="patient-section-label">Amount (VND)</p>
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
            </div>

            <WalletCard
              title="Transaction history"
              icon={<IconWalletTransactions />}
              elevated
              variant="transactions"
            >
              <div className="wallet-txn-filters" aria-label="Transaction filters">
                <div className="wallet-txn-filters-fields">
                  <CustomSelect
                    label="Type"
                    value={txnFilterDraft.type}
                    onChange={(type) =>
                      setTxnFilterDraft((prev) => ({
                        ...prev,
                        type,
                      }))
                    }
                    options={WALLET_TXN_TYPE_OPTIONS}
                  />
                  <DatePicker
                    label="From"
                    name="txnFrom"
                    value={txnFilterDraft.from}
                    onChange={(event) =>
                      setTxnFilterDraft((prev) => ({
                        ...prev,
                        from: event.target.value,
                      }))
                    }
                    max={txnFilterDraft.to || undefined}
                    placeholder="Start date"
                  />
                  <DatePicker
                    label="To"
                    name="txnTo"
                    value={txnFilterDraft.to}
                    onChange={(event) =>
                      setTxnFilterDraft((prev) => ({
                        ...prev,
                        to: event.target.value,
                      }))
                    }
                    min={txnFilterDraft.from || undefined}
                    placeholder="End date"
                  />
                </div>
                <div className="wallet-txn-filters-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={applyTxnFilters}
                    disabled={!txnFilterDraftDirty || txnLoading}
                  >
                    Apply filters
                  </button>
                  {hasActiveTxnFilters && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={clearTxnFilters}
                      disabled={txnLoading}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="wallet-txn-scroll">
                {txnLoading ? (
                  <WalletLoading label="Loading transactions…" />
                ) : (
                  <WalletTransactionList
                    transactions={wallet?.transactions}
                    emptyText={
                      hasActiveTxnFilters
                        ? "No transactions match these filters."
                        : "No transactions yet. Top up to get started."
                    }
                    onCancelPending={handleCancelPending}
                  />
                )}
              </div>
            </WalletCard>
          </div>
        )}
        </div>
      </div>
    </PageLayout>
  );
}
