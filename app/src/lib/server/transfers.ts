import { z } from "zod";
import type { Runtime } from "./runtime";
import { boundedBody, hash, locked, rate } from "./runtime";
import { seconds } from "./database";
import type { User, Tables } from "./contracts";
import { assert } from "./errors";
import { readFileData, saveFile, signedFile, deleteFile } from "./providers";
export const PART_SIZE = 2 * 1024 * 1024;
export const transferInput = z.strictObject({
  name: z.string().min(1).max(200),
  size: z
    .number()
    .int()
    .min(1)
    .max(64 * 1024 * 1024),
});
const key = (transfer: Tables["file_transfers"], index: number) =>
  `transfers/${transfer.owner_id}/${transfer.id}/${index}`;
async function ownedTransfer(rt: Runtime, id: string, userId: string) {
  const transfer = await rt.db.one(
    "file_transfers",
    "id=? AND owner_id=? AND kind=? AND expires>?",
    [id, userId, "upload", seconds()],
  );
  assert(transfer, 404, "Upload expired or not found. Select the file again.");
  return transfer;
}
export async function createTransfer(
  rt: Runtime,
  user: User,
  body: z.output<typeof transferInput>,
) {
  assert(rt.config.hosted, 404, "Not found");
  await rate(rt, `transfers:${user.id}`, 10, 3600);
  const transfer = await rt.db.insert("file_transfers", {
    owner_id: user.id,
    ...body,
    expires: seconds() + 3600,
  });
  return { id: transfer.id, part_size: PART_SIZE };
}
export async function uploadPart(
  rt: Runtime,
  user: User,
  id: string,
  index: number,
  request: Request,
) {
  assert(rt.config.hosted, 404, "Not found");
  return locked(rt, `transfer:${id}`, async () => {
    const transfer = await ownedTransfer(rt, id, user.id);
    assert(
      Number.isInteger(index) &&
        index >= 0 &&
        index < Math.ceil(transfer.size / PART_SIZE),
      422,
      "Invalid upload part.",
    );
    const data = await boundedBody(request, PART_SIZE);
    assert(
      data.length === Math.min(PART_SIZE, transfer.size - index * PART_SIZE),
      422,
      "Upload part has the wrong size.",
    );
    const digest = hash(data),
      previous = transfer.parts[String(index)];
    assert(
      !previous || previous === digest,
      409,
      "Upload part differs from the saved file.",
    );
    if (!previous) {
      await saveFile(
        rt,
        key(transfer, index),
        data,
        "application/octet-stream",
        true,
      );
      await rt.db.update(
        "file_transfers",
        { parts: { ...transfer.parts, [index]: digest } },
        "id=?",
        [id],
      );
    }
    return { received: data.length };
  });
}
export async function resolveUpload(
  rt: Runtime,
  user: User,
  request: Request,
  limit = 6 * 1024 * 1024,
) {
  const bytes = await boundedBody(request, limit + 65536);
  const form = await new Response(Buffer.from(bytes), {
    headers: { "Content-Type": request.headers.get("content-type") || "" },
  }).formData();
  const file = form.get("file");
  if (file instanceof File) {
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
  const id = form.get("upload_id");
  assert(typeof id === "string", 422, "Choose a file to upload.");
  const transfer = await ownedTransfer(rt, id, user.id);
  assert(transfer.size <= limit, 413, "File exceeds the upload limit.");
  const count = Math.ceil(transfer.size / PART_SIZE);
  assert(
    Object.keys(transfer.parts).length === count,
    409,
    "File upload is incomplete. Try again.",
  );
  const parts: Uint8Array[] = [];
  for (let index = 0; index < count; index++) {
    const data = await readFileData(rt, {
      storage: "supabase",
      storage_key: key(transfer, index),
    });
    assert(
      hash(data) === transfer.parts[String(index)],
      409,
      "Uploaded file integrity check failed. Select the file again.",
    );
    parts.push(data);
  }
  const data = Buffer.concat(parts);
  assert(
    data.length === transfer.size,
    409,
    "Uploaded file size does not match.",
  );
  return { name: transfer.name, data, form };
}
export async function transferResponse(
  rt: Runtime,
  user: User,
  data: Uint8Array,
  mime: string,
  name?: string,
) {
  assert(
    data.length <= 64 * 1024 * 1024,
    413,
    "Export exceeds the 64 MB transfer limit.",
  );
  if (rt.config.hosted && data.length > 3 * 1024 * 1024) {
    const transfer = await rt.db.insert("file_transfers", {
      owner_id: user.id,
      name: name || "response",
      size: data.length,
      kind: "download",
      expires: seconds() + 600,
      parts: { "0": "download" },
    });
    const path = key(transfer, 0);
    await saveFile(rt, path, data, mime);
    const url = await signedFile(rt, path);
    return new Response(null, {
      status: 303,
      headers: {
        Location: url + (name ? `&download=${encodeURIComponent(name)}` : ""),
        "Referrer-Policy": "no-referrer",
      },
    });
  }
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
export async function cleanupTransfers(rt: Runtime) {
  const expired = await rt.db.all(
    "file_transfers",
    "expires<?",
    [seconds()],
    "LIMIT 10",
  );
  for (const transfer of expired) {
    const count =
      transfer.kind === "download" ? 1 : Math.ceil(transfer.size / PART_SIZE);
    for (let i = 0; i < count; i += 8)
      await Promise.all(
        Array.from({ length: Math.min(8, count - i) }, (_, j) =>
          deleteFile(rt, key(transfer, i + j), "supabase"),
        ),
      );
    await rt.db.remove("file_transfers", "id=?", [transfer.id]);
  }
}
