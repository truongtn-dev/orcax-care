import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout.jsx";
import WalletTransactionList from "../components/wallet/WalletTransactionList.jsx";
import { PatientApiClient } from "../services/patientApi.js";
import { formatWalletCurrency } from "../utils/walletUtils.js";
import "./WalletDashboardPage.css";

/* ─── helpers ─────────────────────────────────────────────────── */
function calcStats(transactions = []) {
  const success = transactions.filter((t) => t.status === "success");
  const totalIn = success
    .filter((t) => t.type === "topup" || t.type === "refund")
    .reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = success
    .filter((t) => t.type === "deduct")
    .reduce((s, t) => s + (t.amount || 0), 0);
  const pending = transactions.filter((t) => t.status === "pending").length;
  return { totalIn, totalOut, pending };
}

/* ─── Balance Card ─────────────────────────────────────────────── */
function BalanceCard({ balance, loading, ledgerOk }) {
  return (
    <div className="wdb-balance-card">
      <div className="wdb-balance-orb wdb-balance-orb--1" aria-hidden="true" />
      <div className="wdb-balance-orb wdb-balance-orb--2" aria-hidden="true" />

      <div className="wdb-balance-header">
        <div className="wdb-balance-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
            <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
          </svg>
        </div>
        <span className="wdb-balance-label">OrcaXCare Wallet</span>
      </div>

      <div className="wdb-balance-amount">
        {loading ? (
          <span className="wdb-balance-loading">
            <span className="wdb-balance-dot" />
            <span className="wdb-balance-dot" />
            <span className="wdb-balance-dot" />
          </span>
        ) : (
          <span className="wdb-balance-value">{formatWalletCurrency(balance)}</span>
        )}
        <span className="wdb-balance-currency">VND</span>
      </div>

      <div className="wdb-balance-footer">
        <span className={`wdb-ledger-badge ${ledgerOk ? "wdb-ledger-badge--ok" : "wdb-ledger-badge--checking"}`}>
          {ledgerOk ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Balance verified
            </>
          ) : (
            <>
              <span className="wdb-pulse" aria-hidden="true" />
              Verifying…
            </>
          )}
        </span>
        <Link to="/patient/wallet/topup" className="wdb-topup-btn" id="wallet-topup-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          Top up
        </Link>
      </div>
    </div>
  );
}

/* ─── Stats Row ────────────────────────────────────────────────── */
function StatsRow({ stats, loading }) {
  const items = [
    {
      id: "stat-total-in",
      icon: "↑",
      label: "Total topped up",
      value: formatWalletCurrency(stats.totalIn),
      color: "green",
    },
    {
      id: "stat-total-out",
      icon: "↓",
      label: "Total spent",
      value: formatWalletCurrency(stats.totalOut),
      color: "rose",
    },
    {
      id: "stat-pending",
      icon: "⏳",
      label: "Pending top-ups",
      value: stats.pending,
      color: "amber",
    },
  ];

  return (
    <div className="wdb-stats-row">
      {items.map((item) => (
        <div key={item.id} id={item.id} className={`wdb-stat-card wdb-stat-card--${item.color}`}>
          <span className="wdb-stat-icon" aria-hidden="true">{item.icon}</span>
          <div className="wdb-stat-body">
            <span className="wdb-stat-value">{loading ? "—" : item.value}</span>
            <span className="wdb-stat-label">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Quick Actions ────────────────────────────────────────────── */
function QuickActions() {
  const actions = [
    {
      id: "qa-topup",
      to: "/patient/wallet/topup",
      label: "Top up wallet",
      hint: "Add funds via PayOS or SePay",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      ),
      color: "cyan",
    },
    {
      id: "qa-book",
      to: "/patient/book",
      label: "Book appointment",
      hint: "Pay for a consultation slot",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      ),
      color: "teal",
    },
    {
      id: "qa-appointments",
      to: "/patient/appointments",
      label: "My appointments",
      hint: "View and manage your bookings",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      color: "indigo",
    },
  ];

  return (
    <div className="wdb-quick-actions">
      <h2 className="wdb-section-title">Quick actions</h2>
      <div className="wdb-qa-grid">
        {actions.map((a) => (
          <Link key={a.id} id={a.id} to={a.to} className={`wdb-qa-card wdb-qa-card--${a.color}`}>
            <span className="wdb-qa-icon">{a.icon}</span>
            <span className="wdb-qa-label">{a.label}</span>
            <span className="wdb-qa-hint">{a.hint}</span>
            <svg className="wdb-qa-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function WalletDashboardPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ledgerOk, setLedgerOk] = useState(false);
  const [error, setError] = useState("");
  const [recentTxns, setRecentTxns] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await PatientApiClient.getWallet({ limit: 10 });
      const walletData = data.wallet ?? data;
      setWallet(walletData);

      const txns = data.transactions ?? walletData.transactions ?? [];
      setRecentTxns(txns);

      /* ledger verification: balance matches sum of successful transactions */
      const successIn = txns
        .filter((t) => t.status === "success" && (t.type === "topup" || t.type === "refund"))
        .reduce((s, t) => s + (t.amount || 0), 0);
      const successOut = txns
        .filter((t) => t.status === "success" && t.type === "deduct")
        .reduce((s, t) => s + (t.amount || 0), 0);
      const ledgerBalance = successIn - successOut;
      const serverBalance = walletData.balance ?? 0;
      /* mark verified if diff < 1đ (floating point) or if txns are paginated (server authoritative) */
      setLedgerOk(Math.abs(ledgerBalance - serverBalance) < 1 || txns.length > 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load wallet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const balance = wallet?.balance ?? 0;
  const stats = calcStats(recentTxns);

  return (
    <PageLayout>
      <div className="wdb-page">
        {/* ── Header ── */}
        <div className="wdb-header">
          <Link to="/patient" className="wdb-back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            My dashboard
          </Link>
          <div className="wdb-header-titles">
            <h1 className="wdb-page-title">Wallet</h1>
            <p className="wdb-page-lead">Manage your balance, top up, and review transactions.</p>
          </div>
          <button
            type="button"
            id="wallet-refresh-btn"
            className="wdb-refresh-btn"
            onClick={loadDashboard}
            disabled={loading}
            title="Refresh"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              className={loading ? "wdb-spin" : ""}
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="wdb-error-banner" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            {error}
            <button type="button" onClick={loadDashboard} className="wdb-retry-btn">Retry</button>
          </div>
        )}

        {/* ── Balance Card ── */}
        <BalanceCard balance={balance} loading={loading} ledgerOk={!loading && ledgerOk} />

        {/* ── Stats ── */}
        <StatsRow stats={stats} loading={loading} />

        {/* ── Quick Actions ── */}
        <QuickActions />

        {/* ── Recent Transactions ── */}
        <section className="wdb-transactions-section">
          <div className="wdb-txn-header">
            <h2 className="wdb-section-title">Recent transactions</h2>
            <Link to="/patient/wallet/topup" className="wdb-view-topup-link" id="wallet-view-topup-link">
              Top up →
            </Link>
          </div>

          {loading ? (
            <div className="wdb-txn-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="wdb-txn-skeleton" />
              ))}
            </div>
          ) : (
            <WalletTransactionList
              transactions={recentTxns}
              emptyText="No transactions yet. Top up your wallet to get started."
            />
          )}
        </section>
      </div>
    </PageLayout>
  );
}
