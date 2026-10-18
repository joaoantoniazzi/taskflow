import * as z from "zod";

export const notificationIdParamsSchema = z.object({
  notificationId: z.uuid(),
});