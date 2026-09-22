import { z } from "zod"


export const TBill = z.object({
  id: z.string(),
  ref: z.string(),
  status: z.enum(["paid", "pending", "overdue"]),
  dueAmount: z.number(),
  dueDate: z.string(),
  utilityId: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.number(),
  updatedAt: z.number()
})

export const TBillSync = TBill.pick({
  ref: true,
  status: true,
  dueAmount: true,
  dueDate: true,
  utilityId: true,
  createdBy: true
})
