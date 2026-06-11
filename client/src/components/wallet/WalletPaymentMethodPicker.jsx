const METHOD_ICONS = {
  payos: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 17h7" />
      <path d="M17 14v7" />
    </svg>
  ),
  sepay: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M3 10h18" />
      <path d="M7 15h1" />
      <path d="M11 15h2" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </svg>
  ),
};

export default function WalletPaymentMethodPicker({ methods, value, onChange }) {
  return (
    <div className="wallet-method-list" role="radiogroup" aria-label="Payment method">
      {methods.map((method) => {
        const active = value === method.id;
        return (
          <button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`wallet-method wallet-method--${method.theme} ${active ? "is-active" : ""}`}
            onClick={() => onChange(method.id)}
          >
            <span className={`wallet-method-icon wallet-method-icon--${method.theme}`}>
              {METHOD_ICONS[method.id]}
            </span>
            <span className="wallet-method-body">
              <strong>{method.label}</strong>
              <span>{method.hint}</span>
            </span>
            <span className="wallet-method-radio" aria-hidden="true">
              {active && <span className="wallet-method-radio-dot" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
