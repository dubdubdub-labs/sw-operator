import assert from "node:assert/strict";
import type { EntitiesDef, InstantSchemaDef, LinksDef } from "@instantdb/admin";
import type { RoomsDef } from "@instantdb/core";
import { i } from "@instantdb/core";
import { describe, it } from "vitest";
import { buildEntityQuery } from "../index";

describe("buildEntityQuery", () => {
  it("includes link ids and paging options", () => {
    const schema: InstantSchemaDef<
      EntitiesDef,
      LinksDef<EntitiesDef>,
      RoomsDef
    > = i.schema({
      entities: {
        users: i.entity({ name: i.string() }),
        posts: i.entity({ title: i.string() }),
      },
      links: {
        userPosts: {
          forward: { on: "users", has: "many", label: "posts" },
          reverse: { on: "posts", has: "one", label: "author" },
        },
      },
    });

    const qUsers = buildEntityQuery(schema, "users", { limit: 10, offset: 0 });
    const users = qUsers.users as Record<string, unknown>;
    const opts = (users.$ as Record<string, unknown>) || {};
    assert.equal(opts.limit, 10);
    assert.equal(opts.offset, 0);
    assert.ok("posts" in users);
    const posts = users.posts as { $: { fields: string[] } };
    assert.deepEqual(posts.$.fields, ["id"]);

    const qPosts = buildEntityQuery(schema, "posts", { limit: 5, offset: 5 });
    const postsRoot = qPosts.posts as Record<string, unknown>;
    const postsOpts = (postsRoot.$ as Record<string, unknown>) || {};
    assert.equal(postsOpts.limit, 5);
    assert.equal(postsOpts.offset, 5);
    assert.ok("author" in postsRoot);
    const author = postsRoot.author as { $: { fields: string[] } };
    assert.deepEqual(author.$.fields, ["id"]);
  });
});
