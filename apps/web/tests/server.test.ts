import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { settings } from "../src/lib/server/config";
import { connectDatabase } from "../src/lib/server/database";
import { handleApi } from "../src/lib/server/api";
import {
  checkPassword,
  hashPassword,
  type Runtime,
} from "../src/lib/server/runtime";
import { pack, unpack, validateArchive } from "../src/lib/server/archive";
import { extractPages } from "../src/lib/server/documents";
import { previewHearing } from "../src/lib/server/hearings";
import { investigate } from "../src/lib/server/analysis";
import {
  safePasalUrl,
  structured,
  bedrockInference,
  bedrockClientConfig,
  requestJson,
  saveFile,
} from "../src/lib/server/providers";
import { z } from "zod";
import { ProviderError } from "../src/lib/server/errors";
import { verifyReply } from "../src/lib/server/dialogues";
import {
  debriefSchema,
  practiceTurnSchema,
  speakerRole,
} from "../src/lib/server/practice";
import type { ContextSource } from "../src/lib/server/contracts";
import { normalizeTranscript } from "../src/lib/server/audio";

async function fixture(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), "jude-ts-"));
  const config = settings({ JUDE_DATA_DIR: dir });
  const rt: Runtime = {
    config,
    db: await connectDatabase(config),
    fetch: async () => {
      throw new Error("Unexpected network call");
    },
    tasks: new Set(),
  };
  t.after(async () => {
    await Promise.allSettled([...rt.tasks]);
    await rt.db.close();
    await rm(dir, { recursive: true, force: true });
  });
  const client = () => {
    let cookie = "";
    const call = async (
      path: string,
      method = "GET",
      data?: unknown,
      headers: Record<string, string> = {},
    ) => {
      const form = data instanceof FormData;
      const response = await handleApi(
        rt,
        new Request(`http://localhost/api/v1${path}`, {
          method,
          headers: {
            ...(cookie ? { cookie } : {}),
            ...(data && !form ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
          body:
            data === undefined ? undefined : form ? data : JSON.stringify(data),
        }),
      );
      if (response.headers.get("set-cookie"))
        cookie = response.headers.get("set-cookie")!.split(";")[0];
      return response;
    };
    const json = async (
      path: string,
      method = "GET",
      data?: unknown,
      expected = 200,
    ) => {
      const response = await call(path, method, data),
        value = await response.json();
      assert.equal(
        response.status,
        expected,
        `${method} ${path}: ${JSON.stringify(value)}`,
      );
      return value;
    };
    return {
      call,
      json,
      get cookie() {
        return cookie;
      },
    };
  };
  const a = client();
  await a.json("/auth/register", "POST", {
    email: `${randomUUID()}@example.test`,
    password: "test-password-123",
    name: "Counsel",
  });
  const record = await a.json("/cases", "POST", { title: "Test case" });
  return { rt, a, record, client, dir };
}
test("sign-in database failures log safe diagnostics with a matching reference", async (t) => {
  const { rt, client } = await fixture(t);
  const logs: string[] = [];
  t.mock.method(console, "error", (entry: string) => logs.push(entry));
  const secret = "postgresql://owner:private-password@private-host/postgres";
  for (const code of [
    "28P01",
    "42P01",
    "SELF_SIGNED_CERT_IN_CHAIN",
    "UNKNOWN_CODE",
  ]) {
    const query = t.mock.method(rt.db, "query", async () => {
      throw new Error(secret, {
        cause: Object.assign(new Error(secret), { code }),
      });
    });
    const response = await client().call("/auth/login", "POST", {
      email: "counsel@example.test",
      password: "private-account-password",
    });
    assert.equal(response.status, 500);
    const text = await response.text();
    const log = JSON.parse(logs.at(-1)!);
    assert.equal(log.event, "jude_request_failed");
    assert.equal(log.code, code === "UNKNOWN_CODE" ? "UNKNOWN" : code);
    assert.match(log.reference, /^[0-9a-f-]{36}$/);
    assert.ok(text.includes(log.reference));
    assert.ok(!text.includes(code));
    for (const output of [text, logs.at(-1)!]) {
      assert.ok(!output.includes("private-password"));
      assert.ok(!output.includes("private-host"));
      assert.ok(!output.includes("private-account-password"));
      assert.ok(!output.includes("counsel@example.test"));
    }
    query.mock.restore();
  }
  const response = await client().call("/auth/login", "POST", {
    email: "missing-account@example.test",
    password: "private-account-password",
  });
  assert.equal(response.status, 401);
  assert.equal(logs.length, 4);
});

test("provider failures keep operator diagnostics in logs and show actionable user errors", async (t) => {
  const { rt } = await fixture(t);
  const logs: string[] = [];
  t.mock.method(console, "error", (entry: string) => logs.push(entry));
  const upstreamSecret = "private-provider-key private-document-content";
  for (const status of [400, 403, 429, 503]) {
    fakeModel(rt, () => {
      throw modelError(status);
    });
    await assert.rejects(
      structured(
        rt,
        "test",
        { text: "private-document-content" },
        z.object({ answer: z.string() }),
      ),
      (error: unknown) => {
        assert(error instanceof ProviderError);
        assert.equal(error.status, 503);
        assert.match(error.message, /This AI request could not be completed/);
        assert.doesNotMatch(
          error.message,
          /Bedrock|HTTP|API.key|quota|billing|model ID/i,
        );
        if (status === 429) assert.match(error.message, /wait a moment/);
        const log = JSON.parse(logs.at(-1)!);
        assert.equal(log.event, "jude_provider_failed");
        assert.equal(log.status, status);
        assert.equal(log.provider, "Amazon Bedrock");
        assert.ok(error.message.includes(log.reference));
        assert.ok(!error.message.includes("private-"));
        return true;
      },
    );
  }
  rt.fetch = async () => new Response(upstreamSecret, { status: 200 });
  await assert.rejects(
    requestJson(rt, "https://private-host", {}, "Voice API"),
    /Voice recognition could not be completed/,
  );
  assert.equal(JSON.parse(logs.at(-1)!).kind, "invalid_json");
  rt.fetch = async () => {
    throw new Error(upstreamSecret);
  };
  await assert.rejects(
    requestJson(rt, "https://private-host", {}, "Pasal.id"),
    /Legal search could not be completed/,
  );
  assert.equal(JSON.parse(logs.at(-1)!).status, null);
  rt.config.s3Bucket = "case-files";
  rt.s3 = {
    send: async () => {
      throw Object.assign(new Error(upstreamSecret), {
        $metadata: { httpStatusCode: 403 },
      });
    },
  };
  await assert.rejects(
    saveFile(rt, "owner/case/file.txt", new Uint8Array([65]), "text/plain"),
    /The document could not be saved/,
  );
  assert.equal(JSON.parse(logs.at(-1)!).status, 403);
  rt.config.s3Bucket = "";
  for (const log of logs) assert.ok(!log.includes("private-"));
  fakeModel(rt, () => ({ answer: "ok" }));
  assert.deepEqual(
    await structured(rt, "test", {}, z.object({ answer: z.string() })),
    { answer: "ok" },
  );
});

function upload(
  name: string,
  text: string | Uint8Array,
  extra: Record<string, string> = {},
) {
  const form = new FormData();
  form.set(
    "file",
    new File([typeof text === "string" ? text : Buffer.from(text)], name),
  );
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}
const encoded = (value: unknown) =>
  new TextEncoder().encode(JSON.stringify(value));
type ModelCall = {
  model: string;
  system: string;
  payload: ReturnType<typeof JSON.parse>;
};
/** Fakes Bedrock: `reply` returns the tool input for each structured call, or throws. */
function fakeModel(rt: Runtime, reply: (call: ModelCall) => unknown) {
  rt.config.aiProvider = "bedrock";
  rt.bedrock = {
    send: (async (command: {
      input: {
        modelId: string;
        system: { text: string }[];
        messages: { content: { text: string }[] }[];
      };
    }) => {
      const input = await reply({
        model: command.input.modelId,
        system: command.input.system[0].text,
        payload: JSON.parse(command.input.messages[0].content[0].text),
      });
      return { output: { message: { content: [{ toolUse: { input } }] } } };
    }) as never,
  };
}
/** A Bedrock service error with the given HTTP status. */
const modelError = (status: number) =>
  Object.assign(new Error("private-provider-key private-document-content"), {
    name:
      (
        {
          400: "ValidationException",
          403: "AccessDeniedException",
          429: "ThrottlingException",
        } as Record<number, string>
      )[status] ?? "ServiceUnavailableException",
    $metadata: { httpStatusCode: status },
  });

test("accounts, old scrypt password compatibility, session revocation and case isolation", async (t) => {
  const { rt, a, record, client } = await fixture(t);
  const password = await hashPassword(
    "old-password",
    "00112233445566778899aabbccddeeff",
  );
  assert.equal(
    password,
    "00112233445566778899aabbccddeeff:fe70690b7ccf8629a9561a23a29b535a90b8516522a34b6572f85cee4b11092a6e69cda7cab1d82f9e6af71ea9f59c4d38db03d967fa46996e7e81420031be55",
  );
  assert.equal(await checkPassword("old-password", password), true);
  assert.equal(await checkPassword("wrong", password), false);
  const b = client();
  await b.json("/auth/register", "POST", {
    email: "second@example.test",
    password: "test-password-123",
  });
  await b.json(`/cases/${record.id}`, "GET", undefined, 404);
  const blocked = await a.call(
    "/cases",
    "POST",
    { title: "bad" },
    { origin: "https://evil.test" },
  );
  assert.equal(blocked.status, 403);
  await a.json("/cases", "POST", { title: "   " }, 422);
  const me = await a.json("/auth/me");
  assert.equal(me.password_hash, undefined);
  const cookie = a.cookie;
  await a.json("/auth/logout", "POST");
  const revoked = await handleApi(
    rt,
    new Request("http://localhost/api/v1/cases", { headers: { cookie } }),
  );
  assert.equal(revoked.status, 401);
});

test("document extraction, original bytes, deduplication and search provenance", async (t) => {
  const { a, record } = await fixture(t),
    base = `/cases/${record.id}`;
  const doc = await a.json(
    base + "/documents",
    "POST",
    upload("../witness.txt", "The arrival was at eight.\fThe guard wore blue."),
  );
  assert.equal(doc.pages, 2);
  assert.equal(doc.name, "witness.txt");
  assert.equal(doc.storage_key, undefined);
  const repeat = await a.json(
    base + "/documents",
    "POST",
    upload("renamed.txt", "The arrival was at eight.\fThe guard wore blue."),
  );
  assert.equal(repeat.id, doc.id);
  const original = await a.call(`${base}/documents/${doc.id}/original`);
  assert.equal(
    await original.text(),
    "The arrival was at eight.\fThe guard wore blue.",
  );
  const found = await a.json(base + "/search?q=guard");
  assert.equal(found.method, "keyword");
  assert.equal(found.results[0].page, 2);
  assert.equal(found.results[0].document_id, doc.id);
  const chunks = await a.json(`${base}/documents/${doc.id}/chunks`);
  assert.equal(chunks.length, 2);
  assert.equal(
    (await a.json(`${base}/sources/${chunks[1].id}`)).text,
    "The guard wore blue.",
  );
  await a.json(base + "/documents", "POST", upload("binary.exe", "nope"), 422);
  const xml =
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>First paragraph.</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph.</w:t></w:r></w:p></w:body></w:document>';
  const docx = zipSync({ "word/document.xml": strToU8(xml) });
  const pages = await extractPages("file.docx", docx);
  assert.equal(pages.pages[0][1], "First paragraph.\nSecond paragraph.");
  await assert.rejects(
    extractPages(
      "bad.docx",
      zipSync({
        "word/document.xml": strToU8(
          '<!DOCTYPE x [<!ENTITY leak SYSTEM "file:///etc/passwd">]><x>&leak;</x>',
        ),
      }),
    ),
  );
});

test("hearing parsers, reviewed words and original document exclusion", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  for (const [name, text] of [
    ["turns.txt", "Counsel: When did you arrive?\nWitness: At eight."],
    ["turns.csv", "speaker,text,start,end\nWitness,At eight.,00:01,00:02"],
    [
      "turns.vtt",
      "WEBVTT\n\n00:01.000 --> 00:02.000\n<v Witness>At eight.</v>",
    ],
    ["turns.srt", "1\n00:00:01,000 --> 00:00:02,000\nAt eight."],
  ]) {
    const result = await a.json(
      base + "/hearings/preview",
      "POST",
      upload(name, text),
    );
    assert.equal(result.method, "parsed");
    assert.ok(result.hearing.segments.length);
  }
  const file = "Witness: I arrived at eight.";
  const preview = await a.json(
    base + "/hearings/preview",
    "POST",
    upload("hearing.txt", file),
  );
  const altered = structuredClone(preview.hearing);
  altered.segments[0].text = "I arrived at nine.";
  await a.json(
    base + "/hearings/import",
    "POST",
    upload("hearing.txt", file, { transcript: JSON.stringify(altered) }),
    422,
  );
  const hearing = await a.json(
    base + "/hearings/import",
    "POST",
    upload("hearing.txt", file, {
      transcript: JSON.stringify(preview.hearing),
    }),
  );
  assert.ok(hearing.source_document_id);
  const detail = await a.json(base);
  assert.equal(detail.segments[0].analysis_state, "pending");
  const exported = await a.call(`${base}/hearings/${hearing.id}/export.jude`);
  const hearingBytes = new Uint8Array(await exported.arrayBuffer());
  assert.equal(unpack(hearingBytes).manifest.kind, "hearing");
  // WhatsApp and similar apps rename .jude archives to .jude.zip.
  const renamed = await a.json(
    base + "/hearings/preview",
    "POST",
    upload("shared.jude.zip", hearingBytes),
  );
  assert.equal(
    renamed.hearing.segments.length,
    preview.hearing.segments.length,
  );
  const unstructured = await a.json(
    base + "/hearings/preview",
    "POST",
    upload("unknown.txt", "An unfamiliar transcript."),
  );
  assert.equal(unstructured.method, "conversion_required");
  let calls = 0;
  fakeModel(rt, () => {
    calls++;
    throw modelError(500);
  });
  // The hearing's own uploaded original is excluded, so nothing can corroborate it and
  // no model call is spent.
  await investigate(rt, detail.segments[0].id);
  assert.equal(calls, 0);
  const skipped = await rt.db.one("segments", "id=?", [detail.segments[0].id]);
  assert.equal(skipped?.analysis_state, "skipped");
  assert.match(skipped?.analysis_error ?? "", /No related passage/);
  assert.equal((await a.json(base)).findings.length, 0);
});

test("LLM hearing conversion rejects invented words and inferred speakers", async (t) => {
  const { rt } = await fixture(t);
  fakeModel(rt, () => ({
    segments: [{ speaker: "Invented witness", text: "I arrived at eight." }],
  }));
  const result = await previewHearing(
    rt,
    "file.txt",
    new TextEncoder().encode("I arrived at eight."),
    true,
  );
  assert.equal(result.hearing?.segments[0].speaker, "Unknown");
  assert.equal(result.hearing?.segments[0].start, 0);
  fakeModel(rt, () => ({
    segments: [{ speaker: "Witness", text: "I arrived at nine." }],
  }));
  await assert.rejects(
    previewHearing(
      rt,
      "file.txt",
      new TextEncoder().encode("I arrived at eight."),
      true,
    ),
    /Conversion changed words/,
  );
});

test("demo sign-in imports the bundled public record as the default case", async (t) => {
  const { client } = await fixture(t);
  const demo = client();
  const user = await demo.json("/auth/demo", "POST");
  assert.equal(user.demo, true);
  // The public record is the only demonstration case; no fictional case is seeded.
  const cases = await demo.json("/cases");
  assert.equal(cases.length, 1);
  const [record] = cases;
  assert.match(record.title, /^Perkara Ferdy Sambo$/);
  assert.match(record.reference, /catatan publik/);
  assert.equal(record.synthetic, false);
  const detail = await demo.json(`/cases/${record.id}`);
  const putusan = detail.documents.find(
    (d: { mime: string }) => d.mime === "application/pdf",
  );
  assert.ok(putusan, "the putusan excerpt is bundled as an original PDF");
  assert.equal(putusan.pages, 68);
  assert.equal(detail.hearings.length, 2);
  assert.ok(detail.segments.length > 600);
  assert.ok(detail.findings.length >= 90);
  const statuses = new Set(
    detail.findings.map((f: { status: string }) => f.status),
  );
  for (const status of ["supported", "context_needed", "insufficient_evidence"])
    assert.ok(statuses.has(status), status);
  // Role labels come from the reviewed transcript, not provider keys alone.
  const speakers = new Set(
    detail.segments.map((s: { speaker: string }) => s.speaker),
  );
  for (const role of [
    "Hakim Ketua",
    "Penuntut Umum",
    "Penasihat Hukum",
    "Saksi Susi",
    "Saksi Kodir",
  ])
    assert.ok(speakers.has(role), role);
  // Every finding cites the putusan excerpt, with quotes present in its source passages.
  const original = await demo.call(
    `/cases/${record.id}/documents/${putusan.id}/original`,
  );
  assert.equal(original.headers.get("content-type"), "application/pdf");
  for (const finding of detail.findings)
    for (const citation of finding.citations)
      assert.ok(citation.quote.trim().length > 0);
});
test("demo case route, review notes, portable archive remapping and checksum guards", async (t) => {
  const { a } = await fixture(t);
  // The former synthetic route now opens the same public demonstration case.
  const record = await a.json("/cases/synthetic", "POST"),
    base = `/cases/${record.id}`;
  assert.match(record.reference, /catatan publik/);
  const detail = await a.json(base);
  assert.ok(detail.findings.length > 0);
  // Some demo findings cite two quotes from one passage; graph ids must stay unique
  // because the evidence map renders keyed lists.
  const demoGraph = await a.json(base + "/graph");
  for (const list of [demoGraph.nodes, demoGraph.edges]) {
    const ids = list.map((item: { id: string }) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  }
  const finding = detail.findings[0];
  await a.json(`${base}/findings/${finding.id}`, "PATCH", {
    reviewed: true,
    note: "Verify the original.",
  });
  const exported = await a.call(base + "/export.jude"),
    bytes = new Uint8Array(await exported.arrayBuffer());
  const { manifest, files } = unpack(bytes);
  assert.equal(
    manifest.findings.find((f: { id: string }) => f.id === finding.id).reviewed,
    true,
  );
  const imported = await a.json(
      "/cases/import",
      "POST",
      upload("case.jude", bytes),
    ),
    copy = await a.json(`/cases/${imported.id}`);
  assert.notEqual(imported.id, record.id);
  const renamedCase = await a.json(
    "/cases/import",
    "POST",
    upload("case.jude.zip", bytes),
  );
  assert.notEqual(renamedCase.id, imported.id);
  const copied = copy.findings.find(
    (f: { note: string }) => f.note === "Verify the original.",
  );
  assert.equal(copy.findings.length, detail.findings.length);
  assert.equal(copied.reviewed, false);
  assert.equal(copied.mode, "imported");
  assert.notEqual(copied.citations[0].chunk_id, finding.citations[0].chunk_id);
  files[Object.keys(files)[0]] = strToU8("tampered");
  assert.throws(() => validateArchive(pack(manifest, files)), /integrity/);
  assert.throws(
    () =>
      unpack(
        zipSync({
          "manifest.json": encoded({ format: "jude", version: 1 }),
          "../escape": strToU8("bad"),
        }),
      ),
    /entry/,
  );
  const huge = zipSync({ "manifest.json": new Uint8Array(13 * 1024 * 1024) });
  assert.throws(() => unpack(huge), /expanded-size/);
});

test("evidence relationships and retrieval remain case scoped", async (t) => {
  const { a, record, client } = await fixture(t),
    base = `/cases/${record.id}`;
  for (const [name, text] of [
    ["one.txt", "Witness arrived at the warehouse at eight."],
    ["two.txt", "A guard saw the witness at the warehouse entrance."],
  ])
    await a.json(base + "/documents", "POST", upload(name, text));
  const built = await a.json(base + "/graph/build", "POST");
  assert.equal(built.added, 1);
  assert.deepEqual(built.notice_codes, ["links_ready"]);
  const graph = await a.json(base + "/graph");
  // Notices travel as codes so the browser can show them in Indonesian or English.
  assert.equal(graph.notice_code, "similarity_advisory");
  assert.equal(graph.edges[0].relation, "related");
  assert.equal(graph.edges[0].confirmed, false);
  await a.json(`${base}/links/${graph.edges[0].id}`, "PATCH", {
    confirmed: true,
  });
  const result = await a.json(base + "/ask", "POST", {
    query: "arrival warehouse",
  });
  assert.equal(result.answer, null);
  assert.equal(result.sources.length, 2);
  await a.json(
    base + "/links",
    "POST",
    {
      source_id: graph.nodes[0].id,
      target_id: graph.nodes[0].id,
      relation: "supports",
      explanation: "The same passage.",
    },
    422,
  );
  const b = client();
  await b.json("/auth/register", "POST", {
    email: "graph-owner@example.test",
    password: "test-password-123",
  });
  await b.json(base + "/graph", "GET", undefined, 404);
});

test("assistant selected sources, persistence, idempotence and practice stay outside evidence", async (t) => {
  const { a, record } = await fixture(t),
    base = `/cases/${record.id}`;
  const doc = await a.json(
    base + "/documents",
    "POST",
    upload("witness.txt", "I arrived at eight."),
  );
  const dialogue = await a.json(base + "/dialogues", "POST", {
      kind: "assistant",
    }),
    path = `${base}/dialogues/${dialogue.id}/messages`,
    input = {
      text: "When did the witness arrive?",
      reference_ids: [`document:${doc.id}`],
      request_id: randomUUID(),
    };
  const reply = await a.json(path, "POST", input);
  assert.equal(reply.messages.length, 2);
  assert.equal(reply.messages[1].citations[0].source.document_id, doc.id);
  assert.equal((await a.json(path, "POST", input)).messages.length, 2);
  await a.json(
    path,
    "POST",
    { ...input, request_id: randomUUID(), reference_ids: ["document:foreign"] },
    404,
  );
  assert.equal(
    (await a.json(`${base}/dialogues/${dialogue.id}`)).messages.length,
    2,
  );
  // Practice is AI-only: without a provider it is unavailable, never a scripted drill.
  const unavailable = await a.json(
    base + "/dialogues",
    "POST",
    { kind: "practice", conditions: { user_role: "judge" } },
    503,
  );
  assert.match(unavailable.detail, /AI rehearsal is unavailable/);
  await a.json(
    base + "/dialogues",
    "POST",
    { kind: "practice", mode: "guided", conditions: {} },
    422,
  );
  assert.equal((await a.json(`${base}/dialogues?kind=practice`)).length, 0);
  const exported = await a.call(`${base}/dialogues/${dialogue.id}/export`);
  assert.equal((await exported.json()).format, "jude-conversation");
});

test("reply quotes canonicalize whitespace only and preserve exact source text", () => {
  const text = "The witness did\nnot remove tablets.\u00a0Count: 12 (T-3).";
  const source: ContextSource = {
    chunk_id: "source-1",
    kind: "document",
    title: "Source",
    text,
    document_id: "doc-1",
    page: 1,
    hearing_id: null,
  };
  const quote = "The witness did not remove tablets. Count: 12 (T-3).";
  const verified = verifyReply(
    [{ chunk_id: "source-1", quote, relation: "supports" }],
    [source],
    true,
  );
  assert.equal(verified[0].quote, text);
  assert.ok(source.text.includes(verified[0].quote));
  for (const invalid of [
    "The witness did remove tablets.",
    "Count: 21 (T-3).",
    "Count: 12 (T.3).",
    "count: 12 (T-3).",
    "The witness ... tablets.",
    " ",
  ])
    assert.throws(
      () =>
        verifyReply(
          [{ chunk_id: "source-1", quote: invalid, relation: "supports" }],
          [source],
          true,
        ),
      /did not match/,
    );
  assert.throws(
    () =>
      verifyReply(
        [{ chunk_id: "foreign", quote, relation: "supports" }],
        [source],
        true,
      ),
    /did not match/,
  );
});

test("assistant repairs citations once before atomic save and preserves idempotence", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  await a.json(
    base + "/documents",
    "POST",
    upload("source.txt", "The witness arrived\nat eight."),
  );
  let calls = 0;
  fakeModel(rt, ({ payload: packet }) => {
    calls++;
    if (calls === 1)
      return {
        answer: "Unsupported draft.",
        uses_case_facts: true,
        citations: [
          {
            chunk_id: "wrong-document-id",
            quote: "Invented quotation.",
            relation: "supports",
          },
        ],
      };
    assert.equal(calls, 2);
    assert.equal(packet.citation_repair.reason, "unknown_source");
    assert.equal(packet.citation_repair.must_cite, true);
    return {
      answer: "The witness reports arriving at eight.",
      uses_case_facts: true,
      citations: [
        {
          chunk_id: packet.case_context.sources[0].chunk_id,
          quote: "The witness arrived at eight.",
          relation: "supports",
        },
      ],
    };
  });
  const dialogue = await a.json(base + "/dialogues", "POST", {
    kind: "assistant",
  });
  const path = `${base}/dialogues/${dialogue.id}/messages`;
  const input = {
    text: "When did the witness arrive?",
    request_id: randomUUID(),
  };
  const result = await a.json(path, "POST", input);
  assert.equal(calls, 2);
  assert.equal(result.messages.length, 2);
  assert.equal(
    result.messages[1].text,
    "The witness reports arriving at eight.",
  );
  assert.equal(
    result.messages[1].citations[0].quote,
    "The witness arrived\nat eight.",
  );
  assert.ok(!JSON.stringify(result).includes("Unsupported draft"));
  assert.equal((await a.json(path, "POST", input)).messages.length, 2);
  assert.equal(calls, 2);
});

test("failed citation repair stays bounded, cannot drop required citations, and falls back to source excerpts", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  await a.json(
    base + "/documents",
    "POST",
    upload("source.txt", "The witness did not remove tablets."),
  );
  let calls = 0;
  fakeModel(rt, () => {
    calls++;
    return {
      answer: "Unverified claim.",
      uses_case_facts: calls === 1,
      citations: [],
    };
  });
  const dialogue = await a.json(base + "/dialogues", "POST", {
    kind: "assistant",
  });
  const path = `${base}/dialogues/${dialogue.id}/messages`;
  const fallback = await a.json(path, "POST", {
    text: "What happened?",
    request_id: randomUUID(),
  });
  assert.equal(calls, 2);
  // The unverified draft is never saved. The reply shows source excerpts instead.
  assert.equal(fallback.messages.length, 2);
  assert.ok(!JSON.stringify(fallback).includes("Unverified claim"));
  assert.match(fallback.messages[1].text, /could not be matched/);
  assert.equal(
    fallback.messages[1].citations[0].quote,
    "The witness did not remove tablets.",
  );
  calls = 0;
  fakeModel(rt, () => {
    calls++;
    throw modelError(403);
  });
  await a.json(
    path,
    "POST",
    { text: "What happened?", request_id: randomUUID() },
    503,
  );
  assert.equal(calls, 1);
});

test("AI conversations reject forged citations and speaking for the user, atomically", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  fakeModel(rt, () => ({
    answer: "A case claim.",
    uses_case_facts: true,
    citations: [
      { chunk_id: "foreign", quote: "invented", relation: "supports" },
    ],
  }));
  const dialogue = await a.json(base + "/dialogues", "POST", {
    kind: "assistant",
  });
  await a.json(
    `${base}/dialogues/${dialogue.id}/messages`,
    "POST",
    { text: "What happened?", request_id: randomUUID() },
    503,
  );
  assert.equal(
    (await a.json(`${base}/dialogues/${dialogue.id}`)).messages.length,
    0,
  );
  fakeModel(rt, () => ({
    speeches: [
      {
        speaker: "defense",
        name: "",
        text: "I will speak for you.",
        uses_case_facts: false,
        citations: [],
      },
    ],
    coaching: { kind: "none", note: "", citations: [] },
  }));
  const practice = await a.json(base + "/dialogues", "POST", {
    kind: "practice",
    conditions: { user_role: "defense" },
  });
  const failed = await a.json(
    `${base}/dialogues/${practice.id}/messages`,
    "POST",
    { text: "Begin.", request_id: randomUUID() },
    503,
  );
  assert.match(failed.detail, /spoke for your selected role/);
  assert.equal(
    (await a.json(`${base}/dialogues/${practice.id}`)).messages.length,
    1,
  );
});

type PracticePayload = {
  case_context: { sources: ContextSource[] };
  rehearsal: {
    cast: string;
    stage_guidance: string;
    pressure_guidance: string;
    language: string;
    transcript: { user: boolean; speaker: string }[];
  };
  transcript: { user: boolean; speaker: string }[];
  latest_user_turn: string;
  coaching_requested: boolean;
  citation_repair: { reason: string };
};
type SavedMessage = {
  role: string;
  speaker: string;
  notice: string;
  citations: { quote: string; source: ContextSource }[];
};

test("practice schemas stay fully required for strict providers yet tolerate omitted empty fields", () => {
  const turn = z.toJSONSchema(practiceTurnSchema) as unknown as {
    required: string[];
    properties: {
      speeches: { items: { required: string[] } };
      coaching: { required: string[] };
    };
  };
  assert.deepEqual(turn.required, ["speeches", "coaching"]);
  assert.deepEqual(turn.properties.speeches.items.required.toSorted(), [
    "citations",
    "name",
    "speaker",
    "text",
    "uses_case_facts",
  ]);
  assert.deepEqual(turn.properties.coaching.required.toSorted(), [
    "citations",
    "kind",
    "note",
  ]);
  // Models often drop empty arrays; that must not fail a whole turn.
  const parsed = practiceTurnSchema.parse({
    speeches: [
      { speaker: "witness", text: "Saya tidak ingat.", uses_case_facts: false },
    ],
  });
  assert.deepEqual(parsed.speeches[0].citations, []);
  assert.equal(parsed.coaching.kind, "none");
  // The citation requirement cannot be skipped by omitting the case-facts flag.
  assert.throws(() =>
    practiceTurnSchema.parse({
      speeches: [{ speaker: "judge", text: "Lanjutkan." }],
    }),
  );
  assert.deepEqual(debriefSchema.parse({ summary: "Ringkas." }).revisit, []);
  // Courtroom titles map to roles. Unknown speakers are dropped, not saved.
  assert.equal(speakerRole("Hakim Ketua"), "judge");
  assert.equal(speakerRole("JPU"), "opposing");
  assert.equal(speakerRole("Penasihat Hukum"), "defense");
  assert.equal(speakerRole("Saksi Susi"), "witness");
  assert.equal(speakerRole("Narrator"), null);
});

test("AI rehearsal plays the other roles from the record, coaches subtly, and debriefs with verified citations", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  const doc = await a.json(
    base + "/documents",
    "POST",
    upload(
      "bap-dewi.txt",
      "BAP Saksi Dewi Lestari. Saya tiba di gudang pukul 22.30 dan melihat terdakwa membawa kardus.",
    ),
  );
  const calls: { system: string; payload: PracticePayload }[] = [];
  let reply: (payload: PracticePayload, call: number) => unknown = () => ({});
  fakeModel(rt, ({ system, payload }) => {
    calls.push({ system, payload });
    return reply(payload, calls.length);
  });
  const chunk = (payload: PracticePayload) =>
    payload.case_context.sources.find((s) => s.document_id === doc.id)!
      .chunk_id;
  const practice = await a.json(base + "/dialogues", "POST", {
    kind: "practice",
    conditions: {
      user_role: "defense",
      stage: "Cross-examination",
      difficulty: "Challenging",
      language: "Bahasa Indonesia",
    },
  });
  assert.equal(practice.mode, "ai");
  assert.equal(practice.messages[0].role, "scene");
  const path = `${base}/dialogues/${practice.id}/messages`;

  // A turn: objection, ruling and a cited witness answer, plus one coaching note.
  reply = (payload) => ({
    speeches: [
      {
        speaker: "opposing",
        name: "",
        text: "Keberatan, Yang Mulia. Pertanyaan menjerat.",
        uses_case_facts: false,
        citations: [],
      },
      {
        speaker: "judge",
        name: "",
        text: "Keberatan diterima. Saudara Penasihat Hukum, ulangi pertanyaan.",
        uses_case_facts: false,
        citations: [],
      },
      {
        speaker: "witness",
        name: "Dewi Lestari\n",
        text: "Saya tiba pukul 22.30, Yang Mulia.",
        uses_case_facts: true,
        citations: [
          {
            chunk_id: chunk(payload),
            quote: "Saya tiba di gudang pukul 22.30",
            relation: "supports",
          },
        ],
      },
    ],
    coaching: {
      kind: "leading",
      note: "Pertanyaan ini mengarahkan jawaban; tanyakan secara terbuka.",
      citations: [],
    },
  });
  const first = await a.json(path, "POST", {
    text: "Saudara tiba pukul 22.30, benar?",
    request_id: randomUUID(),
  });
  const prompt = calls.at(-1)!;
  assert.match(prompt.system, /REHEARSAL/);
  assert.match(prompt.system, /do not know or do not remember/);
  assert.match(prompt.system, /Yang Mulia/);
  assert.match(prompt.system, /never use em dashes/);
  assert.match(prompt.payload.rehearsal.cast, /Penuntut Umum/);
  assert.match(prompt.payload.rehearsal.stage_guidance, /BAP/);
  assert.match(prompt.payload.rehearsal.pressure_guidance, /challenging/);
  assert.equal(prompt.payload.rehearsal.language, "Bahasa Indonesia");
  assert.equal(
    prompt.payload.latest_user_turn,
    "Saudara tiba pukul 22.30, benar?",
  );
  assert.deepEqual(
    first.messages.slice(1).map((m: SavedMessage) => [m.role, m.speaker]),
    [
      ["user", "defense"],
      ["coach", "leading"],
      ["assistant", "opposing"],
      ["assistant", "judge"],
      ["assistant", "witness:Dewi Lestari"],
    ],
  );
  const witness = first.messages.at(-1);
  assert.equal(witness.citations[0].source.document_id, doc.id);
  assert.match(witness.notice, /Hypothetical rehearsal/);
  assert.equal(first.messages.at(-2).notice, "");
  assert.equal((await a.json(base)).segments.length, 0);

  // Coaching off: no note is saved even when the model offers one.
  await a.json(path, "POST", {
    text: "Apa yang Saudara lihat?",
    request_id: randomUUID(),
    coaching: false,
  });
  assert.equal(calls.at(-1)!.payload.coaching_requested, false);
  assert.ok(
    !calls
      .at(-1)!
      .payload.transcript.some((line) => line.speaker === "leading"),
    "coaching notes stay out of the roleplay transcript",
  );
  const saved = (await a.json(`${base}/dialogues/${practice.id}`)).messages;
  assert.equal(saved.filter((m: SavedMessage) => m.role === "coach").length, 1);

  // A forged witness quote is corrected once; an unverifiable coaching note is dropped.
  let before = calls.length;
  reply = (payload, call) => ({
    speeches: [
      {
        speaker: "witness",
        name: "",
        text: "Saya melihat terdakwa membawa kardus.",
        uses_case_facts: true,
        citations: [
          {
            chunk_id: chunk(payload),
            quote:
              call === before + 1
                ? "Saya melihat terdakwa membawa senjata."
                : "melihat terdakwa membawa kardus",
            relation: "supports",
          },
        ],
      },
    ],
    coaching: {
      kind: "contradiction",
      note: "Bandingkan dengan keterangan lain.",
      citations: [
        { chunk_id: "invented", quote: "invented", relation: "conflicts" },
      ],
    },
  });
  const corrected = await a.json(path, "POST", {
    text: "Apa yang dibawa terdakwa?",
    request_id: randomUUID(),
  });
  assert.equal(calls.length, before + 2);
  assert.equal(calls.at(-1)!.payload.citation_repair.reason, "quote_mismatch");
  assert.equal(corrected.messages.at(-1).speaker, "witness");
  assert.equal(corrected.messages.at(-2).role, "user");

  // After the one correction, a speech that still misquotes is dropped, never saved uncited.
  before = calls.length;
  reply = (payload) => ({
    speeches: [
      {
        speaker: "Hakim Ketua",
        name: "",
        text: "Saudara Saksi, jawab pertanyaan itu.",
        uses_case_facts: false,
        citations: [],
      },
      {
        speaker: "witness",
        name: "",
        text: "Saya membawa senjata.",
        uses_case_facts: true,
        citations: [
          {
            chunk_id: chunk(payload),
            quote: "Saya membawa senjata.",
            relation: "supports",
          },
        ],
      },
    ],
    coaching: { kind: "none", note: "", citations: [] },
  });
  const partial = await a.json(path, "POST", {
    text: "Apa yang Saudara bawa?",
    request_id: randomUUID(),
  });
  assert.equal(calls.length, before + 2);
  assert.equal(partial.messages.at(-1).speaker, "judge");
  assert.equal(partial.messages.at(-2).role, "user");
  assert.ok(!JSON.stringify(partial.messages).includes("Saya membawa senjata"));
  // When nothing verifiable remains, the exchange fails and saves nothing.
  const count = partial.messages.length;
  reply = (payload) => ({
    speeches: [
      {
        speaker: "witness",
        name: "",
        text: "Saya membawa senjata.",
        uses_case_facts: true,
        citations: [
          {
            chunk_id: chunk(payload),
            quote: "Saya membawa senjata.",
            relation: "supports",
          },
        ],
      },
    ],
    coaching: { kind: "none", note: "", citations: [] },
  });
  await a.json(
    path,
    "POST",
    { text: "Apa lagi?", request_id: randomUUID() },
    503,
  );
  assert.equal(
    (await a.json(`${base}/dialogues/${practice.id}`)).messages.length,
    count,
  );

  // Debrief: one message per item; an unverifiable revisit item is dropped after one correction.
  before = calls.length;
  reply = (payload) => ({
    summary: "Sesi berjalan terarah.",
    strengths: [{ point: "Pertanyaan kedua terbuka.", citations: [] }],
    tighten: [
      {
        point: "Hindari pertanyaan menjerat; tanyakan 'Pukul berapa?'.",
        citations: [],
      },
    ],
    revisit: [
      {
        point: "Waktu kedatangan saksi.",
        citations: [
          {
            chunk_id: chunk(payload),
            quote: "pukul 22.30",
            relation: "context",
          },
        ],
      },
      { point: "Tanpa sumber.", citations: [] },
    ],
  });
  const debrief = await a.json(path, "POST", {
    text: "Selesai.",
    request_id: randomUUID(),
    finish: true,
  });
  assert.equal(calls.length, before + 2);
  assert.match(calls.at(-1)!.system, /DEBRIEF/);
  assert.match(calls.at(-1)!.system, /No numeric score/);
  assert.match(calls.at(-1)!.system, /never use em dashes/);
  assert.ok(calls.at(-1)!.payload.rehearsal.transcript.some((l) => l.user));
  assert.equal(debrief.status, "complete");
  const items = debrief.messages.filter(
    (m: SavedMessage) => m.role === "debrief",
  );
  assert.deepEqual(
    items.map((m: SavedMessage) => m.speaker),
    ["summary", "strength", "tighten", "revisit"],
  );
  assert.equal(items.at(-1).citations[0].quote, "pukul 22.30");
  await a.json(path, "POST", { text: "Lagi.", request_id: randomUUID() }, 409);
  const exported = await (
    await a.call(`${base}/dialogues/${practice.id}/export`)
  ).json();
  assert.ok(
    exported.conversation.messages.some(
      (m: SavedMessage) => m.role === "debrief",
    ),
  );

  // Sessions saved by the retired scripted drill stay readable but cannot continue.
  const legacy = await rt.db.insert("dialogues", {
    case_id: record.id,
    kind: "practice",
    title: "Old drill",
    mode: "guided",
    conditions: { user_role: "judge" },
  });
  await a.json(`${base}/dialogues/${legacy.id}`);
  await a.json(
    `${base}/dialogues/${legacy.id}/messages`,
    "POST",
    { text: "Continue.", request_id: randomUUID() },
    409,
  );
});

test("analysis screens with one cheap call, reviews only inconsistencies independently on Bedrock, and withholds invented quotes", async (t) => {
  const { a, rt, record } = await fixture(t),
    base = `/cases/${record.id}`;
  await a.json(
    base + "/documents",
    "POST",
    upload("bap.txt", "Saksi menyatakan tiba di gudang pukul 22.30."),
  );
  const hearing = await a.json(base + "/hearings", "POST", { title: "Sidang" });
  const say = (text: string) =>
    rt.db.insert("segments", {
      case_id: record.id,
      hearing_id: hearing.id,
      text,
    });
  rt.config.aiProvider = "bedrock";
  const calls: {
    model: string;
    role: string;
    payload: Record<string, unknown>;
  }[] = [];
  let screenQuote = "";
  let confirmed = false;
  let reviewerFails = false;
  rt.bedrock = {
    send: (async (command: {
      input: {
        modelId: string;
        system: { text: string }[];
        messages: { content: { text: string }[] }[];
      };
    }) => {
      const payload = JSON.parse(command.input.messages[0].content[0].text);
      const role = command.input.system[0].text;
      calls.push({ model: command.input.modelId, role, payload });
      const sourceId = (payload.sources as { id: string }[])[0].id;
      if (reviewerFails && role.includes("Independent reviewer"))
        throw new Error("reviewer timed out");
      const input = role.includes("Independent reviewer")
        ? {
            summary:
              "Times differ; check whether both refer to the same night.",
            alternative_explanations: ["Different visit"],
            missing_context: ["Gate log"],
            conflict_confirmed: confirmed,
          }
        : {
            checkable: true,
            status: "potential_inconsistency",
            title: "Waktu tiba berbeda",
            explanation: "Keterangan sidang pukul 21.00; BAP pukul 22.30.",
            uncertainty: "Bisa jadi kunjungan berbeda.",
            verification: "Periksa BAP halaman 1.",
            question: "Pukul berapa Saudara tiba?",
            citations: [
              { chunk_id: sourceId, quote: screenQuote, relation: "conflicts" },
            ],
          };
      return {
        output: {
          message: { content: [{ toolUse: { name: "respond", input } }] },
        },
      };
    }) as never,
  };
  // An invented quote is withheld after one call; the reviewer is never paid for.
  screenQuote = "pukul 21.00";
  const invented = await say("Saya tiba pukul sembilan malam.");
  await investigate(rt, invented.id);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].model, rt.config.bedrockModel);
  assert.equal(
    (await rt.db.one("segments", "id=?", [invented.id]))?.analysis_state,
    "failed",
  );
  // A verified conflict goes to the review model, which never sees the screen's answer.
  screenQuote = "pukul 22.30";
  const unconfirmed = await say("Saya tiba pukul sembilan malam, Yang Mulia.");
  await investigate(rt, unconfirmed.id);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].model, rt.config.bedrockReviewModel);
  assert.equal(
    JSON.stringify(calls[2].payload).includes("Waktu tiba berbeda"),
    false,
  );
  let finding = (await a.json(base)).findings.find(
    (f: { segment_id: string }) => f.segment_id === unconfirmed.id,
  );
  assert.equal(finding.status, "context_needed");
  confirmed = true;
  const kept = await say("Saya sampai jam sembilan.");
  await investigate(rt, kept.id);
  finding = (await a.json(base)).findings.find(
    (f: { segment_id: string }) => f.segment_id === kept.id,
  );
  assert.equal(finding.status, "potential_inconsistency");
  assert.equal(finding.review.reviewed_by, "independent");
  // Without a reviewer answer the statement still completes, never as a conflict.
  reviewerFails = true;
  const unreviewed = await say("Saya datang jam sembilan.");
  await investigate(rt, unreviewed.id);
  assert.equal(
    (await rt.db.one("segments", "id=?", [unreviewed.id]))?.analysis_state,
    "complete",
  );
  finding = (await a.json(base)).findings.find(
    (f: { segment_id: string }) => f.segment_id === unreviewed.id,
  );
  assert.equal(finding.status, "context_needed");
  assert.equal(finding.review.reviewed_by, "review_unavailable");
});

test("Bedrock structured calls repair stringified arrays and retry one schema failure by field path only", async (t) => {
  const { rt } = await fixture(t);
  rt.config.aiProvider = "bedrock";
  const schema = z.strictObject({
    status: z.enum(["supported", "context_needed"]),
    citations: z.array(z.strictObject({ quote: z.string() })),
  });
  const replies: unknown[] = [];
  const roles: string[] = [];
  rt.bedrock = {
    send: (async (command: { input: { system: { text: string }[] } }) => {
      roles.push(command.input.system[0].text);
      const input = replies.shift();
      return {
        output: {
          message: {
            content: input === undefined ? [] : [{ toolUse: { input } }],
          },
        },
      };
    }) as never,
  };
  // A JSON-string array (a known tool-use quirk) is parsed without another call.
  replies.push({ status: "supported", citations: '[{"quote":"pukul 22.30"}]' });
  assert.deepEqual(await structured(rt, "screen", {}, schema), {
    status: "supported",
    citations: [{ quote: "pukul 22.30" }],
  });
  assert.equal(roles.length, 1);
  // A missing field gets one retry that names the path, never the rejected content.
  replies.push(
    { citations: [{ quote: "rahasia saksi" }] },
    { status: "context_needed", citations: [] },
  );
  assert.equal(
    (await structured(rt, "screen", {}, schema)).status,
    "context_needed",
  );
  assert.equal(roles.length, 3);
  assert.match(roles[2], /failed schema validation at: status\./);
  assert.equal(roles[2].includes("rahasia saksi"), false);
  // A missing tool call counts as a failure; two failures stop without a third call.
  replies.push(undefined, { status: "unknown", citations: [] });
  await assert.rejects(
    structured(rt, "screen", {}, schema),
    /could not be verified/,
  );
  assert.equal(roles.length, 5);
  // Reasoning models reject temperature; Nova keeps a low one.
  assert.equal(
    "temperature" in bedrockInference("global.moonshotai.kimi-k3"),
    false,
  );
  assert.equal(
    bedrockInference("global.amazon.nova-2-lite-v1:0").temperature,
    0.1,
  );
  assert.equal(bedrockClientConfig("ap-southeast-1").retryMode, "adaptive");
});

test("legal URLs stay on Pasal", () => {
  assert.equal(safePasalUrl("https://evil.test/law"), null);
  assert.equal(safePasalUrl("javascript:alert(1)"), null);
  assert.equal(safePasalUrl("https://pasal.id/uu/1"), "https://pasal.id/uu/1");
});

test("browser audio session authorization, batching, duplication and scoped speaker offsets", async (t) => {
  const { rt, a, record, client } = await fixture(t),
    base = `/cases/${record.id}`;
  rt.config.transcribe = true;
  rt.awsCredentials = {
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "server-only-secret",
  };
  const hearing = await a.json(base + "/hearings", "POST", {
    title: "Audio hearing",
  });
  await a.json(
    base + "/audio-sessions",
    "POST",
    {
      hearing_id: hearing.id,
      authorized: false,
      language: "en",
      sample_rate: 48000,
    },
    422,
  );
  const session = await a.json(base + "/audio-sessions", "POST", {
    hearing_id: hearing.id,
    authorized: true,
    language: "en",
    sample_rate: 48000,
    start_offset: 30,
  });
  // A presigned Amazon Transcribe URL: signed, short-lived, never the secret itself.
  const signed = new URL(session.url);
  assert.equal(signed.protocol, "wss:");
  assert.equal(
    signed.host,
    "transcribestreaming.ap-southeast-1.amazonaws.com:8443",
  );
  assert.equal(signed.searchParams.get("language-code"), "en-US");
  assert.equal(signed.searchParams.get("sample-rate"), "48000");
  assert.equal(signed.searchParams.get("show-speaker-label"), "true");
  assert.equal(signed.searchParams.get("X-Amz-Expires"), "300");
  assert.match(
    signed.searchParams.get("X-Amz-Signature") ?? "",
    /^[0-9a-f]{64}$/,
  );
  assert.equal(session.start_offset, 30);
  assert.equal(JSON.stringify(session).includes("server-only-secret"), false);
  const batch = {
    sequence: 1,
    results: [
      {
        type: "word",
        start_time: 0,
        end_time: 1,
        alternatives: [{ content: "Hello", speaker: "S1", confidence: 0.9 }],
      },
      { type: "punctuation", alternatives: [{ content: "." }] },
    ],
  };
  const endpoint = `${base}/audio-sessions/${session.id}/transcripts`;
  await a.json(endpoint, "POST", batch);
  await a.json(endpoint, "POST", batch);
  const detail = await a.json(base);
  assert.equal(detail.segments.length, 1);
  assert.equal(detail.segments[0].text, "Hello.");
  assert.equal(detail.segments[0].start, 30);
  assert.match(detail.segments[0].speaker, /:S1$/);
  assert.equal(detail.segments[0].confidence, 0.9);
  await a.json(endpoint, "POST", { ...batch, sequence: 3 }, 409);
  const b = client();
  await b.json("/auth/register", "POST", {
    email: "other-audio@example.test",
    password: "test-password-123",
  });
  await b.json(endpoint, "POST", batch, 404);
  await a.json(`${base}/audio-sessions/${session.id}/stop`, "POST");
  assert.equal((await a.json(base)).case.status, "paused");
  await a.json(endpoint, "POST", { ...batch, sequence: 2 }, 409);
  const groups = normalizeTranscript([
    {
      type: "word",
      start_time: 0,
      end_time: 1,
      alternatives: [{ content: "One", speaker: "S1" }],
    },
    {
      type: "word",
      start_time: 1,
      end_time: 2,
      alternatives: [{ content: "Two", speaker: "S2" }],
    },
  ]);
  assert.equal(groups.length, 2);
});

test("PDF extraction runs in Node and empty scans report the OCR requirement", async () => {
  const pdf = await readFile(new URL("./fixtures/text.pdf", import.meta.url));
  const result = await extractPages("text.pdf", pdf);
  assert.match(result.pages[0][1], /Warehouse arrival/);
  const blank = Buffer.from(
    pdf
      .toString("binary")
      .replace(
        "Warehouse arrival at eight.",
        " ".repeat("Warehouse arrival at eight.".length),
      ),
    "binary",
  );
  await assert.rejects(
    extractPages("scan.pdf", blank),
    /Scanned PDFs need OCR/,
  );
});

test("archives produced by the original Python backend import without losing records", async (t) => {
  const { a } = await fixture(t),
    data = await readFile(
      new URL("./fixtures/legacy-python.jude", import.meta.url),
    ),
    record = await a.json("/cases/import", "POST", upload("legacy.jude", data)),
    detail = await a.json(`/cases/${record.id}`);
  assert.equal(record.title, "Python archive compatibility");
  assert.equal(detail.documents.length, 1);
  assert.equal(detail.hearings.length, 1);
  assert.equal(detail.segments.length, 1);
  assert.equal(detail.findings[0].note, "Preserve this note.");
  assert.equal(detail.findings[0].reviewed, false);
  assert.equal(detail.findings[0].mode, "imported");
});

test("oversized streaming requests without Content-Length are rejected before parsing", async (t) => {
  const { a } = await fixture(t);
  const response = await a.call("/cases", "POST", {
    title: "x".repeat(2 * 1024 * 1024 + 1),
  });
  assert.equal(response.status, 413);
});

test("S3 storage keeps originals private and downloads return the bytes directly", async (t) => {
  const { rt, a, record } = await fixture(t);
  const objects = new Map<string, Uint8Array>(),
    commands: string[] = [];
  rt.config.s3Bucket = "case-files";
  rt.s3 = {
    send: (async (command: {
      constructor: { name: string };
      input: { Bucket: string; Key: string; Body?: Uint8Array };
    }) => {
      const { Bucket, Key, Body } = command.input;
      assert.equal(Bucket, "case-files");
      commands.push(command.constructor.name);
      if (command.constructor.name === "PutObjectCommand")
        objects.set(Key, new Uint8Array(Body!));
      if (command.constructor.name === "GetObjectCommand")
        return {
          Body: { transformToByteArray: async () => objects.get(Key)! },
        };
      if (command.constructor.name === "DeleteObjectCommand")
        objects.delete(Key);
      return {};
    }) as unknown as NonNullable<Runtime["s3"]>["send"],
  };
  const document = await a.json(
    `/cases/${record.id}/documents`,
    "POST",
    upload("source.txt", "The guard arrived at eight."),
  );
  assert.equal(
    (await rt.db.one("documents", "id=?", [document.id]))?.storage,
    "s3",
  );
  assert.equal(objects.size, 1);
  const original = await a.call(
    `/cases/${record.id}/documents/${document.id}/original`,
  );
  assert.equal(original.status, 200);
  assert.equal(await original.text(), "The guard arrived at eight.");
  assert.deepEqual(commands, ["PutObjectCommand", "GetObjectCommand"]);
  // Large local originals stream back in one response with download headers.
  rt.config.s3Bucket = "";
  const key = `${record.id}/large.pdf`,
    bytes = new Uint8Array(4 * 1024 * 1024);
  assert.equal(await saveFile(rt, key, bytes, "application/pdf"), "local");
  const large = await rt.db.insert("documents", {
    case_id: record.id,
    name: "large.pdf",
    mime: "application/pdf",
    pages: 1,
    storage: "local",
    storage_key: key,
    digest: "large",
  });
  const response = await a.call(
    `/cases/${record.id}/documents/${large.id}/original`,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(
    response.headers.get("content-disposition")!,
    /attachment; filename\*=UTF-8''large.pdf/,
  );
  assert.equal((await response.arrayBuffer()).byteLength, bytes.length);
});

test("practice proposals preserve the selected role/language and duplicate manual testimony queues once", async (t) => {
  const { rt, a, record } = await fixture(t),
    base = `/cases/${record.id}`;
  fakeModel(rt, () => ({
    conditions: {
      trial_type: "Criminal trial",
      jurisdiction: "Practice assumption",
      stage: "Cross-examination",
      user_role: "defense",
      difficulty: "Challenging",
      language: "English",
      goals: "Use evidence",
      assumptions: "Review every assumption.",
    },
    rationale: "A proposed practice setup.",
  }));
  const proposal = await a.json(base + "/practice/propose", "POST", {
    user_role: "judge",
    language: "Bahasa Indonesia",
  });
  assert.equal(proposal.conditions.user_role, "judge");
  assert.equal(proposal.conditions.language, "Bahasa Indonesia");
  rt.config.aiProvider = "";
  const hearing = await a.json(base + "/hearings", "POST", {
      title: "Idempotent hearing",
    }),
    input = {
      hearing_id: hearing.id,
      text: "The same saved statement.",
      speaker: "Witness",
      start: 2,
      end: 4,
    };
  const first = await a.json(base + "/transcripts", "POST", input),
    second = await a.json(base + "/transcripts", "POST", input);
  assert.equal(first.id, second.id);
  await Promise.all([...rt.tasks]);
  assert.equal((await a.json(base)).segments.length, 1);
});
test("voice service keeps one speaker key across connections, never exports voiceprints, and can forget them", async (t) => {
  const { rt, a, record, client } = await fixture(t),
    base = `/cases/${record.id}`;
  rt.config.transcribe = true;
  rt.awsCredentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "secret" };
  const identifyCalls: { auth: string | null; candidates: unknown[] }[] = [];
  const answers: {
    match: { id: string; score: number } | null;
    e: number[];
  }[] = [];
  rt.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://voice.test/health")
      return Response.json({ model: "fake-spectral-v1" });
    if (url === "https://voice.test/v1/identify") {
      const form = init?.body as FormData;
      assert.ok(form.get("file") instanceof Blob);
      identifyCalls.push({
        auth: new Headers(init?.headers).get("authorization"),
        candidates: JSON.parse(String(form.get("candidates"))),
      });
      const next = answers.shift()!;
      return Response.json({
        model: "fake-spectral-v1",
        dim: 3,
        embedding: next.e,
        match: next.match,
      });
    }
    return Response.json({ key_value: "short-lived-token" });
  };
  const hearing = await a.json(base + "/hearings", "POST", { title: "Voices" });
  const open = () =>
    a.json(base + "/audio-sessions", "POST", {
      hearing_id: hearing.id,
      authorized: true,
      language: "id",
      sample_rate: 16000,
    });
  const word = (content: string, speaker: string, start: number) => ({
    type: "word",
    start_time: start,
    end_time: start + 2,
    alternatives: [{ content, speaker, confidence: 0.9 }],
  });
  const clip = (owner: ReturnType<typeof client>, id: string) =>
    handleApi(
      rt,
      new Request(`http://localhost/api/v1${base}/transcripts/${id}/voice`, {
        method: "POST",
        headers: { cookie: owner.cookie, "Content-Type": "audio/wav" },
        body: new Uint8Array(2000),
      }),
    );
  const first = await open();
  const saved = await a.json(
    `${base}/audio-sessions/${first.id}/transcripts`,
    "POST",
    { sequence: 1, results: [word("Sidang", "S1", 0), word("Saya", "S2", 2)] },
  );
  assert.equal(saved.segments.length, 2);
  // Not configured: the transcript stays usable and the browser stops trying.
  assert.equal((await clip(a, saved.segments[0].id)).status, 503);
  rt.config.voiceUrl = "https://voice.test";
  rt.config.voiceToken = "voice-secret-0123456789";
  answers.push({ match: null, e: [1, 0, 0] }, { match: null, e: [0, 1, 0] });
  const judge = await (await clip(a, saved.segments[0].id)).json();
  assert.deepEqual(judge, {
    speaker: "voice:voice-1",
    created: true,
    score: null,
  });
  await clip(a, saved.segments[1].id);
  assert.equal(identifyCalls[0].auth, "Bearer voice-secret-0123456789");
  assert.equal(identifyCalls[1].candidates.length, 1);
  // Later turns from an identified provider label are keyed on save.
  const later = await a.json(
    `${base}/audio-sessions/${first.id}/transcripts`,
    "POST",
    { sequence: 2, results: [word("dibuka", "S1", 4)] },
  );
  await a.json(`${base}/audio-sessions/${first.id}/stop`, "POST");
  // A new connection relabels voices; the voiceprint match restores the key.
  const second = await open();
  const rotated = await a.json(
    `${base}/audio-sessions/${second.id}/transcripts`,
    "POST",
    { sequence: 1, results: [word("Lanjut", "S2", 0), word("lagi", "S2", 1)] },
  );
  const [prints] = [identifyCalls[1].candidates];
  assert.equal(prints.length, 1);
  answers.push({ match: { id: "placeholder", score: 0.9 }, e: [0.9, 0.1, 0] });
  const ids = (await rt.db.all("voiceprints", "case_id=?", [record.id])).map(
    (p) => [p.label, p.id] as const,
  );
  answers[0].match!.id = ids.find(([label]) => label === "voice-1")![1];
  const restored = await (await clip(a, rotated.segments[0].id)).json();
  assert.deepEqual(restored, {
    speaker: "voice:voice-1",
    created: false,
    score: 0.9,
  });
  await a.json(base + "/speakers", "PATCH", {
    speaker: "voice:voice-1",
    label: "Hakim Ketua",
  });
  const detail = await a.json(base);
  const keys = Object.fromEntries(
    detail.segments.map((s: { id: string; speaker: string }) => [
      s.id,
      s.speaker,
    ]),
  );
  assert.equal(keys[saved.segments[0].id], "voice:voice-1");
  assert.equal(keys[saved.segments[1].id], "voice:voice-2");
  assert.equal(keys[later.segments[0].id], "voice:voice-1");
  assert.equal(keys[rotated.segments[0].id], "voice:voice-1");
  assert.equal(detail.case.speakers["voice:voice-1"], "Hakim Ketua");
  const merged = await rt.db.one("voiceprints", "label=? AND case_id=?", [
    "voice-1",
    record.id,
  ]);
  assert.equal(merged!.samples, 2);
  assert.ok(Math.abs(Math.hypot(...merged!.embedding) - 1) < 1e-4);
  // Biometric voiceprints stay out of portable archives and other accounts.
  const archive = new Uint8Array(
    await (await a.call(base + "/export.jude")).arrayBuffer(),
  );
  assert.equal(
    JSON.stringify(unpack(archive)).includes("fake-spectral"),
    false,
  );
  const b = client();
  await b.json("/auth/register", "POST", {
    email: `${randomUUID()}@example.test`,
    password: "test-password-123",
  });
  assert.equal((await clip(b, saved.segments[0].id)).status, 404);
  assert.deepEqual(await a.json(base + "/voiceprints", "DELETE"), {
    removed: 2,
  });
  assert.equal(
    (await a.json(base)).segments.find(
      (s: { id: string }) => s.id === saved.segments[0].id,
    ).speaker,
    "voice:voice-1",
  );
});
test("hearing recordings store privately, stream byte ranges, stay owner-scoped and can be deleted", async (t) => {
  const { rt, a, record, client } = await fixture(t),
    base = `/cases/${record.id}`;
  const hearing = await a.json(base + "/hearings", "POST", { title: "Sidang" });
  const audio = new Uint8Array(1000).map((_, i) => i % 256);
  const post = (owner: ReturnType<typeof client>, type = "audio/webm") =>
    handleApi(
      rt,
      new Request(
        `http://localhost/api/v1${base}/recordings?hearing_id=${hearing.id}&start_offset=12.5&duration=40`,
        {
          method: "POST",
          headers: { cookie: owner.cookie, "Content-Type": type },
          body: audio,
        },
      ),
    );
  assert.equal((await post(a, "application/pdf")).status, 415);
  const saved = await (await post(a, "audio/webm;codecs=opus")).json();
  assert.equal(saved.size, 1000);
  assert.equal(saved.start_offset, 12.5);
  const detail = await a.json(base);
  assert.equal(detail.recordings.length, 1);
  const get = (headers: Record<string, string> = {}) =>
    handleApi(
      rt,
      new Request(`http://localhost/api/v1${base}/recordings/${saved.id}`, {
        headers: { cookie: a.cookie, ...headers },
      }),
    );
  const full = await get();
  assert.equal(full.headers.get("content-type"), "audio/webm");
  assert.equal((await full.arrayBuffer()).byteLength, 1000);
  const part = await get({ range: "bytes=10-19" });
  assert.equal(part.status, 206);
  assert.equal(part.headers.get("content-range"), "bytes 10-19/1000");
  assert.deepEqual(
    [...new Uint8Array(await part.arrayBuffer())],
    [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
  );
  assert.equal((await get({ range: "bytes=5000-" })).status, 416);
  const b = client();
  await b.json("/auth/register", "POST", {
    email: `${randomUUID()}@example.test`,
    password: "test-password-123",
  });
  assert.equal((await post(b)).status, 404);
  assert.deepEqual(await a.json(`${base}/recordings/${saved.id}`, "DELETE"), {
    removed: 1,
  });
  assert.equal((await a.json(base)).recordings.length, 0);
});
test("case settings update details and delete the whole case with its stored files", async (t) => {
  const { rt, a, record, client } = await fixture(t),
    base = `/cases/${record.id}`;
  const updated = await a.json(base, "PATCH", {
    title: "Perkara 12/Pid.B/2026",
    reference: "12/Pid.B/2026",
  });
  assert.equal(updated.title, "Perkara 12/Pid.B/2026");
  await a.json(
    base + "/documents",
    "POST",
    upload("bap.txt", "Saksi tiba pukul 22.30."),
  );
  const hearing = await a.json(base + "/hearings", "POST", {
    title: "Sidang 1",
  });
  await a.json(base + "/transcripts", "POST", {
    hearing_id: hearing.id,
    speaker: "Saksi",
    text: "Saya tiba pukul 21.00.",
    start: 0,
  });
  await handleApi(
    rt,
    new Request(
      `http://localhost/api/v1${base}/recordings?hearing_id=${hearing.id}&start_offset=0&duration=1`,
      {
        method: "POST",
        headers: { cookie: a.cookie, "Content-Type": "audio/webm" },
        body: new Uint8Array(10),
      },
    ),
  );
  await Promise.allSettled([...rt.tasks]);
  const other = client();
  await other.json("/auth/register", "POST", {
    email: `${randomUUID()}@example.test`,
    password: "test-password-123",
  });
  await other.json(base, "DELETE", undefined, 404);
  assert.deepEqual(await a.json(base, "DELETE"), { removed: 1 });
  await a.json(base, "GET", undefined, 404);
  for (const table of [
    "documents",
    "hearings",
    "segments",
    "recordings",
  ] as const)
    assert.equal((await rt.db.all(table, "case_id=?", [record.id])).length, 0);
});

test("ask evidence tolerates quote typography, repairs one failed citation, and falls back to passages", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  await a.json(
    base + "/documents",
    "POST",
    upload(
      "bap.txt",
      "Saksi Kuat Ma’ruf tiba di rumah\nDuren Tiga pukul 17.00.",
    ),
  );
  const [{ id }] = await rt.db.all("chunks", "case_id=?", [record.id]);
  let calls = 0;
  const packets: { citation_repair?: { failed: unknown } }[] = [];
  const answer = (quotes: string[]) =>
    fakeModel(rt, ({ payload }) => {
      packets.push(payload);
      const quote = quotes[Math.min(calls, quotes.length - 1)];
      calls++;
      return {
        answer: quote === "never said" ? "Invented." : "Pukul 17.00.",
        citations: [{ chunk_id: id, quote, relation: "supports" }],
      };
    });
  const ask = () =>
    a.json(base + "/ask", "POST", { query: "Kapan Kuat Ma'ruf tiba?" });
  // A straight quote and a plain space still match the stored passage on the first call.
  answer(["Kuat Ma'ruf tiba di rumah Duren Tiga"]);
  let result = await ask();
  assert.equal(calls, 1);
  assert.equal(result.answer, "Pukul 17.00.");
  assert.equal(
    result.citations[0].quote,
    "Kuat Ma’ruf tiba di rumah\nDuren Tiga",
  );
  // A failed citation gets one correction that names it.
  calls = 0;
  packets.length = 0;
  answer(["pukul 18.00", "pukul 17.00"]);
  result = await ask();
  assert.equal(calls, 2);
  assert.deepEqual(packets[1].citation_repair?.failed, [
    { chunk_id: id, quote: "pukul 18.00" },
  ]);
  assert.equal(result.answer, "Pukul 17.00.");
  // Two failures return the passages with a localizable notice, not a 503.
  calls = 0;
  answer(["never said"]);
  result = await ask();
  assert.equal(calls, 2);
  assert.equal(result.answer, null);
  assert.equal(result.notice_code, "answer_unverified");
  assert.equal(result.sources.length, 1);
  assert.ok(!JSON.stringify(result).includes("Invented"));
  // A provider failure also leaves the passages visible.
  fakeModel(rt, () => {
    throw modelError(429);
  });
  result = await ask();
  assert.equal(result.notice_code, "ai_failed");
  assert.equal(result.sources.length, 1);
});

test("evidence links verify quotes tolerantly, store the source text, and repair failed links once", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  for (const [name, text] of [
    ["one.txt", "Witness arrived at the warehouse at eight."],
    ["two.txt", "A guard saw the witness at the warehouse\nentrance."],
  ])
    await a.json(base + "/documents", "POST", upload(name, text));
  let calls = 0;
  let repair: { failed: { quote: string }[] } | null = null;
  fakeModel(rt, ({ payload: packet }) => {
    calls++;
    if (calls === 2) repair = packet.citation_repair;
    const [pair] = packet.candidate_pairs;
    const one = pair.source_text.startsWith("Witness");
    const quotes = [
      calls === 1 ? "arrived at the depot" : "arrived at the warehouse",
      "at the warehouse entrance",
    ];
    return {
      links: [
        {
          source_id: pair.source_id,
          target_id: pair.target_id,
          relation: "supports",
          explanation: "Both place the witness at the warehouse.",
          source_quote: one ? quotes[0] : quotes[1],
          target_quote: one ? quotes[1] : quotes[0],
        },
      ],
    };
  });
  const built = await a.json(base + "/graph/build", "POST");
  assert.equal(calls, 2);
  assert.equal(repair!.failed[0].quote, "arrived at the depot");
  assert.equal(built.added, 1);
  assert.ok(!built.notice_codes.includes("ai_unverified"));
  const [link] = await rt.db.all("evidence_links", "case_id=?", [record.id]);
  assert.equal(link.basis, "ai");
  assert.equal(link.relation, "supports");
  assert.ok(
    [link.source_quote, link.target_quote].includes(
      "at the warehouse\nentrance",
    ),
  );
});

test("assistant drops only failing citations, keeps the reply, and says so", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  await a.json(
    base + "/documents",
    "POST",
    upload("source.txt", "Susi mulai bekerja untuk keluarga itu pada 2021."),
  );
  let calls = 0;
  fakeModel(rt, ({ payload }) => {
    calls++;
    const id = payload.case_context.sources[0].chunk_id;
    return {
      // Nova sometimes double-escapes line breaks in tool output.
      answer: "Susi mulai bekerja pada 2021.\\nItu tercatat.",
      uses_case_facts: true,
      citations: [
        { chunk_id: id, quote: "mulai bekerja", relation: "supports" },
        { chunk_id: id, quote: "pada 2019", relation: "supports" },
        { chunk_id: "made-up", quote: "pada 2021", relation: "supports" },
      ],
    };
  });
  const dialogue = await a.json(base + "/dialogues", "POST", {
    kind: "assistant",
  });
  const result = await a.json(
    `${base}/dialogues/${dialogue.id}/messages`,
    "POST",
    { text: "Kapan Susi mulai bekerja?", request_id: randomUUID() },
  );
  assert.equal(calls, 1);
  const reply = result.messages[1];
  assert.equal(reply.text, "Susi mulai bekerja pada 2021.\nItu tercatat.");
  assert.deepEqual(
    reply.citations.map((c: { quote: string }) => c.quote),
    ["mulai bekerja"],
  );
  assert.match(reply.notice, /did not match the case text were removed/);
});

test("legal search defaults to statutes, validates the type, and keeps best passages as safe links", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  rt.config.pasalKey = "test-key";
  const seen: URL[] = [];
  rt.fetch = async (url) => {
    seen.push(new URL(String(url)));
    return Response.json({
      results: [
        {
          work_id: 776,
          work: {
            title: "Undang-Undang Nomor 1 Tahun 2023 <b>KUHP</b>",
            type: "UU",
            number: "1",
            year: 2023,
            status: "diubah",
          },
          url: "https://pasal.id/peraturan/uu/uu-no-1-tahun-2023",
          matching_pasals: [
            { pasal: "459", url: "https://pasal.id/peraturan/uu/x#pasal-459" },
            { pasal: "1", url: "javascript:alert(1)" },
          ],
          best_passage: {
            pasal: "459<script>",
            url: "https://pasal.id/peraturan/uu/x/pasal-459",
          },
        },
        {
          work_id: 2,
          work: {},
          url: "https://evil.test/law",
          best_passage: null,
        },
        {
          work_id: 3,
          work: "broken",
          url: "https://pasal.id/b",
          best_passage: 7,
        },
      ],
    });
  };
  const result = await a.json(`${base}/legal?q=pembunuhan`);
  assert.equal(seen[0].searchParams.get("type"), "UU");
  assert.equal(seen[0].searchParams.get("q"), "pembunuhan");
  assert.equal(result.results.length, 2);
  const [first, second] = result.results;
  assert.equal(first.title, "Undang-Undang Nomor 1 Tahun 2023 KUHP");
  assert.equal(first.reference, "UU 1/2023");
  assert.deepEqual(first.articles, [
    { article: "459", url: "https://pasal.id/peraturan/uu/x#pasal-459" },
  ]);
  assert.deepEqual(first.best_passage, {
    article: "459",
    url: "https://pasal.id/peraturan/uu/x/pasal-459",
  });
  assert.equal(second.best_passage, null);
  await a.json(`${base}/legal?q=pembunuhan&type=PP`);
  assert.equal(seen[1].searchParams.get("type"), "PP");
  await a.json(`${base}/legal?q=pembunuhan&type=all`);
  assert.equal(seen[2].searchParams.has("type"), false);
  await a.json(`${base}/legal?q=pembunuhan&type=KUHP`, "GET", undefined, 422);
  assert.equal(seen.length, 3);
});

test("hearings import up to 3000 statements and hearing analysis uses the pool's concurrency", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  const turns = Array.from({ length: 3000 }, (_, i) => ({
    speaker: i % 2 ? "Saksi" : "Hakim",
    text: `Pernyataan nomor ${i + 1}.`,
  }));
  const file = turns.map((s) => `${s.speaker}: ${s.text}`).join("\n");
  const preview = await a.json(
    base + "/hearings/preview",
    "POST",
    upload("long.txt", file),
  );
  assert.equal(preview.hearing.segments.length, 3000);
  const hearing = await a.json(
    base + "/hearings/import",
    "POST",
    upload("long.txt", file, { transcript: JSON.stringify(preview.hearing) }),
  );
  const exported = await a.call(`${base}/hearings/${hearing.id}/export.jude`);
  assert.equal(exported.status, 200);
  assert.equal((await a.call(`${base}/export.jude`)).status, 200);
  const tooLong = await a.call(
    base + "/hearings/preview",
    "POST",
    upload("too-long.txt", `${file}\nSaksi: Satu lagi.`),
  );
  assert.equal(tooLong.status, 422);
  assert.match((await tooLong.json()).detail, /more than 3,000 statements/);
  // Analysis: a separate hearing whose statements have a related passage.
  await a.json(
    base + "/documents",
    "POST",
    upload("bap.txt", "Saksi tiba di gudang pukul delapan pagi."),
  );
  const live = await a.json(base + "/hearings", "POST", { title: "Sidang" });
  for (let i = 0; i < 9; i++)
    await rt.db.insert("segments", {
      case_id: record.id,
      hearing_id: live.id,
      text: `Saksi tiba di gudang pukul delapan pagi, kali ${i}.`,
      analysis_state: "pending",
    });
  let inFlight = 0,
    peak = 0,
    calls = 0;
  fakeModel(rt, async () => {
    calls++;
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 15));
    inFlight--;
    throw modelError(500);
  });
  const queued = await a.json(`${base}/hearings/${live.id}/analyze`, "POST");
  assert.equal(queued.queued, 9);
  await Promise.allSettled([...rt.tasks]);
  assert.ok(calls >= 9, `expected a call per statement, saw ${calls}`);
  assert.equal(peak, 3);
});

test("simulated plans switch immediately, validate input and meter this month's usage", async (t) => {
  const { rt, a, record, client } = await fixture(t);
  const me = await a.json("/auth/me");
  assert.equal(me.plan, "trial");
  const initial = await a.json("/account/plan");
  assert.equal(initial.plan, "trial");
  assert.equal(initial.simulated, true);
  assert.equal(initial.price_per_month, 0);
  assert.deepEqual(initial.limits, {
    hearing_seconds: 7200,
    ai_questions: 30,
  });
  assert.deepEqual(initial.usage, {
    hearing_seconds_this_month: 0,
    ai_questions_this_month: 0,
  });
  assert.ok(Date.parse(initial.trial_ends_at) > Date.now() + 13 * 86_400_000);

  // Validation: unknown plans, bad billing, fractional accounts and a too-small firm.
  await a.json("/account/plan", "POST", { plan: "enterprise" }, 422);
  await a.json(
    "/account/plan",
    "POST",
    { plan: "advokat", billing: "weekly" },
    422,
  );
  await a.json(
    "/account/plan",
    "POST",
    { plan: "advokat", accounts: 1.5 },
    422,
  );
  await a.json("/account/plan", "POST", { plan: "kantor", accounts: 2 }, 422);
  assert.equal((await a.json("/account/plan")).plan, "trial");

  const firm = await a.json("/account/plan", "POST", {
    plan: "kantor",
    billing: "yearly",
    accounts: 3,
  });
  assert.equal(firm.plan, "kantor");
  assert.equal(firm.accounts, 3);
  assert.equal(firm.price_per_month, 3_870_000);
  assert.deepEqual(firm.limits, {
    hearing_seconds: 30 * 3600,
    ai_questions: 1800,
  });
  assert.equal((await a.json("/auth/me")).plan, "kantor");
  const solo = await a.json("/account/plan", "POST", {
    plan: "advokat",
    billing: "monthly",
  });
  assert.equal(solo.price_per_month, 899_000);
  assert.equal(solo.accounts, 1);

  // Usage counts transcribed audio and the user's own questions from this month only.
  const hearing = await rt.db.insert("hearings", {
    case_id: record.id,
    title: "Live",
  });
  const lastMonth = new Date(Date.now() - 40 * 86_400_000).toISOString();
  for (const [origin, start, end, created_at] of [
    ["transcribe", 0, 1800, undefined],
    ["transcribe", 1800, 20_000, undefined],
    ["transcribe", 0, 3600, lastMonth],
    ["manual", 0, 3600, undefined],
  ] as const)
    await rt.db.insert("segments", {
      case_id: record.id,
      hearing_id: hearing.id,
      text: "Statement",
      origin,
      start,
      end,
      ...(created_at ? { created_at } : {}),
    });
  const dialogue = await rt.db.insert("dialogues", {
    case_id: record.id,
    kind: "assistant",
    title: "Questions",
  });
  for (const [sequence, role] of ["user", "assistant", "user"].entries())
    await rt.db.insert("dialogue_messages", {
      dialogue_id: dialogue.id,
      sequence,
      role,
      speaker: role,
      text: "Question",
    });
  const metered = await a.json("/account/plan");
  assert.deepEqual(metered.usage, {
    hearing_seconds_this_month: 20_000,
    ai_questions_this_month: 2,
  });
  assert.deepEqual(metered.exceeded, {
    hearing_seconds: true,
    ai_questions: false,
  });

  // Other users see only their own usage; returning to the trial cannot extend it.
  const other = client();
  await other.json("/auth/register", "POST", {
    email: `${randomUUID()}@example.test`,
    password: "test-password-123",
  });
  assert.equal(
    (await other.json("/account/plan")).usage.hearing_seconds_this_month,
    0,
  );
  const back = await a.json("/account/plan", "POST", {
    plan: "trial",
    accounts: 4,
  });
  assert.equal(back.accounts, 1);
  assert.equal(back.trial_ends_at, initial.trial_ends_at);
  assert.equal((await client().call("/account/plan")).status, 401);
  const demo = await client().json("/auth/demo", "POST");
  assert.equal(demo.plan, "trial");
});
