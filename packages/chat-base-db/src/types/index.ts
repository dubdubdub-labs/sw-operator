import type { TransactionChunk } from "@instantdb/core";
import type { AppSchema } from "../instant.schema";

export type AppTransactionChunk<
  ENTITY_NAMES extends keyof AppSchema["entities"],
> = TransactionChunk<AppSchema, ENTITY_NAMES>;
