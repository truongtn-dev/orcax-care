export default function AdminFormActions({
  onCancel,
  submitLabel,
  submitting = false,
  submittingLabel = "Saving…",
  cancelLabel = "Cancel",
}) {
  return (
    <div className="form-actions">
      <button type="button" className="btn btn-outline" onClick={onCancel}>
        {cancelLabel}
      </button>
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? submittingLabel : submitLabel}
      </button>
    </div>
  );
}
