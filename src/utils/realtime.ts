import type { Response } from "express";

// Real-time events with Server-Sent Events (SSE): each signed-in browser keeps one open
// GET /notifications/stream connection, and the server writes events to it as they happen.
// Connections live in this server's memory, so this works with one server instance
// (see DEPLOYMENT.md: keep instance_count at 1, or move this to a shared pub/sub later).

const connections = new Map<string, Set<Response>>(); // userId -> open streams (one per tab)

const HEARTBEAT_MS = 25_000; // keeps proxies from closing a quiet connection

export function openStream(userId: string, res: Response) {
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // don't let proxies hold events back
  });
  res.flushHeaders();
  res.write("retry: 5000\n\n"); // the browser waits 5 s before reconnecting

  const streams = connections.get(userId) ?? new Set<Response>();
  streams.add(res);
  connections.set(userId, streams);

  const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

  res.on("close", () => {
    clearInterval(heartbeat);
    streams.delete(res);
    if (streams.size === 0) connections.delete(userId);
  });
}

// Sends an event to every connected user (optionally except one, e.g. the author)
export function broadcast(event: string, data: unknown, { exceptUserId }: { exceptUserId?: string } = {}) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [userId, streams] of connections) {
    if (userId === exceptUserId) continue;
    streams.forEach((res) => res.write(message));
  }
}
