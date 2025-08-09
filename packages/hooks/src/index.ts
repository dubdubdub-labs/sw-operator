import { db } from "@repo/db-client";

export const use$Users = () => {
  const { data, error } = db.useRegisteredQuery(
    db.registeredQueries.users.getAll,
    {}
  );

  return {
    users: data,
    error,
  };
};
