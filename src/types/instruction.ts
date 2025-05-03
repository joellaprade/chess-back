export type Instruction = {
  action: string,
  payload: any,
  replyAction?: Instruction
}