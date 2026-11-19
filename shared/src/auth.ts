import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email());

export const registerSchema = z.object({
  email,
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(50),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const userSchema = z.object({
  id: z.number().int(),
  email: z.string(),
  name: z.string(),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
