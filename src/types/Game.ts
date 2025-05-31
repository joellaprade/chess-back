import { WS } from "./WS";

export type Game = {
  players: [WS | null, WS | null],
  gameId: string,
}