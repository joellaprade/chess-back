import { WebSocket } from 'ws';

export type WS = WebSocket & { userId: string };
