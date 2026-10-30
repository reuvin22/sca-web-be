import { z } from "zod";
import { optionalText, requiredText } from "../../utils/schema";

const PRIORITIES = ["highest", "high", "medium", "low", "lowest"] as const;
const clientId = z.string().trim().min(1).max(64);

const columnSchema = z.object({
  id: clientId,
  title: requiredText(100),
});

const cardSchema = z.object({
  id: clientId,
  key: z.string().trim().max(20),
  columnId: clientId,
  title: requiredText(200),
  description: optionalText(2000),
  dueDate: z.union([z.iso.date(), z.literal("")]).default(""),
  priority: z.enum(PRIORITIES).default("medium"),
});

// The whole board. Card order inside a column is the order in `cards`.
export const boardSchema = z
  .object({
    columns: z.array(columnSchema).max(30),
    cards: z.array(cardSchema).max(500),
  })
  .refine(
    ({ columns, cards }) => cards.every((card) => columns.some((column) => column.id === card.columnId)),
    "Every card must belong to an existing column",
  );
