import { z } from "zod";

const uuid = z.string().uuid();
const optionalDate = z.coerce.date().optional();
export const updatePhcValidation = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    address: z.string().trim().min(3).max(500).optional(),
    district: z.string().trim().min(2).max(150).optional(),
    state: z.string().trim().min(2).max(150).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9 -]{7,18}$/)
      .nullable()
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");
export const villageIdParamValidation = z.object({ villageId: uuid }).strict();
export const statisticsQueryValidation = z
  .object({ from: optionalDate, to: optionalDate, villageId: uuid.optional() })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "from must be before to",
    path: ["from"],
  });
export const emptyPhcQueryValidation = z.object({}).strict();
export const ashaWorkerIdParamValidation = z.object({ workerId: z.string().min(1) }).strict();
export const updateAshaWorkerValidation = z
  .object({
    fullName: z.string().trim().min(2).max(150).optional(),
    employeeCode: z.string().trim().min(1).max(50).optional(),
    villageId: uuid.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one field is required.");

export type UpdatePhcInput = z.infer<typeof updatePhcValidation>;
export type StatisticsQuery = z.infer<typeof statisticsQueryValidation>;
export type UpdateAshaWorkerInput = z.infer<typeof updateAshaWorkerValidation>;
