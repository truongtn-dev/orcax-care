const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function IconWalletTopup(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
      <path d="M14 10h6v6h-6a3 3 0 0 1 0-6z" />
      <path d="M12 11v6" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function IconWalletTransactions(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconWalletQrScan(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 9V4h5" />
      <path d="M15 4h5v5" />
      <path d="M20 15v5h-5" />
      <path d="M9 20H4v-5" />
      <rect x="8" y="8" width="3" height="3" rx="0.5" />
      <rect x="13" y="8" width="3" height="3" rx="0.5" />
      <rect x="8" y="13" width="3" height="3" rx="0.5" />
      <rect x="13" y="13" width="3" height="3" rx="0.5" />
    </svg>
  );
}

export function IconWalletHelp(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 4.2 1.8c-.8.7-1.7 1-1.7 2.2" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconWalletBank(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 21h16" />
      <path d="M4 11h16" />
      <path d="M5 11V9l7-4 7 4v2" />
      <path d="M8 21v-8" />
      <path d="M12 21v-8" />
      <path d="M16 21v-8" />
    </svg>
  );
}

export function IconWalletReceipt(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </svg>
  );
}

export function IconWalletSimulate(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 11h18" />
      <circle cx="7" cy="15" r="1" fill="currentColor" stroke="none" />
      <path d="M10 15h6" />
    </svg>
  );
}
