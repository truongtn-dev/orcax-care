import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QueueApiClient } from "../services/queueApi.js";
import { getQueueSocket, joinQueueRoom } from "../services/queueSocket.js";
import { deriveQueueBoardState, nextNumbersFromWaitingTickets } from "../utils/queueBoardState.js";
import "./QueueBoardPage.css";

const POLL_MS = 5000;

function boardMessage(state) {
  if (state === "paused") return "Queue paused — please wait";
  if (state === "closed") return "Clinic session ended";
  if (state === "empty") return "Waiting for patients";
  return "Please listen for your number";
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
      const currentNumber = payload.currentNumber || 0;
      setBoard((prev) => ({
        ...(prev || {}),
        room: payload.room || prev?.room,
        session: {
          _id: payload._id,
          status: payload.status,
          currentNumber,
        },
        currentNumber,
        nextNumbers: nextNumbersFromWaitingTickets(waitingTickets),
        state: deriveQueueBoardState(payload.status, currentNumber, waitingTickets.length),
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
  const nextNumbers = board?.nextNumbers || [];
  const state = board?.state || "empty";

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
          <p className="queue-board-current-number">{currentNumber > 0 ? currentNumber : "—"}</p>
          <p className="queue-board-message">{boardMessage(state)}</p>
        </section>

        <section className="queue-board-next">
          <h2>Next</h2>
          {nextNumbers.length ? (
            <ul>
              {nextNumbers.map((number) => (
                <li key={number}>{number}</li>
              ))}
            </ul>
          ) : (
            <p className="queue-board-next-empty">—</p>
          )}
        </section>
      </main>
    </div>
  );
}
