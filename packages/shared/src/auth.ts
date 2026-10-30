import type { Localized } from "./staff.ts";
import { z } from "zod";

export const LANGUAGES = ["en", "sv"] as const;
export type Language = (typeof LANGUAGES)[number];

export const ROLES = ["customer", "staff"] as const;
export type Role = (typeof ROLES)[number];

/** Emails are compared and stored trimmed and lower-cased, so "Anna@Example.com " is anna@example.com. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** A new password. The upper bound only stops absurd input from reaching the hasher. */
export const newPasswordSchema = z.string().min(8).max(200);

export const nameSchema = z.string().trim().min(1).max(80);

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const acceptInvitationRequestSchema = z.object({
  name: nameSchema,
  password: newPasswordSchema,
});
export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;

export const forgotPasswordRequestSchema = z.object({ email: emailSchema });
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1).max(200),
  password: newPasswordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

/** The signed-in user, as GET /api/me and every successful sign-in return it. */
export type Me = {
  id: string;
  email: string;
  name: string;
  role: Role;
  language: Language;
  /** Which reminder emails they want. */
  reminders: { beforeClose: boolean; dayBefore: boolean };
};

/** What people may change about themselves. Their email is changed by staff. */
export const updateMeSchema = z.object({
  name: nameSchema.optional(),
  language: z.enum(LANGUAGES).optional(),
  reminders: z
    .object({ beforeClose: z.boolean().optional(), dayBefore: z.boolean().optional() })
    .optional(),
});
export type UpdateMe = z.infer<typeof updateMeSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: newPasswordSchema,
});
export type ChangePassword = z.infer<typeof changePasswordSchema>;

/** What the accept-invitation screen shows before the person picks a password. */
export type InvitationInfo = {
  email: string;
  name: string;
  /** The next event they are invited to, if any, so the screen can show what it is for. */
  event: { id: string; name: Localized; startsAt: string; location: Localized } | null;
};
