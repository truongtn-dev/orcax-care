/** Medical shield + cross mark for OrcaXCare branding */
export default function LogoIcon({ bgOpacity = 0.12 }) {
  return (
    <span className="logo-icon" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity={bgOpacity} />
        <path
          d="M16 7.5 23.5 10.75V15.5c0 5.25-3.25 9.25-7.5 11-4.25-1.75-7.5-5.75-7.5-11V10.75L16 7.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M16 12.5v7M12.75 16h6.5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
        <path
          d="M9.5 21.5h2l1.25-1.75 1.5 2.5 1.75-3 1.5 2.25h2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
