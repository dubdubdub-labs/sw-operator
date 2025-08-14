import type {
  DBAttr,
  SchemaAttr,
  SchemaNamespace,
  SearchFilter,
} from "./explorer-types";

// We show most attrs in the explorer except for some system attrs
function isVisibleAttr(attr: DBAttr) {
  const [, namespace, _] = attr["forward-identity"];
  return (
    attr.catalog !== "system" ||
    namespace === "$users" ||
    namespace === "$files"
  );
}

function nameComparator(a: { name: string }, b: { name: string }) {
  if (a.name === "id") {
    return -1;
  }
  if (b.name === "id") {
    return 1;
  }

  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

export function makeWhere(
  navWhere: null | undefined | [string, unknown],
  searchFilters: null | undefined | SearchFilter[]
) {
  const where: { [key: string]: unknown } = {};
  if (navWhere) {
    where[navWhere[0]] = navWhere[1];
  }
  if (searchFilters?.length) {
    where.or = searchFilters.map(([attr, op, val]) => {
      switch (op) {
        case "=":
          return { [attr]: val };
        case "$isNull":
          return { [attr]: { [op]: true } };
        default:
          return { [attr]: { [op]: val } };
      }
    });
  }
  return where;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: TODO: refactor this to make it more readable
export function dbAttrsToExplorerSchema(
  rawAttrs: Record<string, DBAttr>
): SchemaNamespace[] {
  const nsMap: Record<
    string,
    { id: string; name: string; attrs: Record<string, SchemaAttr> }
  > = {};

  const oAttrs: Record<string, DBAttr> = {};
  for (const [id, attrDesc] of Object.entries(rawAttrs)) {
    if (!isVisibleAttr(attrDesc)) {
      continue;
    }
    oAttrs[id] = attrDesc;
  }

  for (const attrDesc of Object.values(oAttrs)) {
    const [, namespace] = attrDesc["forward-identity"];

    if (nsMap[namespace]) {
      continue;
    }

    nsMap[namespace] = { id: namespace, name: namespace, attrs: {} };
  }

  for (const attrDesc of Object.values(oAttrs)) {
    const linkConfig: SchemaAttr["linkConfig"] = {
      forward: {
        id: attrDesc["forward-identity"][0],
        namespace: attrDesc["forward-identity"][1],
        attr: attrDesc["forward-identity"][2],
        nsMap: undefined, // Remove to avoid circular references
      },
      reverse: attrDesc["reverse-identity"]
        ? {
            id: attrDesc["reverse-identity"][0],
            namespace: attrDesc["reverse-identity"][1],
            attr: attrDesc["reverse-identity"][2],
            nsMap: undefined, // Remove to avoid circular references
          }
        : undefined,
    };

    if (attrDesc["forward-identity"]) {
      const [_fwdId, ns, attr, fwdIndexed] = attrDesc["forward-identity"];
      const id = `${attrDesc.id}-forward`;

      if (fwdIndexed !== false && nsMap[ns]) {
        nsMap[ns].attrs[id] = {
          id: attrDesc.id,
          isForward: true,
          namespace: ns,
          name: attr,
          type: attrDesc["value-type"],
          isIndex: attrDesc["index?"],
          isUniq: attrDesc["unique?"],
          isRequired: attrDesc["required?"],
          isPrimary: attrDesc["primary?"],
          cardinality: attrDesc.cardinality,
          linkConfig,
          inferredTypes: attrDesc["inferred-types"],
          catalog: attrDesc.catalog,
          checkedDataType: attrDesc["checked-data-type"],
          sortable: attrDesc["index?"] && !!attrDesc["checked-data-type"],
          onDelete: attrDesc["on-delete"],
          onDeleteReverse: attrDesc["on-delete-reverse"],
        };
      }
    }

    if (!attrDesc["reverse-identity"]) {
      continue;
    }

    const [_revId, revNs, revAttr, revIndexed] = attrDesc["reverse-identity"];

    // TODO: sometimes reverse-identity doesn't correspond to a real namespace
    if (nsMap[revNs] && revIndexed !== false) {
      const idr = `${attrDesc.id}-reverse`;
      nsMap[revNs].attrs[idr] = {
        id: attrDesc.id,
        isForward: false,
        namespace: revNs,
        name: revAttr,
        type: attrDesc["value-type"],
        isIndex: attrDesc["index?"],
        isUniq: attrDesc["unique?"],
        isRequired: attrDesc["required?"],
        cardinality: attrDesc.cardinality,
        linkConfig,
        sortable: attrDesc["index?"] && !!attrDesc["checked-data-type"],
        onDelete: attrDesc["on-delete"],
        onDeleteReverse: attrDesc["on-delete-reverse"],
      };
    }
  }

  // nsMap references removed to avoid circular dependencies that prevent JSON serialization

  const namespaces = Object.values(nsMap)
    .map((ns) => ({
      ...ns,
      attrs: Object.values(ns.attrs).sort(nameComparator),
    }))
    .sort(nameComparator);

  return namespaces;
}

export function checkIsIdAttr(attr: SchemaAttr) {
  return attr.name === "id";
}

export function checkIsIndexedAttr(attr: SchemaAttr) {
  return attr.isIndex;
}

export function checkIsUniqAttr(attr: SchemaAttr) {
  return attr.isUniq;
}

export function checkIsRequiredAttr(attr: SchemaAttr) {
  return attr.isRequired;
}
