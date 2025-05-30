import { WebSocket } from 'ws';

export type WS = WebSocket & {
  user: {
    playerId: string;
    username: string;
    image?: string;
  }
};
