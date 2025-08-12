import type { SchemaAttr } from "@repo/db-client";

export type EntityPageGridContext =
  | {
      entityId: string;
    }
  | undefined;

export type EntityPageColDefContext =
  | {
      attr: SchemaAttr;
    }
  | undefined;
