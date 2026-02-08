/**
 * WebSocket handler for real-time progress updates
 *
 * Client connects: ws://host/ws/progress/:projectId
 * Server pushes progress updates as JSON
 */

// Store active WebSocket connections per project
const connections = new Map<string, Set<any>>();

export function addConnection(projectId: string, ws: any) {
  if (!connections.has(projectId)) {
    connections.set(projectId, new Set());
  }
  connections.get(projectId)!.add(ws);
  console.log(
    `[WS] Client connected for project ${projectId} (${connections.get(projectId)!.size} total)`
  );
}

export function removeConnection(projectId: string, ws: any) {
  const conns = connections.get(projectId);
  if (conns) {
    conns.delete(ws);
    if (conns.size === 0) connections.delete(projectId);
  }
}

export function broadcastProgress(projectId: string, data: any) {
  const conns = connections.get(projectId);
  if (!conns || conns.size === 0) return;

  const message = JSON.stringify(data);
  for (const ws of conns) {
    try {
      if (ws.readyState === 1) {
        // OPEN
        ws.send(message);
      }
    } catch (e) {
      console.warn('[WS] Send failed:', e);
      removeConnection(projectId, ws);
    }
  }
}

export function getConnectionCount(projectId?: string): number {
  if (projectId) return connections.get(projectId)?.size || 0;
  let total = 0;
  connections.forEach((set) => (total += set.size));
  return total;
}
