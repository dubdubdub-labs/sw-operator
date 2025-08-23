import { InstantPlatformService } from "../src/index.js";

const token = process.env.PLATFORM_TOKEN;
if (!token) {
  console.error("Missing PLATFORM_TOKEN in environment");
  process.exit(1);
}

const titleFromArg = process.argv.slice(2).join(" ");

async function main() {
  const service = new InstantPlatformService({ platformToken: token });
  console.log("Creating Instant app…");
  const app = await service.createApp({ title: titleFromArg || undefined });
  console.log("\nCreated app:");
  console.log("  id          :", app.id);
  console.log("  title       :", app.title);
  console.log(
    "  admin-token :",
    `${app["admin-token"].slice(0, 6)}…${app["admin-token"].slice(-4)}`
  );
  console.log("  created_at  :", app.created_at);
  console.log("  conn string :", app.connection_string ?? "<none>");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
