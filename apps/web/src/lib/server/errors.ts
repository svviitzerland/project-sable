import { randomUUID } from "node:crypto";

const diagnosticHints: Record<string, string> = {
  "28P01": "Check the database password in DATABASE_URL.",
  "28000": "Check the database user and authentication configuration.",
  "42P01":
    "Check that migrations 001–007 ran in the database used by DATABASE_URL.",
  "42703": "Check that all database migrations completed.",
  "42501": "Check the database role's permissions.",
  "3D000": "Check the database name in DATABASE_URL.",
  "53300": "Check database connection limits and use the transaction pooler.",
  ENOTFOUND: "Check the database hostname.",
  EAI_AGAIN: "Check DNS availability for the configured service.",
  ECONNREFUSED: "Check the database host and port.",
  ETIMEDOUT: "Check database connectivity and network restrictions.",
  ENETUNREACH: "Check network reachability to the database host.",
  SELF_SIGNED_CERT_IN_CHAIN: "Check database TLS certificate trust.",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "Check database TLS certificate trust.",
  CERT_HAS_EXPIRED: "Check the service TLS certificate expiry.",
};

export function reportUnexpectedError(error: unknown) {
  const reference = randomUUID();
  let code = "UNKNOWN";
  let cause = error;
  for (
    let depth = 0;
    depth < 4 && cause && typeof cause === "object";
    depth++
  ) {
    const candidate = cause as { code?: unknown; cause?: unknown };
    if (
      typeof candidate.code === "string" &&
      Object.hasOwn(diagnosticHints, candidate.code)
    ) {
      code = candidate.code;
      break;
    }
    cause = candidate.cause;
  }
  // Raw errors may contain credentials, SQL parameters, or case material.
  console.error(
    JSON.stringify({
      event: "jude_request_failed",
      reference,
      code,
      hint:
        diagnosticHints[code] ||
        "Unexpected server failure. Inspect the failing operation.",
    }),
  );
  return reference;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export class ProviderError extends HttpError {
  constructor(message: string) {
    super(503, message);
  }
}
export function assert(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
