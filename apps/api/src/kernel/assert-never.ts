/** Exhaustiveness helper: a `switch` over a discriminated union that reaches this in its
 *  default has an unhandled variant, and the compiler flags the call site. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
