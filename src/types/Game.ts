import { WS } from "./WS";

export type Game = {
  players: [WS | null, WS | null],
  gameId: string,
  isWhitesTurn: boolean
  times: {
    wTime: number,
    bTime: number,
    wLastMove: number,
    bLastMove: number,
  }
}