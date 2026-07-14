import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QueueApiClient } from "../services/queueApi.js";
import { getQueueSocket, joinQueueRoom } from "../services/queueSocket.js";
import { deriveQueueBoardState } from "../utils/queueBoardState.js";
import "./QueueBoardPage.css";

const POLL_MS = 5000;

function boardMessage(state, hasCalled) {
  if (state === "paused") return "Queue paused — please wait";
  if (state === "closed") return "Clinic session ended";
  if (state === "empty") return "Waiting for patients";
  if (!hasCalled) return "Waiting for the next patient to be called";
  return "Please listen for your number";
}

function patientCaption(patient) {
  if (!patient?.patientName) return "";
  return patient.birthYear ? `${patient.patientName} · ${patient.birthYear}` : patient.patientName;
}

function mapBoardPatients(tickets = []) {
  return tickets.map((ticket) => ({
    number: ticket.number,
    patientName: ticket.patientName || "",
    birthYear: ticket.birthYear ?? null,
  }));
}

export default function QueueBoardPage() {
  const { roomId } = useParams();
  const [board, setBoard] = useState(null);
  const [connected, setConnected] = useState(true);

  const loadBoard = useCallback(async () => {
    if (!roomId) return;
    try {
      const { data } = await QueueApiClient.getQueueBoard(roomId);
      setBoard(data);
    } catch {
      /* polling fallback keeps last good state */
    }
  }, [roomId]);

  useEffect(() => {
    loadBoard();
    const timer = setInterval(loadBoard, POLL_MS);
    return () => clearInterval(timer);
  }, [loadBoard]);

  useEffect(() => {
    if (!roomId) return undefined;

    joinQueueRoom(roomId);
    const socket = getQueueSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onUpdate = (payload) => {
      const waitingTickets = payload.waitingTickets || [];
      const calledTicket = payload.calledTicket || null;
      const skippedTickets = payload.skippedTickets || [];
      const currentNumber = calledTicket?.number || 0;

      setBoard((prev) => ({
        ...(prev || {}),
        room: payload.room || prev?.room,
        session: {
          _id: payload._id,
          status: payload.status,
          currentNumber,
        },
        currentNumber,
        currentPatient: calledTicket
          ? {
              number: calledTicket.number,
              patientName: calledTicket.patientName || "",
              birthYear: calledTicket.birthYear ?? null,
            }
          : null,
        nextPatients: mapBoardPatients(waitingTickets),
        skippedPatients: mapBoardPatients(skippedTickets),
        state: deriveQueueBoardState(
          payload.status,
          currentNumber,
          waitingTickets.length,
          skippedTickets.length
        ),
      }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("queue:update", onUpdate);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("queue:update", onUpdate);
    };
  }, [roomId]);

  const currentNumber = board?.currentNumber || 0;
  const currentPatient = board?.currentPatient;
  const nextPatients = board?.nextPatients || [];
  const skippedPatients = board?.skippedPatients || [];
  const state = board?.state || "empty";
  const hasCalled = Boolean(currentPatient);

  return (
    <div className={`queue-board-page state-${state}`}>
      <header className="queue-board-header">
        <div>
          <p className="queue-board-kicker">OrcaX Care · Waiting room</p>
          <h1>{board?.room?.name || "Clinic room"}</h1>
          <p>{board?.room?.roomCode || board?.room?.roomNumber || ""}</p>
        </div>
        <div className={`queue-board-connection${connected ? " is-live" : ""}`}>
          {connected ? "Live" : "Polling every 5s"}
        </div>
      </header>

      <main className="queue-board-main">
        <section className="queue-board-current">
          <p>Now serving</p>
          <p className="queue-board-current-number">{hasCalled ? currentNumber : "—"}</p>
          {patientCaption(currentPatient) ? (
            <p className="queue-board-current-patient">{patientCaption(currentPatient)}</p>
          ) : null}
          <p className="queue-board-message">{boardMessage(state, hasCalled)}</p>
        </section>

        <div className="queue-board-side">
          <section className="queue-board-next">
            <h2>Up next</h2>
            <p className="queue-board-next-caption">Next {Math.min(nextPatients.length, 5)} patient(s)</p>
            {nextPatients.length ? (
              <ul>
                {nextPatients.map((patient) => (
                  <li key={patient.number}>
                    <span className="queue-board-next-number">{patient.number}</span>
                    {patientCaption(patient) ? (
                      <span className="queue-board-next-patient">{patientCaption(patient)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="queue-board-next-empty">—</p>
            )}
          </section>

          <section className="queue-board-skipped">
            <h2>Skipped</h2>
            <p className="queue-board-next-caption">May be recalled ({skippedPatients.length})</p>
            {skippedPatients.length ? (
              <ul>
                {skippedPatients.map((patient) => (
                  <li key={patient.number}>
                    <span className="queue-board-skipped-number">{patient.number}</span>
                    {patientCaption(patient) ? (
                      <span className="queue-board-skipped-patient">{patientCaption(patient)}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="queue-board-next-empty">—</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
