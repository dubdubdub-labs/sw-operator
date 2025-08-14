import type { SchemaAttr } from "@repo/sw-instantdb";

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
