// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/core";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    fileMetadatas: i.entity({
      name: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date().optional(),
    }),
    userProfiles: i.entity({
      firstName: i.string().optional(),
      lastName: i.string().optional(),
      isPlatformAdmin: i.boolean().optional(),
      createdAt: i.date(),
    }),
    chats: i.entity({
      title: i.string().optional(),
      createdAt: i.date(),
      updatedAt: i.date(),
    }),
    messages: i.entity({
      role: i.string(),
      createdAt: i.date(),
    }),
    messageParts: i.entity({
      type: i.string().optional(),
      text: i.string().optional(),
      url: i.string().optional(),
      filename: i.string().optional(),
      mediaType: i.string().optional(),
      orderIndex: i.number().optional(),
    }),
  },
  links: {
    userProfile$user: {
      forward: {
        on: "userProfiles",
        has: "one",
        required: true,
        label: "$user",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "profile",
      },
    },
    fileMetadatas$files: {
      forward: {
        on: "fileMetadatas",
        has: "one",
        label: "$files",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "fileMetadata",
      },
    },
    chat$user: {
      forward: {
        on: "chats",
        has: "one",
        label: "$user",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "chats",
      },
    },
    messageChat: {
      forward: {
        on: "messages",
        has: "one",
        label: "chat",
      },
      reverse: {
        on: "chats",
        has: "many",
        label: "messages",
      },
    },
    messagePartMessage: {
      forward: {
        on: "messageParts",
        has: "one",
        label: "message",
      },
      reverse: {
        on: "messages",
        has: "many",
        label: "parts",
      },
    },
    messagePartFile: {
      forward: {
        on: "messageParts",
        has: "one",
        label: "document",
      },
      reverse: {
        on: "$files",
        has: "many",
        label: "messageParts",
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
