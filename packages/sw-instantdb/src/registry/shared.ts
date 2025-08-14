import type {
  InstantCoreDatabase,
  InstantSchemaDef,
  RoomsDef,
} from "@instantdb/core";

/**
 * Optional metadata attached to queries/mutations for docs, discovery,
 * and observability (owner, tags, description, versioning, deprecation, etc.)
 */
export type RegistryMeta = {
  description?: string;
  tags?: string[];
  owner?: string;
  version?: string;
  deprecated?: boolean | string; // reason if string
};

// biome-ignore lint/suspicious/noExplicitAny: helper type
export type DBCore<APP_SCHEMA extends InstantSchemaDef<any, any, RoomsDef>> =
  Omit<
    InstantCoreDatabase<APP_SCHEMA, true>,
    | "_reactor"
    | "subscribeQuery"
    | "subscribeAuth"
    | "subscribeConnectionStatus"
    | "joinRoom"
    | "shutdown"
  >;
