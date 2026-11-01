import { boundedBody } from "./runtime";
import { assert } from "./errors";
/** Reads a bounded multipart body and returns its `file` field with the rest of the form. */
export async function readUpload(request: Request, limit = 6 * 1024 * 1024) {
  const bytes = await boundedBody(request, limit + 65536);
  const form = await new Response(Buffer.from(bytes), {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  }).formData();
  const file = form.get("file");
  assert(file instanceof File, 422, "Choose a file to upload.");
  assert(
    file.size > 0 && file.size <= limit,
    413,
    `Upload a non-empty file up to ${limit / 1024 / 1024} MB.`,
  );
  return {
    name: file.name,
    data: new Uint8Array(await file.arrayBuffer()),
    form,
  };
}
/** Returns file bytes, as an attachment when a name is given. */
export function fileResponse(data: Uint8Array, mime: string, name?: string) {
  assert(
    data.length <= 64 * 1024 * 1024,
    413,
    "Export exceeds the 64 MB transfer limit.",
  );
  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": mime,
      ...(name
        ? {
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
          }
        : {}),
    },
  });
}
