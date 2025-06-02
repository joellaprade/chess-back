export type Instruction = {
  route: string;
  action: string,
  payload: any,
  replyAction?: Instruction
}