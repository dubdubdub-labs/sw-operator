import { useEffect, useState } from "react";
import { dangerousUnsafeDb } from "./dangerous-unsafe-client";
import type { DBAttr, SchemaNamespace, SearchFilter } from "./instantdb-types";
import { dbAttrsToExplorerSchema, makeWhere } from "./utils";

export type UseNamespacesQueryProps = {
  selectedNs?: SchemaNamespace;
  navWhere?: [string, unknown];
  searchFilters?: SearchFilter[];
  limit?: number;
  offset?: number;
  sortAttr?: string;
  sortAsc?: boolean;
};

export function useNamespacesQuery({
  selectedNs,
  navWhere,
  searchFilters,
  limit,
  offset,
  sortAttr,
  sortAsc,
}: UseNamespacesQueryProps) {
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
  const itemsRes = dangerousUnsafeDb.useQuery(iql);

  const allRes = dangerousUnsafeDb.useQuery(
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

export const useSchemaQuery = () => {
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
  dangerousUnsafeDb.useQuery({ ____explorer___: {} });

  useEffect(() => {
    function onAttrs(_oAttrs: Record<string, DBAttr>) {
      setState({
        attrs: _oAttrs,
        namespaces: dbAttrsToExplorerSchema(_oAttrs),
      });
    }
    return dangerousUnsafeDb._core._reactor.subscribeAttrs(onAttrs);
  }, []);

  return state;
};
