import * as env from "$app/env/private";
import type { Handle } from "@sveltejs/kit/hooks";

/** Keep authenticated HTTP on the frontend origin; sockets connect directly. */
export const handle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith("/api/")) return resolve(event);
  const target = new URL(env.API_INTERNAL_URL || "http://127.0.0.1:8000");
  target.pathname = event.url.pathname;
  target.search = event.url.search;
  const headers = new Headers(event.request.headers);
  for (const header of ["host", "connection", "content-length"])
    headers.delete(header);
  const method = event.request.method;
  try {
    const upstream = await fetch(target, {
      method,
      headers,
      redirect: "manual",
      body: ["GET", "HEAD"].includes(method) ? undefined : event.request.body,
      // Node requires duplex when forwarding a streaming request body.
      duplex: "half",
      signal: event.request.signal,
    } as RequestInit);
    const responseHeaders = new Headers(upstream.headers);
    for (const header of [
      "content-encoding",
      "content-length",
      "transfer-encoding",
    ])
      responseHeaders.delete(header);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      { detail: "The Jude backend is unavailable. Please try again." },
      { status: 502 },
    );
  }
};
