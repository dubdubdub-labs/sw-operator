export function mapBootupToStatus(boot) {
  switch (boot) {
    case "FORK":
    case "RESUME":
    case "RUNNING":
      return "ready";
    case "CLEAN":
      return "booting";
    default: {
      // Exhaustive guard
      const _x = boot;
      return _x;
    }
  }
}
