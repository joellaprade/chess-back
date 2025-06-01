import { WebSocket } from 'ws';



export type WS = WebSocket & {
  userId: string;
  gameId?: string;
  user: {
    playerId: string;
    username: string;
    image?: string;
  }
  player?: {
    isWhite: boolean;
  }
};
