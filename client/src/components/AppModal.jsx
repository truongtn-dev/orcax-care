import { useEffect } from "react";
import "./AppModal.css";

export default function AppModal({
  title,
  description,
  titleId,
  onClose,
  children,
  wide = false,
  closeOnBackdrop = true,
  className = "",
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = () => {
    if (closeOnBackdrop) onClose?.();
  };

  const panelClassName = [
    "modal",
    "card",
    "app-modal",
    "animate-scale",
    wide ? "app-modal-wide" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
