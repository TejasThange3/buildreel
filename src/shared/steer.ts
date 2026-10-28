import { z } from "zod";

// What a spoken instruction can change. Ops edit Constraints (intent), never the EDL directly; the
// planner recomputes the reel from them. Steps are numbered from 1, as in the step list.
const stepNumber = z.number().int().min(1);

export const PatchOpSchema = z.union([
  z.strictObject({ op: z.literal("setTarget"), seconds: z.number().min(15).max(300) }),
  z.strictObject({ op: z.literal("keep"), steps: z.array(stepNumber).min(1) }),
  z.strictObject({ op: z.literal("drop"), steps: z.array(stepNumber).min(1) }),
  z.strictObject({
    op: z.literal("emphasize"),
    step: stepNumber,
    seconds: z.number().min(0).max(20),
  }),
  z.strictObject({
    op: z.literal("setSpeed"),
    step: stepNumber,
    factor: z.number().min(1).max(2000),
  }),
  z.strictObject({ op: z.literal("setTitle"), step: stepNumber, text: z.string().min(1).max(48) }),
  z.strictObject({ op: z.literal("setIntro"), text: z.string().min(1).max(60) }),
  z.strictObject({ op: z.literal("setOutro"), text: z.string().min(1).max(60) }),
]);
export type PatchOp = z.infer<typeof PatchOpSchema>;

// ARCHITECTURE.md section 9: small, length-capped JSON only.
export const SteerRequestSchema = z.strictObject({
  instruction: z.string().trim().min(1).max(500),
  targetS: z.number().min(15).max(300),
  steps: z
    .array(
      z.strictObject({
        index: stepNumber,
        title: z.string().max(80),
        excerpt: z.string().max(120),
        outDur: z.number().min(0),
        kept: z.boolean(),
      }),
    )
    .min(1)
    .max(80),
});
export type SteerRequest = z.infer<typeof SteerRequestSchema>;

export const SteerResponseSchema = z.strictObject({
  ops: z.array(PatchOpSchema).max(12),
  note: z.string().max(200).nullable(),
});
export type SteerResponse = z.infer<typeof SteerResponseSchema>;
