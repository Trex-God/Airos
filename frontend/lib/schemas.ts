import { z } from "zod";

import {
  BILLING_PLANS,
  MEMORY_CATEGORIES,
  USER_TYPES,
} from "@/lib/domain";

export const userTypeSchema = z.enum(USER_TYPES);

export const RunTaskSchema = z
  .object({
    input_text: z
      .string()
      .min(3, "Input too short")
      .max(5000, "Input must be under 5000 characters"),
    user_type: userTypeSchema,
    output_format: z.enum(["markdown", "docx"]).default("markdown"),
  })
  .strict();

export type RunTaskInput = z.infer<typeof RunTaskSchema>;

export const SaveMemorySchema = z
  .object({
    category: z.enum(MEMORY_CATEGORIES),
    content: z.string().min(1).max(2000),
    tags: z.array(z.string().min(1).max(30)).max(10).optional(),
  })
  .strict();

export const CheckoutRequestSchema = z
  .object({
    plan: z.enum(BILLING_PLANS),
    user_type: userTypeSchema.optional(),
  })
  .strict();

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
