"use client";
import { use } from "react";
import type { QueryPageParams } from "./params";

export default function QueryPage({
  params,
}: {
  params: Promise<QueryPageParams>;
}) {
  const { queryFullPath } = use(params);
  const decodedQueryFullPath = decodeURIComponent(queryFullPath);

  return <div>query full path: {decodedQueryFullPath}</div>;
}
