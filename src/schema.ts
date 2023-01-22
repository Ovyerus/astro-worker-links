import { z } from "zod";

export const optionsSchema = z.object({
  domain: z.string().url(),
  secret: z.string(),
  getPageMapping: z.function().args(z.any()).returns(z.any()),
});
