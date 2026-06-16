/** Simple medical shield + cross for OrcaXCare branding */
export default function LogoIcon({ bgOpacity = 0.12, className = "" }) {
  return (
    <span className={`logo-icon ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="currentColor" fillOpacity={bgOpacity} />
        <path
          d="M16 7.5 23 10.75V15.5c0 5-3 9-7 10.75C12 24.5 9 20.5 9 15.5v-4.75L16 7.5Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
        <path
          d="M16 12v6.5M12.75 15.25h6.5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
