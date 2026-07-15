import { z } from "zod";
const shape = {
  REG_NO: z.string().optional(),
  TYPE: z.any().optional(),
};
const schema = z.object(shape);
const payload = { REG_NO: "DL4SEA 5353", TYPE: "94725201-7c44-4d3b-b2b4-5a8663c9b6ae" };
console.log(schema.parse(payload));

