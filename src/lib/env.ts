import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  WEB_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value, context) => {
      const origins = value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

      if (
        origins.length === 0 ||
        origins.some((origin) => !z.string().url().safeParse(origin).success)
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'WEB_ORIGIN must contain valid URLs',
        });
        return z.NEVER;
      }

      return origins;
    }),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
