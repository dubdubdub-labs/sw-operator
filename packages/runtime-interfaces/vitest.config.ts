// Import the prebuilt shared vitest base directly to avoid install hiccups
// when catalog dependencies are not resolved by Bun.
import { extendVitestConfig } from "@repo/vitest-config";
export default extendVitestConfig({});
