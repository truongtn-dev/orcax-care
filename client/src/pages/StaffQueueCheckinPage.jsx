import { useState } from "react";
import PageLayout from "../components/PageLayout.jsx";
import StaffLayout from "../components/StaffLayout.jsx";
import FilterSearchField from "../components/FilterSearchField.jsx";
import { QueueApiClient } from "../services/queueApi.js";
import { getApiErrorMessage } from "../services/api.js";
import "./StaffQueueCheckinPage.css";

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function StaffQueueCheckinPage() {
  const [keyword, setKeyword] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [ticketPreview, setTicketPreview] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const onSearch = async (event) => {
    event.preventDefault();
    if (!keyword.trim()) return;

    setSearching(true);
    setError("");
    setMessage("");
    setAppointments([]);
    setSelectedId("");
    setTicketPreview(null);

    try {
      const { data } = await QueueApiClient.searchCheckinAppointments(keyword.trim());
      setAppointments(data.appointments || []);
      if (data.appointments?.length === 1) {
        setSelectedId(data.appointments[0]._id);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const onIssueTicket = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { data } = await QueueApiClient.issueTicket(selectedId);
      setTicketPreview(data);
      setMessage(`Ticket #${data.ticket.number} issued successfully.`);
      setAppointments([]);
      setSelectedId("");
      setKeyword("");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selected = appointments.find((item) => item._id === selectedId);

  return (
    <PageLayout dashboard>
      <StaffLayout
        title="Queue check-in"
        description="Search today's confirmed appointment and issue a queue ticket."
      >
        <div className="dash-page-stack staff-checkin-page">
          <form className="card filters-card" onSubmit={onSearch}>
            <div className="filters-toolbar">
              <FilterSearchField
                label="Patient name, phone, or booking code"
                name="checkinSearch"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="e.g. Nguyen Van A, 0901…, APT-ABC123"
                disabled={searching}
              />
              <div className="filter-field filter-field-action">
                <span className="filter-field-label" aria-hidden="true">&nbsp;</span>
                <button type="submit" className="btn btn-primary" disabled={searching || !keyword.trim()}>
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>
            </div>
          </form>

          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {appointments.length > 0 && (
            <section className="card staff-checkin-results">
              <h2>Today's appointments</h2>
              <ul className="staff-checkin-list">
                {appointments.map((item) => (
                  <li key={item._id}>
                    <button
                      type="button"
                      className={`staff-checkin-card${selectedId === item._id ? " is-selected" : ""}`}
                      onClick={() => setSelectedId(item._id)}
                    >
                      <div>
                        <strong>{item.patientName}</strong>
                        <span>{item.referenceCode}</span>
                      </div>
                      <div>
                        <span>{item.slot?.startTime} – {item.slot?.endTime}</span>
                        <span>{item.slot?.roomName || "Room TBD"}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {selected && (
                <div className="staff-checkin-detail">
                  <dl className="detail-list">
                    <div><dt>Patient</dt><dd>{selected.patientName}</dd></div>
                    <div><dt>Phone</dt><dd>{selected.patientPhone || "—"}</dd></div>
                    <div><dt>Booking</dt><dd>{selected.referenceCode}</dd></div>
                    <div><dt>Room</dt><dd>{selected.slot?.roomName || "—"}</dd></div>
                    <div><dt>Fee</dt><dd>{formatCurrency(selected.fee)}</dd></div>
                  </dl>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={submitting}
                    onClick={onIssueTicket}
                  >
                    {submitting ? "Issuing…" : "Check in & issue ticket"}
                  </button>
                </div>
              )}
            </section>
          )}

          {ticketPreview && (
            <section className="card staff-checkin-ticket">
              <p className="staff-checkin-ticket-label">Ticket issued</p>
              <p className="staff-checkin-ticket-number">#{ticketPreview.ticket.number}</p>
              <p>{ticketPreview.appointment?.patientName} · {ticketPreview.session?.room?.name}</p>
            </section>
          )}
        </div>
      </StaffLayout>
    </PageLayout>
  );
}
