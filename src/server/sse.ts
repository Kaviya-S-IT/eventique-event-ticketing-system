import { Response } from 'express';

interface SSEClient {
  id: string;
  tenantId?: string;
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];

  public addClient(id: string, res: Response, tenantId?: string) {
    this.clients.push({ id, res, tenantId });

    // Send connection established event
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId: id, timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.removeClient(id);
    });
  }

  public removeClient(id: string) {
    this.clients = this.clients.filter(c => c.id !== id);
  }

  public broadcast(event: { type: string; payload: any; tenantId?: string }) {
    const payloadStr = JSON.stringify(event);
    for (const client of this.clients) {
      // If event is scoped to a tenant, only send to clients with matching tenant or no tenant constraint
      if (!event.tenantId || !client.tenantId || client.tenantId === event.tenantId) {
        try {
          client.res.write(`data: ${payloadStr}\n\n`);
        } catch (err) {
          console.error('Error sending SSE event:', err);
        }
      }
    }
  }

  public getConnectedCount() {
    return this.clients.length;
  }
}

export const sseManager = new SSEManager();
