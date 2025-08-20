import type { InstantConfig, InstantUnknownSchemaDef } from "@instantdb/core";
import type { InstantReactWebDatabase } from "@instantdb/react";
import type { InstantReactNativeDatabase } from "@instantdb/react-native";
import { useEffect, useState } from "react";
import type { DBAttr, SchemaNamespace, SearchFilter } from "./explorer-types";
import { dbAttrsToExplorerSchema, makeWhere } from "./explorer-utils";

export type UseNamespacesQueryProps<
  DATABASE extends
    | Omit<
        InstantReactWebDatabase<
          InstantUnknownSchemaDef,
          InstantConfig<InstantUnknownSchemaDef, true>
        >,
        "room" | "getAuth"
      >
    | InstantReactNativeDatabase<
        InstantUnknownSchemaDef,
        InstantConfig<InstantUnknownSchemaDef, true>
      >,
> = {
  selectedNs?: SchemaNamespace;
  navWhere?: [string, unknown];
  searchFilters?: SearchFilter[];
  limit?: number;
  offset?: number;
  sortAttr?: string;
  sortAsc?: boolean;
  db: DATABASE;
};

export function useNamespacesQuery<
  DATABASE extends
    | Omit<
        InstantReactWebDatabase<
          InstantUnknownSchemaDef,
          InstantConfig<InstantUnknownSchemaDef, true>
        >,
        "room" | "getAuth"
      >
    | InstantReactNativeDatabase<
        InstantUnknownSchemaDef,
        InstantConfig<InstantUnknownSchemaDef, true>
      >,
>({
  selectedNs,
  navWhere,
  searchFilters,
  limit,
  offset,
  sortAttr,
  sortAsc,
  db,
}: UseNamespacesQueryProps<DATABASE>) {
  const direction: "asc" | "desc" = sortAsc ? "asc" : "desc";

  const where = makeWhere(navWhere, searchFilters);

  const iql = selectedNs
    ? {
        [selectedNs.name]: {
          ...Object.fromEntries(
            selectedNs.attrs
              .filter((a) => a.type === "ref")
              .map((a) => [a.name, { $: { fields: ["id"] } }])
          ),
          $: {
            ...(where ? { where } : {}),
            ...(limit ? { limit } : {}),
            ...(offset ? { offset } : {}),
            ...(sortAttr ? { order: { [sortAttr]: direction } } : {}),
          },
        },
      }
    : {};

  /**
   * we should NOT normally expect an error here
   * we are doing this because the above query builder pattern is a bit of a hack
   */
  // @ts-expect-error - aggregate is not a valid query param
  const itemsRes = db.useQuery(iql);

  const allRes = db.useQuery(
    selectedNs
      ? {
          [selectedNs.name]: {
            $: {
              /**
               * we should NOT normally use the aggregate where clause
               * we are ONLY doing this because it is a hack required to enable aggregate queries
               * while that functionality is in alpha
               */
              // @ts-expect-error - aggregate is not a valid query param
              aggregate: "count",
              ...(where ? { where } : {}),
            },
          },
        }
      : {}
  );

  const allCount: number | null =
    // @ts-expect-error: admin-only feature
    allRes.aggregate?.[selectedNs?.name ?? ""]?.count ?? null;

  return {
    itemsRes,
    allCount,
  };
}

export const useSchemaQuery = <
  DATABASE extends
    | Omit<
        InstantReactWebDatabase<
          InstantUnknownSchemaDef,
          InstantConfig<InstantUnknownSchemaDef, true>
        >,
        "room" | "getAuth"
      >
    | InstantReactNativeDatabase<
        InstantUnknownSchemaDef,
        InstantConfig<InstantUnknownSchemaDef, true>
      >,
>({
  db,
}: {
  db: DATABASE;
}) => {
  const [state, setState] = useState<
    | {
        namespaces: SchemaNamespace[];
        attrs: Record<string, DBAttr>;
      }
    | { namespaces: null; attrs: null }
  >({ namespaces: null, attrs: null });

  // (XXX)
  // This is a hack so we can listen to all attr changes
  //
  // Context:
  // The backend only sends attr changes to relevant queries.
  // The ___explorer__ is a dummy query, which refreshes when _anything_
  // happens.
  //
  // In the future, we may want a special `attr-changed` event.
  db.useQuery({ ____explorer___: {} });

  // biome-ignore lint/correctness/useExhaustiveDependencies: this is a hack
  useEffect(() => {
    function onAttrs(_oAttrs: Record<string, DBAttr>) {
      setState({
        attrs: _oAttrs,
        namespaces: dbAttrsToExplorerSchema(_oAttrs),
      });
    }
    return db._core._reactor.subscribeAttrs(onAttrs);
  }, []);

  return state;
};
