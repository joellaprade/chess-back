import { WebSocket } from 'ws';

export type WS = WebSocket & {
  user: {
    userId: string;
    username: string;
    image?: string;
  }
};
