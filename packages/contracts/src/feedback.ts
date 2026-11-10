import { z } from 'zod';

export const FeedbackKind = z.enum(['suggestion', 'problem', 'praise']);
export type FeedbackKind = z.infer<typeof FeedbackKind>;

/** POST /v1/feedback: a suggestion, a problem or a compliment, with an optional e-mail for a reply. */
export const FeedbackRequest = z.strictObject({
  kind: FeedbackKind,
  text: z.string().trim().min(10).max(1000),
  email: z.string().trim().max(254).pipe(z.email()).optional(),
  /** Problems carry where the player was and which build, shown to the player before sending. */
  route: z.string().trim().max(200).optional(),
  appVersion: z.string().trim().max(40).optional(),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequest>;
