import { getRuntime } from "../../../../lib/server/app-runtime";
import { handleApi } from "../../../../lib/server/api";
import type { RequestHandler } from "./$types";
// Behind Caddy the address comes from X-Forwarded-For (ADDRESS_HEADER). Internal callers
// such as the container health check have no proxy header; treat them as local.
function clientAddress(read: () => string) {
  try {
    return read();
  } catch {
    return "local";
  }
}
const handle: RequestHandler = async ({ request, getClientAddress }) => {
  return handleApi(
    await getRuntime(),
    request,
    clientAddress(getClientAddress),
  );
};
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
