import { z } from 'zod';

export const capacitySchema = z.enum(['customer', 'provider']);
export const platformRoleSchema = z.enum(['user', 'moderator', 'admin']);

export const signUpSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(200),
    displayName: z.string().min(1).max(120),
    capacities: z.array(capacitySchema).min(1).max(2).default(['customer']),
  })
  .strict();
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1).max(200),
  })
  .strict();
export type SignInInput = z.infer<typeof signInSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1) }).strict();
export type RefreshInput = z.infer<typeof refreshSchema>;

export const signOutSchema = z.object({ refreshToken: z.string().min(1) }).strict();
export type SignOutInput = z.infer<typeof signOutSchema>;

/** The `Actor` as it crosses the wire — never the DB row (no passwordHash, ever). */
export const actorResponseSchema = z.object({
  id: z.uuid(),
  capacities: z.array(capacitySchema),
  platformRole: platformRoleSchema,
});
export type ActorResponse = z.infer<typeof actorResponseSchema>;

export const authResultSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  actor: actorResponseSchema,
});
export type AuthResult = z.infer<typeof authResultSchema>;
