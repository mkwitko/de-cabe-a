/**
 * Team shape (02-MATCH-ENGINE.md §5.2): where a slot wants to be, given the
 * phase, the ball and the plan. Everything here is in the team frame.
 */
import { z } from 'zod';
import { BOX_DEPTH, CENTER, LENGTH, WIDTH, clamp, type Vec2 } from './pitch';

/** Slot order: 0 GK, 1 RB, 2 RCB, 3 LCB, 4 LB, 5 DM, 6 RCM, 7 LCM, 8 RW, 9 ST, 10 LW. Low y is the right side. */
export const SLOTS = 11;
export const DEFENDERS = [1, 2, 3, 4];
const RB = 1;
const LB = 4;

export type Phase = 'in' | 'out';

const at = (x: number, y: number): Vec2 => ({ x, y });

/** 4-3-3 with the ball, 4-1-4-1 without it; positions for a ball on the centre spot. */
export const SHAPES: Record<Phase, Vec2[]> = {
  in: [
    at(8, 34),
    at(38, 8),
    at(28, 24),
    at(28, 44),
    at(38, 60),
    at(42, 34),
    at(56, 22),
    at(56, 46),
    at(74, 8),
    at(80, 34),
    at(74, 60),
  ],
  out: [
    at(5, 34),
    at(22, 12),
    at(20, 26),
    at(20, 42),
    at(22, 56),
    at(30, 34),
    at(40, 24),
    at(40, 44),
    at(40, 8),
    at(56, 34),
    at(40, 60),
  ],
};

export const InstructionsSchema = z.strictObject({
  /** 1 narrow … 5 wide. */
  width: z.number().int().min(1).max(5),
  /** 1 deep … 5 high. */
  lineHeight: z.number().int().min(1).max(5),
  /** Full-back that steps into midfield when the team has the ball. */
  inverted: z.enum(['R', 'L']).nullable(),
});
export type Instructions = z.infer<typeof InstructionsSchema>;
export const DEFAULT_INSTRUCTIONS: Instructions = { width: 3, lineHeight: 3, inverted: null };

/** How much a line follows the ball along the pitch: keeper, defence, midfield, attack. */
const followX = (slot: number) => (slot === 0 ? 0.1 : slot <= 4 ? 0.5 : slot <= 7 ? 0.55 : 0.45);
/** Metres a line steps up per point of line height. */
const stepUp = (slot: number) => (slot === 0 ? 1.5 : slot <= 4 ? 4 : slot <= 7 ? 2 : 0);

export function anchor(slot: number, phase: Phase, ball: Vec2, ins: Instructions): Vec2 {
  const base = SHAPES[phase][slot]!;
  let x = base.x + (ball.x - CENTER.x) * followX(slot);
  let y = base.y + (ball.y - CENTER.y) * (slot === 0 ? 0.1 : 0.35);

  y = CENTER.y + (y - CENTER.y) * (0.8 + 0.1 * (ins.width - 1));
  x += (ins.lineHeight - 3) * stepUp(slot);

  if (
    phase === 'in' &&
    ((ins.inverted === 'R' && slot === RB) || (ins.inverted === 'L' && slot === LB))
  ) {
    y = CENTER.y + (slot === RB ? -10 : 10);
    x += 6;
  }

  const maxX = slot === 0 ? (phase === 'out' ? BOX_DEPTH : 30) : LENGTH - 1;
  return { x: clamp(x, 1, maxX), y: clamp(y, 1, WIDTH - 1) };
}
