type Filter = unknown[];

const COMPARISON = new Set(["==", "!=", ">", ">=", "<", "<="]);

function getter(key: string): Filter {
  if (key === "$type") return ["geometry-type"];
  if (key === "$id") return ["id"];
  return ["get", key];
}

// CARTO's styles use the legacy filter syntax, which cannot be combined with
// expression-only operators such as "within". This rewrites a legacy filter as
// the equivalent expression; filters already written as expressions pass
// through unchanged.
export function legacyFilterToExpression(filter: Filter): Filter {
  const [op, ...rest] = filter as [string, ...unknown[]];

  switch (op) {
    case "all":
    case "any":
      return [op, ...rest.map((child) => legacyFilterToExpression(child as Filter))];
    case "none":
      return ["!", ["any", ...rest.map((child) => legacyFilterToExpression(child as Filter))]];
    case "!has":
      return ["!", ["has", rest[0]]];
    case "in":
    case "!in": {
      if (typeof rest[0] !== "string") return filter;
      const test = ["in", getter(rest[0]), ["literal", rest.slice(1)]];
      return op === "in" ? test : ["!", test];
    }
    default: {
      if (!COMPARISON.has(op) || typeof rest[0] !== "string") return filter;
      const value = rest[1];
      const comparison = [op, getter(rest[0]), value];
      // Ordering comparisons on a missing or differently typed property are
      // false in the legacy syntax but a runtime error in expressions.
      if (op === "==" || op === "!=") return comparison;
      return ["all", ["==", ["typeof", getter(rest[0])], typeof value], comparison];
    }
  }
}

export function restrictToRegion(filter: Filter | undefined, region: unknown): Filter {
  const within = ["within", region];
  return filter ? ["all", legacyFilterToExpression(filter), within] : within;
}
