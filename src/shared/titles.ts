import { z } from "zod";

const TITLE_MAX = 48;

export const TitlesRequestSchema = z
  .strictObject({
    steps: z
      .array(z.strictObject({ index: z.int().min(1), prompt: z.string().trim().min(1).max(600) }))
      .min(1)
      .max(80),
  })
  .refine((r) => new Set(r.steps.map((s) => s.index)).size === r.steps.length, {
    message: "Step indexes must be unique",
  });

export type TitlesRequest = z.infer<typeof TitlesRequestSchema>;

export const TitlesResponseSchema = z.strictObject({
  titles: z.array(
    z.strictObject({ index: z.int().min(1), title: z.string().trim().min(1).max(TITLE_MAX) }),
  ),
});

export type TitlesResponse = z.infer<typeof TitlesResponseSchema>;
