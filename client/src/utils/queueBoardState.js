export function deriveQueueBoardState(sessionStatus, currentNumber, waitingCount, skippedCount = 0) {
  if (sessionStatus === "closed") return "closed";
  if (sessionStatus === "paused") return "paused";
  if (!currentNumber && waitingCount === 0 && skippedCount === 0) return "empty";
  return "active";
}

export function nextNumbersFromWaitingTickets(waitingTickets, limit = 5) {
  return (waitingTickets || []).map((ticket) => ticket.number).slice(0, limit);
}
