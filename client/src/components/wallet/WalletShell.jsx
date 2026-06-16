import { Link } from "react-router-dom";
import "../../styles/wallet.shared.css";
import "../../styles/patient.shared.css";
import { WALLET_PROVIDER_LABELS } from "../../utils/walletUtils.js";

export function WalletBackLink({ to = "/patient/wallet", label = "Back to wallet" }) {
  return (
    <Link to={to} className="wallet-back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      {label}
    </Link>
  );
}

export function WalletHero({
  eyebrow = "Payment",
  title,
  lead,
  balance,
  balanceLabel = "Current balance",
  balanceLoading = false,
  actions,
  variant = "teal",
  meta,
}) {
  return (
    <section className={`wallet-hero wallet-hero--${variant} wallet-hero--fullbleed`}>
      <div className="wallet-hero-orb wallet-hero-orb--1" aria-hidden="true" />
      <div className="wallet-hero-orb wallet-hero-orb--2" aria-hidden="true" />
      <div className="wallet-hero-inner">
        <div className="wallet-hero-main">
          {eyebrow && <p className="wallet-hero-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {lead && <p className="wallet-hero-lead">{lead}</p>}
          {meta}
          {actions}
        </div>
        {balance !== undefined && (
          <div className="wallet-hero-balance">
            <span>{balanceLabel}</span>
            <strong>{balanceLoading ? "…" : balance}</strong>
          </div>
        )}
      </div>
    </section>
  );
}

export function WalletAlert({ type = "error", title, children, onRetry }) {
  return (
    <div className={`wallet-alert wallet-alert--${type}`} role="alert">
      <div className="wallet-alert-icon" aria-hidden="true">
        {type === "success" ? "✓" : type === "warning" ? "!" : "×"}
      </div>
      <div className="wallet-alert-body">
        {title && <strong>{title}</strong>}
        <p>{children}</p>
        {onRetry && (
          <button type="button" className="wallet-alert-retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function WalletProviderBadge({ provider }) {
  const label = WALLET_PROVIDER_LABELS[provider] || provider;
  return <span className={`wallet-provider-badge wallet-provider-badge--${provider}`}>{label}</span>;
}

export function WalletCard({
  title,
  lead,
  icon,
  children,
  className = "",
  elevated = false,
  variant = "",
}) {
  const variantClass = variant ? `wallet-card--${variant}` : "";

  const panelHead = (title || lead) && (
    <>
      {icon && (
        <span className="patient-panel-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="patient-panel-head-main">
        {title && <h2 className="wallet-card-title patient-panel-title">{title}</h2>}
        {lead && <p className="wallet-card-lead patient-panel-lead">{lead}</p>}
      </div>
    </>
  );

  if (elevated && title) {
    return (
      <section
        className={`wallet-card wallet-card--elevated patient-panel ${variantClass} ${className}`.trim()}
      >
        <div className="wallet-card-header patient-panel-head">{panelHead}</div>
        <div className="wallet-card-body patient-panel-body">{children}</div>
      </section>
    );
  }

  return (
    <section className={`wallet-card patient-panel ${elevated ? "wallet-card--elevated" : ""} ${className}`.trim()}>
      {panelHead && <div className="patient-panel-head">{panelHead}</div>}
      <div className={title || lead ? "patient-panel-body" : "wallet-card-body"}>{children}</div>
    </section>
  );
}

export function WalletLoading({ label = "Loading…" }) {
  return (
    <div className="wallet-loading" aria-busy="true">
      <div className="wallet-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function WalletToolbar({ children }) {
  return <div className="wallet-toolbar">{children}</div>;
}

export function WalletPageBody({ children, className = "" }) {
  return <div className={`wallet-page-body ${className}`.trim()}>{children}</div>;
}

export default function WalletShell({ children, className = "", variant = "default" }) {
  return (
    <div className={`wallet-fullpage wallet-fullpage--${variant} ${className}`.trim()}>
      {children}
    </div>
  );
}
