import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { settings } from "../src/lib/server/config";
import { connectDatabase, seconds } from "../src/lib/server/database";
import { handleApi } from "../src/lib/server/api";
import {
  checkPassword,
  hashPassword,
  hash,
  type Runtime,
} from "../src/lib/server/runtime";
import { pack, unpack, validateArchive } from "../src/lib/server/archive";
import { extractPages } from "../src/lib/server/documents";
import { previewHearing } from "../src/lib/server/hearings";
import { investigate } from "../src/lib/server/analysis";
import {
  embed,
  safePasalUrl,
  structured,
  requestJson,
  saveFile,
} from "../src/lib/server/providers";
import { z } from "zod";
import { ProviderError } from "../src/lib/server/errors";
import { verifyReply } from "../src/lib/server/dialogues";
import type { ContextSource } from "../src/lib/server/contracts";
import { stageJob, runJob } from "../src/lib/server/jobs";
import { normalizeTranscript } from "../src/lib/server/audio";
import { createHmac } from "node:crypto";

async function fixture(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), "jude-ts-"));
  const config = settings({ JUDE_DATA_DIR: dir, JUDE_SIMULATION_DELAY: "0" });
  const rt: Runtime = {
    config,
    db: await connectDatabase(config),
    fetch: async () => {
      throw new Error("Unexpected network call");
    },
    tasks: new Set(),
    simulations: new Map(),
  };
  t.after(async () => {
    for (const controller of rt.simulations.values()) controller.abort();
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
  rt.config.openrouterKey = "private-provider-key";
  rt.config.model = "fixture/model";
  const logs: string[] = [];
  t.mock.method(console, "error", (entry: string) => logs.push(entry));
  const upstreamSecret = "private-provider-key private-document-content";
  for (const status of [400, 401, 402, 403, 404, 422, 429, 503]) {
    rt.fetch = async () => new Response(upstreamSecret, { status });
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
          /OpenRouter|HTTP|API.key|quota|billing|model ID/i,
        );
        if (status === 429) assert.match(error.message, /wait a moment/);
        const log = JSON.parse(logs.at(-1)!);
        assert.equal(log.event, "jude_provider_failed");
        assert.equal(log.status, status);
        assert.equal(log.provider, "OpenRouter chat");
        assert.ok(error.message.includes(log.reference));
        assert.ok(!error.message.includes("private-"));
        return true;
      },
    );
  }
  rt.fetch = async () => new Response(upstreamSecret, { status: 200 });
  await assert.rejects(
    requestJson(rt, "https://private-host", {}, "Speechmatics"),
    /Audio transcription could not start/,
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
  rt.config.supabaseUrl = "https://private-host";
  rt.config.storageKey = "private-storage-key";
  rt.fetch = async () => new Response(upstreamSecret, { status: 403 });
  await assert.rejects(
    saveFile(rt, "owner/case/file.txt", new Uint8Array([65]), "text/plain"),
    /The file could not be saved or opened/,
  );
  rt.fetch = async () => new Response(upstreamSecret, { status: 400 });
  await assert.rejects(
    embed(rt, ["private-document-content"]),
    /This AI request could not be completed/,
  );
  assert.match(JSON.parse(logs.at(-1)!).hint, /1536/);
  for (const log of logs) assert.ok(!log.includes("private-"));
  rt.fetch = async () =>
    Response.json({ choices: [{ message: { content: '{"answer":"ok"}' } }] });
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
const structuredResponse = (value: unknown) =>
  Response.json({ choices: [{ message: { content: JSON.stringify(value) } }] });

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
  rt.config.openrouterKey = "fake";
  rt.config.model = "fake";
  let calls = 0;
  rt.fetch = async (input) => {
    if (String(input).includes("/embeddings"))
      return new Response("", { status: 503 });
    calls++;
    return new Response("", { status: 500 });
  };
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
  rt.config.openrouterKey = "fake";
  rt.config.model = "fake";
  rt.fetch = async () =>
    structuredResponse({
      segments: [{ speaker: "Invented witness", text: "I arrived at eight." }],
    });
  const result = await previewHearing(
    rt,
    "file.txt",
    new TextEncoder().encode("I arrived at eight."),
    true,
  );
  assert.equal(result.hearing?.segments[0].speaker, "Unknown");
  assert.equal(result.hearing?.segments[0].start, 0);
  rt.fetch = async () =>
    structuredResponse({
      segments: [{ speaker: "Witness", text: "I arrived at nine." }],
    });
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

test("synthetic full pipeline, review notes, portable archive remapping and checksum guards", async (t) => {
  const { a, rt } = await fixture(t);
  const record = await a.json("/cases/synthetic", "POST"),
    base = `/cases/${record.id}`;
  await a.json(base + "/simulation", "POST");
  await Promise.all([...rt.tasks]);
  const detail = await a.json(base);
  assert.equal(detail.segments.length, 8);
  assert.equal(detail.findings.length, 4);
  assert.equal(detail.case.status, "complete");
  const finding = detail.findings[0];
  await a.json(`${base}/findings/${finding.id}`, "PATCH", {
    reviewed: true,
    note: "Verify the original.",
  });
  const exported = await a.call(base + "/export.jude"),
    bytes = new Uint8Array(await exported.arrayBuffer());
  const { manifest, files } = unpack(bytes);
  assert.equal(manifest.findings[0].reviewed, true);
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
  assert.equal(copy.findings[0].reviewed, false);
  assert.equal(copy.findings[0].note, "Verify the original.");
  assert.equal(copy.findings[0].mode, "imported");
  assert.notEqual(
    copy.findings[0].citations[0].chunk_id,
    finding.citations[0].chunk_id,
  );
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
  const graph = await a.json(base + "/graph");
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
  const practice = await a.json(base + "/dialogues", "POST", {
    kind: "practice",
    mode: "guided",
    conditions: { user_role: "judge", trial_type: "Civil hearing" },
  });
  const debrief = await a.json(
    `${base}/dialogues/${practice.id}/messages`,
    "POST",
    { text: "Finish the exercise.", request_id: randomUUID(), finish: true },
  );
  assert.equal(debrief.status, "complete");
  assert.match(debrief.messages.at(-1).text, /did not assess/);
  assert.equal((await a.json(base)).segments.length, 0);
  await a.json(
    `${base}/dialogues/${practice.id}/messages`,
    "POST",
    { text: "Another turn.", request_id: randomUUID() },
    409,
  );
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
  rt.config.openrouterKey = "fake";
  rt.config.model = "fake";
  let calls = 0;
  rt.fetch = async (url, init) => {
    if (String(url).includes("/embeddings"))
      return Response.json({
        data: [{ index: 0, embedding: Array(1536).fill(0) }],
      });
    calls++;
    const packet = JSON.parse(
      JSON.parse(String(init?.body)).messages[1].content,
    );
    if (calls === 1)
      return structuredResponse({
        answer: "Unsupported draft.",
        uses_case_facts: true,
        citations: [
          {
            chunk_id: "wrong-document-id",
            quote: "Invented quotation.",
            relation: "supports",
          },
        ],
      });
    assert.equal(calls, 2);
    assert.equal(packet.citation_repair.reason, "unknown_source");
    assert.equal(packet.citation_repair.must_cite, true);
    return structuredResponse({
      answer: "The witness reports arriving at eight.",
      uses_case_facts: true,
      citations: [
        {
          chunk_id: packet.case_context.sources[0].chunk_id,
          quote: "The witness arrived at eight.",
          relation: "supports",
        },
      ],
    });
  };
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

test("failed citation repair stays bounded, cannot drop required citations, and saves nothing", async (t) => {
  const { a, record, rt } = await fixture(t),
    base = `/cases/${record.id}`;
  await a.json(
    base + "/documents",
    "POST",
    upload("source.txt", "The witness did not remove tablets."),
  );
  rt.config.openrouterKey = "fake";
  rt.config.model = "fake";
  let calls = 0;
  rt.fetch = async (url) => {
    if (String(url).includes("/embeddings"))
      return Response.json({
        data: [{ index: 0, embedding: Array(1536).fill(0) }],
      });
    calls++;
    return structuredResponse({
      answer: "Unverified claim.",
      uses_case_facts: calls === 1,
      citations: [],
    });
  };
  const dialogue = await a.json(base + "/dialogues", "POST", {
    kind: "assistant",
  });
  const path = `${base}/dialogues/${dialogue.id}/messages`;
  await a.json(
    path,
    "POST",
    { text: "What happened?", request_id: randomUUID() },
    503,
  );
  assert.equal(calls, 2);
  assert.equal(
    (await a.json(`${base}/dialogues/${dialogue.id}`)).messages.length,
    0,
  );
  calls = 0;
  rt.fetch = async (url) => {
    if (String(url).includes("/embeddings"))
      return Response.json({
        data: [{ index: 0, embedding: Array(1536).fill(0) }],
      });
    calls++;
    return new Response("", { status: 402 });
  };
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
  rt.config.openrouterKey = "fake";
  rt.config.model = "fake";
  rt.fetch = async (input) =>
    String(input).includes("/embeddings")
      ? new Response("", { status: 503 })
      : structuredResponse({
          answer: "A case claim.",
          uses_case_facts: true,
          citations: [
            { chunk_id: "foreign", quote: "invented", relation: "supports" },
          ],
        });
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
  rt.fetch = async (input) =>
    String(input).includes("/embeddings")
      ? new Response("", { status: 503 })
      : structuredResponse({
          speeches: [
            {
              speaker: "defense",
              text: "I will speak for you.",
              uses_case_facts: false,
              citations: [],
            },
          ],
        });
  const practice = await a.json(base + "/dialogues", "POST", {
    kind: "practice",
    conditions: { user_role: "defense" },
  });
  await a.json(
    `${base}/dialogues/${practice.id}/messages`,
    "POST",
    { text: "Begin.", request_id: randomUUID() },
    503,
  );
  assert.equal(
    (await a.json(`${base}/dialogues/${practice.id}`)).messages.length,
    1,
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
});

test("embedding contract validates complete finite vectors; legal URLs stay on Pasal", async (t) => {
  const { rt } = await fixture(t);
  rt.config.openrouterKey = "fake";
  rt.fetch = async () =>
    Response.json({ data: [{ index: 0, embedding: Array(1536).fill(0.1) }] });
  assert.equal((await embed(rt, ["test"]))?.[0].length, 1536);
  rt.fetch = async () =>
    Response.json({ data: [{ index: 1, embedding: Array(1536).fill(0) }] });
  await assert.rejects(
    embed(rt, ["test"]),
    /Related evidence could not be processed/,
  );
  assert.equal(safePasalUrl("https://evil.test/law"), null);
  assert.equal(safePasalUrl("javascript:alert(1)"), null);
  assert.equal(safePasalUrl("https://pasal.id/uu/1"), "https://pasal.id/uu/1");
});

test("durable outbox recovery, signed callbacks and attempt exhaustion", async (t) => {
  const { rt, a, record } = await fixture(t);
  await a.json(
    `/cases/${record.id}/documents`,
    "POST",
    upload("source.txt", "A saved assertion appears in the record."),
  );
  const hearing = await a.json(`/cases/${record.id}/hearings`, "POST", {
      title: "Trial",
    }),
    segment = await rt.db.insert("segments", {
      case_id: record.id,
      hearing_id: hearing.id,
      text: "A saved assertion.",
    });
  await stageJob(rt.db, segment.id);
  rt.config.hosted = true;
  rt.config.appUrl = "https://jude.test";
  rt.config.currentSigningKey = "current-key";
  rt.config.nextSigningKey = "next-key";
  rt.config.cronSecret = "recovery-secret";
  rt.config.openrouterKey = "fake";
  rt.config.model = "fake";
  rt.config.qstashToken = "token";
  await a.json("/internal/analysis", "POST", { segment_id: segment.id }, 401);
  const forbidden = await a.call("/internal/recover");
  assert.equal(forbidden.status, 401);
  rt.fetch = async () => new Response("", { status: 503 });
  await assert.rejects(runJob(rt, segment.id), /retried/);
  await assert.rejects(runJob(rt, segment.id), /retried/);
  assert.deepEqual(await runJob(rt, segment.id), { status: "failed" });
  assert.equal(
    (await rt.db.one("analysis_jobs", "segment_id=?", [segment.id]))?.attempts,
    3,
  );
  await stageJob(rt.db, segment.id);
  rt.config.openrouterKey = "";
  rt.config.model = "";
  const raw = JSON.stringify({ segment_id: segment.id }),
    b64 = (s: unknown) => Buffer.from(JSON.stringify(s)).toString("base64url"),
    header = b64({ alg: "HS256", typ: "JWT" }),
    payload = b64({
      iss: "Upstash",
      sub: "https://jude.test/api/v1/internal/analysis",
      exp: Math.floor(seconds() + 60),
      nbf: Math.floor(seconds() - 10),
      body: Buffer.from(hash(raw), "hex").toString("base64url"),
    });
  const signature = `${header}.${payload}.${createHmac("sha256", "next-key").update(`${header}.${payload}`).digest("base64url")}`;
  const delivered = await handleApi(
    rt,
    new Request("https://jude.test/api/v1/internal/analysis", {
      method: "POST",
      headers: { "upstash-signature": signature },
      body: raw,
    }),
  );
  assert.equal(delivered.status, 200, await delivered.text());
  assert.equal(
    (await rt.db.one("analysis_jobs", "segment_id=?", [segment.id]))?.status,
    "done",
  );
});

test("browser audio session authorization, batching, duplication and scoped speaker offsets", async (t) => {
  const { rt, a, record, client } = await fixture(t),
    base = `/cases/${record.id}`;
  rt.config.speechKey = "private-key";
  rt.fetch = async () => Response.json({ key_value: "short-lived-token" });
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
  assert.equal(session.token, "short-lived-token");
  assert.equal(session.start_offset, 30);
  assert.equal(JSON.stringify(session).includes("private-key"), false);
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

test("large file parts are private, bounded, owner-checked and digest verified", async (t) => {
  const { rt, a, record } = await fixture(t);
  rt.config.hosted = true;
  rt.config.supabaseUrl = "https://storage.test";
  rt.config.storageKey = "secret";
  const objects = new Map<string, Uint8Array>();
  rt.fetch = async (input, init) => {
    const url = new URL(String(input)),
      path = url.pathname
        .replace("/storage/v1/object/authenticated/", "")
        .replace("/storage/v1/object/", "");
    if (init?.method === "POST") {
      objects.set(path, new Uint8Array(init.body as Buffer));
      return Response.json({});
    }
    return new Response(Buffer.from(objects.get(path) || []));
  };
  const size = 3 * 1024 * 1024 + 5,
    data = Buffer.alloc(size, 65),
    transfer = await a.json("/transfers", "POST", { name: "large.txt", size });
  for (let i = 0; i < 2; i++) {
    const response = await handleApi(
      rt,
      new Request(
        `http://localhost/api/v1/transfers/${transfer.id}/parts/${i}`,
        {
          method: "PUT",
          headers: { cookie: a.cookie },
          body: data.subarray(
            i * transfer.part_size,
            Math.min(size, (i + 1) * transfer.part_size),
          ),
        },
      ),
    );
    assert.equal(response.status, 200, await response.text());
  }
  const form = new FormData();
  form.set("upload_id", transfer.id);
  // Large original text is rejected by the same extracted-text bound as small uploads.
  await a.json(`/cases/${record.id}/documents`, "POST", form, 422);
  objects.set([...objects.keys()][0], new Uint8Array([1]));
  await a.json(`/cases/${record.id}/documents`, "POST", form, 409);
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

test("hosted settings fail closed and never fall back to local storage", () => {
  assert.throws(() => settings({ VERCEL: "1" }), /PostgreSQL/);
  assert.throws(
    () => settings({ VERCEL: "1", DATABASE_URL: "postgresql://localhost/db" }),
    /JUDE_APP_URL/,
  );
});

test("oversized streaming requests without Content-Length are rejected before parsing", async (t) => {
  const { a } = await fixture(t);
  const response = await a.call("/cases", "POST", {
    title: "x".repeat(2 * 1024 * 1024 + 1),
  });
  assert.equal(response.status, 413);
});

test("recovery authorization, delayed dispatch and large signed downloads", async (t) => {
  const { rt, a, record } = await fixture(t);
  const segment = await rt.db.insert("segments", {
    case_id: record.id,
    text: "Queued testimony.",
  });
  await stageJob(rt.db, segment.id);
  rt.config.hosted = true;
  rt.config.appUrl = "https://jude.test";
  rt.config.cronSecret = "recovery";
  rt.config.qstashToken = "queue";
  rt.config.supabaseUrl = "https://storage.test";
  rt.config.storageKey = "storage";
  const calls: string[] = [];
  rt.fetch = async (input) => {
    calls.push(String(input));
    return Response.json({ messageId: "queued" });
  };
  const forbidden = await a.call("/internal/recover");
  assert.equal(forbidden.status, 401);
  assert.deepEqual(calls, []);
  const recovered = await a.call("/internal/recover", "GET", undefined, {
    Authorization: "Bearer recovery",
  });
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).dispatched, 1);
  assert.match(calls[0], /https:\/\/jude.test\/api\/v1\/internal\/analysis/);
  const doc = await rt.db.insert("documents", {
    case_id: record.id,
    name: "large.pdf",
    mime: "application/pdf",
    pages: 1,
    storage: "supabase",
    storage_key: "owner/case/large.pdf",
    digest: "fake",
  });
  rt.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/authenticated/"))
      return new Response(Buffer.alloc(4 * 1024 * 1024));
    if (url.includes("/object/sign/"))
      return Response.json({
        signedURL: "/object/sign/private/export?token=temporary",
      });
    assert.equal(init?.method, "POST");
    return Response.json({});
  };
  const response = await a.call(
    `/cases/${record.id}/documents/${doc.id}/original`,
  );
  assert.equal(response.status, 303);
  assert.match(
    response.headers.get("location")!,
    /^https:\/\/storage.test\/storage\/v1\/object\/sign\//,
  );
  assert.match(response.headers.get("location")!, /download=large.pdf/);
  assert.equal(
    (await rt.db.all("file_transfers", "kind=?", ["download"])).length,
    1,
  );
});

test("practice proposals preserve the selected role/language and duplicate manual testimony queues once", async (t) => {
  const { rt, a, record } = await fixture(t),
    base = `/cases/${record.id}`;
  rt.config.openrouterKey = "fake";
  rt.config.model = "fake";
  rt.fetch = async (input) =>
    String(input).includes("/embeddings")
      ? new Response("", { status: 503 })
      : structuredResponse({
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
        });
  const proposal = await a.json(base + "/practice/propose", "POST", {
    user_role: "judge",
    language: "Bahasa Indonesia",
  });
  assert.equal(proposal.conditions.user_role, "judge");
  assert.equal(proposal.conditions.language, "Bahasa Indonesia");
  rt.config.openrouterKey = "";
  rt.config.model = "";
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
  rt.config.speechKey = "private-key";
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
