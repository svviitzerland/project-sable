import { aiConfigured, embeddingsConfigured } from "./config";
import { z } from "zod";
import { setTimeout as delay } from "node:timers/promises";
import type { Runtime } from "./runtime";
import {
  authenticate,
  boundedBody,
  checkPassword,
  cookieToken,
  hash,
  hashPassword,
  hearingFor,
  locked,
  ownedCase,
  publicUser,
  publish,
  rate,
  schedule,
  sessionCookie,
} from "./runtime";
import { seconds, uid } from "./database";
import {
  caseInput,
  credentials,
  hearingInput,
  hearingFileSchema,
  segmentInput,
  type Case,
} from "./contracts";
import { assert, HttpError, reportUnexpectedError } from "./errors";
import {
  caseOutput,
  documentOutput,
  sourceOutput,
  hearingOutput,
  segmentOutput,
  findingOutput,
  linkOutput,
  exportCase,
  importCase,
  pack,
  MAX_ARCHIVE,
} from "./archive";
import { ingest, MAX_BYTES } from "./documents";
import { deleteFile, legalSearch, readFileData } from "./providers";
import { retrieve } from "./retrieval";
import { previewHearing, validateReviewed } from "./hearings";
import {
  askEvidence,
  graph,
  buildLinks,
  checkedPair,
  relationSchema,
} from "./evidence";
import {
  conditionsSchema,
  dialogueInput,
  sendInput,
  createDialogue,
  dialogueDetail,
  proposeConditions,
  sendDialogue,
} from "./dialogues";
import { inventory } from "./context";
import { fileResponse, readUpload } from "./uploads";
import {
  deleteRecording,
  listRecordings,
  recordingResponse,
  saveRecording,
} from "./recordings";
import { enqueue } from "./jobs";
import { investigate } from "./analysis";
import {
  audioInput,
  audioBatch,
  beginAudio,
  saveAudio,
  endAudio,
  expireAudio,
} from "./audio";
import {
  forgetVoices,
  identifySegment,
  MAX_CLIP_BYTES,
  voiceConfigured,
} from "./voice";
import { seedDemo } from "./synthetic";
const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
async function body<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  let input: unknown;
  try {
    input = JSON.parse(
      new TextDecoder().decode(await boundedBody(request, 2 * 1024 * 1024)),
    );
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(422, "Invalid JSON request.");
  }
  return schema.parse(input);
}
// Housekeeping runs opportunistically on case list loads, at most every five minutes.
const swept = new WeakMap<Runtime, number>();
async function sweep(rt: Runtime) {
  if (seconds() - (swept.get(rt) ?? 0) < 300) return;
  swept.set(rt, seconds());
  for (const table of [
    "socket_tickets",
    "runtime_rates",
    "runtime_leases",
  ] as const)
    await rt.db.remove(table, "expires<?", [seconds()]);
  await expireAudio(rt);
}
export async function caseDetail(rt: Runtime, record: Case) {
  return {
    case: caseOutput.strip().parse(record),
    hearings: (
      await rt.db.all(
        "hearings",
        "case_id=?",
        [record.id],
        "ORDER BY created_at",
      )
    ).map((h) => hearingOutput.strip().parse(h)),
    documents: (
      await rt.db.all(
        "documents",
        "case_id=?",
        [record.id],
        "ORDER BY created_at",
      )
    ).map((d) => documentOutput.parse(d)),
    segments: (
      await rt.db.all(
        "segments",
        "case_id=?",
        [record.id],
        "ORDER BY created_at",
      )
    ).map((s) => segmentOutput.strip().parse(s)),
    findings: (
      await rt.db.all(
        "findings",
        "case_id=?",
        [record.id],
        "ORDER BY created_at",
      )
    ).map((f) => findingOutput.strip().parse(f)),
    recordings: await listRecordings(rt, record.id),
  };
}
function eventStream(rt: Runtime, request: Request, record: Case) {
  const stopped = new AbortController();
  request.signal.addEventListener("abort", () => stopped.abort(), {
    once: true,
  });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        let revision = -1,
          ticks = 0;
        const send = (value: unknown) =>
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(value)}\n\n`),
          );
        try {
          send({ type: "connected" });
          while (!stopped.signal.aborted && ticks < 220) {
            if (ticks % 10 === 0) {
              await authenticate(rt, request);
              await expireAudio(rt, record.id);
              send({ type: "heartbeat" });
            }
            const event = await rt.db.one("runtime_events", "case_id=?", [
              record.id,
            ]);
            if (event && event.revision !== revision) {
              revision = event.revision;
              send(event.payload);
            }
            await delay(1000, undefined, { signal: stopped.signal });
            ticks++;
          }
        } catch {
          /* Disconnect or revoked session ends the stream. */
        } finally {
          if (!stopped.signal.aborted) controller.close();
        }
      })();
    },
    cancel() {
      stopped.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
export async function handleApi(
  rt: Runtime,
  request: Request,
  clientAddress = "local",
): Promise<Response> {
  try {
    const url = new URL(request.url),
      parts = url.pathname
        .replace(/^\/api\/v1\/?/, "")
        .split("/")
        .filter(Boolean),
      method = request.method;
    const origin = request.headers.get("origin");
    if (!["GET", "HEAD", "OPTIONS"].includes(method) && origin)
      assert(
        origin === url.origin || rt.config.origins.includes(origin),
        403,
        "This origin is not allowed.",
      );
    const send = json;
    const route = async (): Promise<Response> => {
      if (parts[0] === "health" && method === "GET")
        return json({ status: "ok", service: "jude-sveltekit" });
      if (parts[0] === "capabilities" && method === "GET")
        return json({
          demo_available: rt.config.demo,
          storage: rt.config.databaseUrl ? "PostgreSQL" : "Local SQLite",
          analysis: {
            configured: aiConfigured(rt.config),
            note: aiConfigured(rt.config)
              ? rt.config.aiProvider === "bedrock"
                ? "Amazon Bedrock configured."
                : "OpenRouter configured; live provider verification required."
              : "Set AI_PROVIDER=bedrock (AWS) or OPENROUTER_API_KEY and OPENROUTER_MODEL.",
          },
          speech: {
            configured: rt.config.transcribe,
            note: rt.config.transcribe
              ? "Amazon Transcribe configured."
              : "Enable Amazon Transcribe (AI_PROVIDER=bedrock or TRANSCRIBE=1) for microphone and prepared audio.",
          },
          voice: {
            configured: voiceConfigured(rt),
            note: voiceConfigured(rt)
              ? "Voice service configured; recurring voices keep one label."
              : "Speaker labels last for one recording connection.",
          },
          legal: {
            configured: !!rt.config.pasalKey,
            note: "Pasal.id discovery metadata and links only; no legal text.",
          },
          embeddings: {
            configured: embeddingsConfigured(rt.config),
            note: "Semantic + keyword retrieval when embeddings are available. Keyword search otherwise.",
          },
        });
      if (parts[0] === "auth") {
        if (["register", "login"].includes(parts[1]) && method === "POST") {
          await rate(rt, `auth:${clientAddress}`, 10);
          const input = await body(request, credentials),
            email = input.email.trim().toLowerCase();
          let account = await rt.db.one("users", "email=?", [email]);
          if (parts[1] === "register") {
            assert(
              !account,
              409,
              "An account already uses this email. Sign in instead.",
            );
            try {
              account = await rt.db.insert("users", {
                email,
                name: input.name,
                password_hash: await hashPassword(input.password),
              });
            } catch (error) {
              if (await rt.db.one("users", "email=?", [email]))
                throw new HttpError(
                  409,
                  "An account already uses this email. Sign in instead.",
                );
              throw error;
            }
          } else
            assert(
              account &&
                (await checkPassword(input.password, account.password_hash)),
              401,
              "Email or password is incorrect.",
            );
          return json(publicUser(account!), 200, {
            "Set-Cookie": await sessionCookie(rt, account!),
          });
        }
        if (parts[1] === "demo" && method === "POST") {
          assert(
            rt.config.demo,
            403,
            "Demonstration sign-in is disabled in production.",
          );
          await rate(rt, `demo:${clientAddress}`, 5);
          const account = await rt.db.insert("users", {
            email: `${uid()}@demo.invalid`,
            name: "Demo counsel",
            password_hash: "disabled",
            demo: true,
          });
          await seedDemo(rt, account);
          return json(publicUser(account), 200, {
            "Set-Cookie": await sessionCookie(rt, account),
          });
        }
        if (parts[1] === "logout" && method === "POST") {
          const token = cookieToken(request);
          if (token)
            await rt.db.remove("sessions", "token_hash=?", [hash(token)]);
          return json({ message: "Signed out" }, 200, {
            "Set-Cookie": `jude_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${rt.config.production ? "; Secure" : ""}`,
          });
        }
        if (parts[1] === "me" && method === "GET")
          return json(publicUser(await authenticate(rt, request)));
        throw new HttpError(404, "Not found");
      }
      if (parts[0] === "hearing-template" && method === "GET")
        return new Response(
          Buffer.from(
            pack(
              hearingFileSchema.parse({
                title: "Witness examination",
                segments: [
                  {
                    speaker: "Counsel",
                    text: "When did you arrive?",
                    start: 0,
                    end: 3,
                  },
                  {
                    speaker: "Witness",
                    text: "I arrived at eight in the morning.",
                    start: 4,
                    end: 8,
                  },
                ],
              }),
            ),
          ),
          {
            headers: {
              "Content-Type": "application/vnd.jude+zip",
              "Content-Disposition":
                'attachment; filename="hearing-template.jude"',
            },
          },
        );
      const user = await authenticate(rt, request);
      assert(parts[0] === "cases", 404, "Not found");
      if (parts.length === 1) {
        if (method === "GET") {
          await sweep(rt);
          return send(
            (
              await rt.db.all(
                "cases",
                "owner_id=?",
                [user.id],
                "ORDER BY created_at DESC",
              )
            ).map((c) => caseOutput.strip().parse(c)),
          );
        }
        if (method === "POST")
          return send(
            caseOutput.strip().parse(
              await rt.db.insert("cases", {
                owner_id: user.id,
                ...(await body(request, caseInput)),
              }),
            ),
          );
      }
      if (parts[1] === "synthetic" && method === "POST") {
        assert(
          rt.config.demo,
          403,
          "The demonstration case is disabled in production.",
        );
        await rate(rt, `seed:${user.id}`, 5);
        return send(caseOutput.strip().parse(await seedDemo(rt, user)));
      }
      if (parts[1] === "import" && method === "POST") {
        await rate(rt, `archive:${user.id}`, 5);
        const file = await readUpload(request, MAX_ARCHIVE);
        return send(
          caseOutput.strip().parse(await importCase(rt, user, file.data)),
        );
      }
      const record = await ownedCase(rt, parts[1], user.id),
        caseId = record.id,
        action = parts[2];
      if (parts.length === 2 && method === "GET") {
        await expireAudio(rt, caseId);
        return send(await caseDetail(rt, await ownedCase(rt, caseId, user.id)));
      }
      if (parts.length === 2 && method === "PATCH") {
        const input = await body(request, caseInput.partial());
        const [updated] = await rt.db.update(
          "cases",
          Object.fromEntries(
            Object.entries(input).filter(([, v]) => v !== undefined),
          ),
          "id=?",
          [caseId],
        );
        await publish(rt, caseId, { type: "case" });
        return send(caseOutput.strip().parse(updated));
      }
      if (parts.length === 2 && method === "DELETE") {
        assert(
          !(await rt.db.one("audio_sessions", "case_id=? AND status=?", [
            caseId,
            "active",
          ])) && !rt.simulations.has(caseId),
          409,
          "Stop the live hearing before deleting this case.",
        );
        // Stored originals and recordings first, then the rows (foreign keys cascade).
        const files = [
          ...(await rt.db.all("documents", "case_id=?", [caseId])),
          ...(await rt.db.all("recordings", "case_id=?", [caseId])),
        ];
        for (const file of files)
          await deleteFile(rt, file.storage_key, file.storage).catch(() => {
            /* A missing object must not keep the case alive. */
          });
        await rt.db.remove("cases", "id=?", [caseId]);
        return send({ removed: 1 });
      }
      if (action === "events" && method === "GET")
        return eventStream(rt, request, record);
      if (action === "speakers" && method === "PATCH") {
        const input = await body(
          request,
          z.strictObject({
            speaker: z.string().trim().min(1).max(80),
            label: z.string().trim().min(1).max(80),
          }),
        );
        const [updated] = await rt.db.update(
          "cases",
          { speakers: { ...record.speakers, [input.speaker]: input.label } },
          "id=?",
          [caseId],
        );
        await publish(rt, caseId, { type: "speakers" });
        return send(caseOutput.strip().parse(updated));
      }
      if (action === "documents") {
        if (parts.length === 3 && method === "POST") {
          await rate(rt, `upload:${user.id}`, 10);
          const file = await readUpload(request, MAX_BYTES),
            document = await ingest(rt, record, file.name, file.data);
          await publish(rt, caseId, { type: "document" });
          return send(documentOutput.parse(document));
        }
        const document = await rt.db.one("documents", "id=? AND case_id=?", [
          parts[3],
          caseId,
        ]);
        assert(document, 404, "Document not found");
        if (parts[4] === "original" && method === "GET")
          return fileResponse(
            await readFileData(rt, document),
            document.mime,
            document.name,
          );
        if (parts[4] === "chunks" && method === "GET")
          return send(
            (
              await rt.db.all(
                "chunks",
                "case_id=? AND document_id=?",
                [caseId, document.id],
                "ORDER BY page",
              )
            ).map((c) =>
              sourceOutput.parse({
                ...c,
                document_name: document.name,
                score: 0,
              }),
            ),
          );
      }
      if (action === "sources" && method === "GET") {
        const chunk = await rt.db.one("chunks", "id=? AND case_id=?", [
          parts[3],
          caseId,
        ]);
        assert(chunk, 404, "Source not found");
        const doc = await rt.db.one("documents", "id=?", [chunk.document_id]);
        return send(
          sourceOutput.parse({ ...chunk, document_name: doc!.name, score: 0 }),
        );
      }
      if (action === "search" && method === "GET") {
        const query = z
          .string()
          .min(2)
          .max(600)
          .parse(url.searchParams.get("q"));
        await rate(rt, `search:${user.id}`, 30);
        const result = await retrieve(rt, caseId, query);
        return send({ results: result.results, method: result.mode });
      }
      if (action === "legal" && method === "GET") {
        const query = z
          .string()
          .min(2)
          .max(160)
          .parse(url.searchParams.get("q"));
        await rate(rt, `legal:${user.id}`, 20);
        return send({
          results: await legalSearch(rt, query),
          note: "Discovery metadata only. Read and verify the linked legal text and its applicability before relying on it.",
        });
      }
      if (action === "recordings") {
        if (parts.length === 3 && method === "POST") {
          await rate(rt, `recording:${user.id}`, 30);
          return send(await saveRecording(rt, record, request, url));
        }
        if (parts.length === 4 && method === "GET")
          return recordingResponse(rt, record, parts[3], request);
        if (parts.length === 4 && method === "DELETE")
          return send(await deleteRecording(rt, record, parts[3]));
      }
      if (action === "voiceprints" && parts.length === 3 && method === "DELETE")
        return send(await forgetVoices(rt, record));
      if (action === "transcripts") {
        if (parts.length === 3 && method === "POST") {
          await rate(rt, `transcript:${user.id}`, 30);
          const input = await body(request, segmentInput);
          assert(
            !input.end || input.end >= input.start,
            422,
            "End time cannot precede start time.",
          );
          const hearing = await hearingFor(rt, caseId, input.hearing_id);
          const { segment, created } = await locked(
            rt,
            `transcript:${caseId}`,
            async () => {
              const existing = await rt.db.one(
                "segments",
                "case_id=? AND hearing_id=? AND text=? AND speaker=? AND start=? AND origin=?",
                [
                  caseId,
                  hearing.id,
                  input.text,
                  input.speaker,
                  input.start,
                  "manual",
                ],
              );
              if (existing) return { segment: existing, created: false };
              const segment = await rt.db.insert("segments", {
                case_id: caseId,
                ...input,
                hearing_id: hearing.id,
              });
              return { segment, created: true };
            },
          );
          if (created) enqueue(rt, segment.id);
          await publish(rt, caseId, { type: "transcript" });
          return send(segmentOutput.strip().parse(segment));
        }
        if (parts[4] === "voice" && method === "POST") {
          await rate(rt, `voice:${user.id}`, 120);
          return send(
            await identifySegment(
              rt,
              record,
              parts[3],
              await boundedBody(request, MAX_CLIP_BYTES),
            ),
          );
        }
        if (parts[4] === "retry" && method === "POST") {
          await rate(rt, `retry:${user.id}`, 15);
          const segment = await rt.db.one("segments", "id=? AND case_id=?", [
            parts[3],
            caseId,
          ]);
          assert(segment, 404, "Statement not found");
          assert(
            ["failed", "unavailable", "interrupted"].includes(
              segment.analysis_state,
            ),
            409,
            "Only failed or interrupted analysis can be retried.",
          );
          assert(
            aiConfigured(rt.config),
            503,
            "Connect OpenRouter before retrying analysis.",
          );
          await rt.db.update("segments", { analysis_state: "queued" }, "id=?", [
            segment.id,
          ]);
          enqueue(rt, segment.id);
          return send({ message: "Analysis queued" });
        }
      }
      if (action === "findings" && method === "PATCH") {
        const input = await body(
            request,
            z.strictObject({
              reviewed: z.boolean(),
              note: z.string().max(4000).default(""),
            }),
          ),
          [finding] = await rt.db.update(
            "findings",
            input,
            "id=? AND case_id=?",
            [parts[3], caseId],
          );
        assert(finding, 404, "Finding not found");
        await publish(rt, caseId, { type: "finding" });
        return send(findingOutput.strip().parse(finding));
      }
      if (action === "hearings") {
        if (parts.length === 3 && method === "POST") {
          const hearing = await rt.db.insert("hearings", {
            case_id: caseId,
            ...(await body(request, hearingInput)),
          });
          await publish(rt, caseId, { type: "hearing" });
          return send(hearingOutput.strip().parse(hearing));
        }
        if (["preview", "import"].includes(parts[3]) && method === "POST") {
          await rate(
            rt,
            `${parts[3] === "preview" ? "conversion" : "hearing-import"}:${user.id}`,
            10,
          );
          const { name, data, form } = await readUpload(request);
          if (parts[3] === "preview")
            return send(
              await previewHearing(
                rt,
                name,
                data,
                form.get("convert") === "true",
              ),
            );
          const transcript = hearingFileSchema.parse(
              JSON.parse(String(form.get("transcript"))),
            ),
            { raw, mime } = await validateReviewed(name, data, transcript),
            document = await ingest(rt, record, name, data, {
              pages: [[1, raw]],
              mime,
            });
          const hearing = await rt.db.transaction(async (db) => {
            const hearing = await db.insert("hearings", {
              case_id: caseId,
              title: transcript.title,
              date: transcript.date,
              kind: "imported",
              status: "ready",
              source_document_id: document.id,
            });
            for (const turn of transcript.segments)
              await db.insert("segments", {
                case_id: caseId,
                hearing_id: hearing.id,
                origin: "imported",
                analysis_state: "pending",
                ...turn,
              });
            return hearing;
          });
          await publish(rt, caseId, { type: "hearing" });
          return send(hearingOutput.strip().parse(hearing));
        }
        assert(
          parts[3] && parts[4] && ["export.jude", "analyze"].includes(parts[4]),
          404,
          "Not found",
        );
        const hearing = await hearingFor(rt, caseId, parts[3]);
        if (parts[4] === "export.jude" && method === "GET") {
          const segments = await rt.db.all(
            "segments",
            "hearing_id=?",
            [hearing.id],
            "ORDER BY created_at",
          );
          assert(
            segments.length,
            409,
            "Add testimony before exporting this hearing.",
          );
          const payload = hearingFileSchema.parse({
            title: hearing.title,
            date: hearing.date,
            segments: segments.map(({ speaker, text, start, end }) => ({
              speaker,
              text,
              start,
              end,
            })),
          });
          return fileResponse(
            pack(payload),
            "application/vnd.jude+zip",
            `hearing-${hearing.id}.jude`,
          );
        }
        if (parts[4] === "analyze" && method === "POST") {
          await rate(rt, `analyze-hearing:${user.id}`, 10);
          assert(
            aiConfigured(rt.config),
            503,
            "Connect an OpenRouter analysis model to examine this hearing. Your transcript is saved.",
          );
          const ids = await rt.db.transaction(async (db) => {
            const segments = await db.all(
              "segments",
              "hearing_id=? AND analysis_state IN ('pending','unavailable','failed','interrupted')",
              [hearing.id],
            );
            for (const s of segments)
              await db.update(
                "segments",
                { analysis_state: "queued" },
                "id=?",
                [s.id],
              );
            return segments.map((s) => s.id);
          });
          schedule(
            rt,
            (async () => {
              for (const id of ids) await investigate(rt, id);
            })(),
          );
          return send({ queued: ids.length });
        }
      }
      if (action === "graph") {
        if (parts.length === 3 && method === "GET")
          return send(await graph(rt, caseId));
        if (parts[3] === "build" && method === "POST") {
          await rate(rt, `graph:${user.id}`, 5);
          const result = await locked(rt, `graph:${caseId}`, () =>
            buildLinks(rt, caseId),
          );
          await publish(rt, caseId, { type: "graph" });
          return send(result);
        }
      }
      if (action === "ask" && method === "POST") {
        await rate(rt, `ask:${user.id}`, 20);
        const input = await body(
          request,
          z.strictObject({ query: z.string().min(2).max(600) }),
        );
        return send(await askEvidence(rt, caseId, input.query));
      }
      if (action === "links") {
        if (parts.length === 3 && method === "POST") {
          const input = await body(
              request,
              z.strictObject({
                source_id: z.string(),
                target_id: z.string(),
                relation: relationSchema,
                explanation: z.string().min(3).max(2000),
              }),
            ),
            [a, b] = await checkedPair(
              rt,
              caseId,
              input.source_id,
              input.target_id,
            );
          const link = await locked(rt, `graph:${caseId}`, async () => {
            assert(
              !(await rt.db.one(
                "evidence_links",
                "case_id=? AND source_id=? AND target_id=?",
                [caseId, a.id, b.id],
              )),
              409,
              "This pair is already linked. Review its existing connection.",
            );
            return rt.db.insert("evidence_links", {
              case_id: caseId,
              ...input,
              basis: "manual",
              confirmed: true,
              source_quote: a.text.slice(0, 300),
              target_quote: b.text.slice(0, 300),
            });
          });
          await publish(rt, caseId, { type: "graph" });
          return send(linkOutput.parse(link));
        }
        if (method === "PATCH") {
          const input = await body(
              request,
              z.strictObject({ confirmed: z.boolean() }),
            ),
            [link] = await rt.db.update(
              "evidence_links",
              input,
              "id=? AND case_id=?",
              [parts[3], caseId],
            );
          assert(link, 404, "Evidence link not found");
          await publish(rt, caseId, { type: "graph" });
          return send(linkOutput.parse(link));
        }
      }
      if (
        action === "assistant" &&
        parts[3] === "context" &&
        method === "GET"
      ) {
        const { documents, hearings } = await inventory(rt, caseId);
        return send({
          references: [
            ...documents.map((d) => ({
              id: `document:${d.id}`,
              label: d.name,
              kind: "document",
            })),
            ...hearings.map((h) => ({
              id: `hearing:${h.id}`,
              label: h.title,
              kind: "hearing",
            })),
          ],
        });
      }
      if (action === "practice" && parts[3] === "propose" && method === "POST")
        return send(
          await proposeConditions(
            rt,
            record,
            await body(request, conditionsSchema),
          ),
        );
      if (action === "dialogues") {
        if (parts.length === 3) {
          if (method === "GET") {
            const kind = z
              .enum(["assistant", "practice"])
              .parse(url.searchParams.get("kind"));
            return send(
              await rt.db.all(
                "dialogues",
                "case_id=? AND kind=?",
                [caseId, kind],
                "ORDER BY created_at DESC",
              ),
            );
          }
          if (method === "POST")
            return send(
              await createDialogue(
                rt,
                record,
                await body(request, dialogueInput),
              ),
            );
        }
        const dialogue = await rt.db.one("dialogues", "id=? AND case_id=?", [
          parts[3],
          caseId,
        ]);
        assert(dialogue, 404, "Conversation not found");
        if (parts.length === 4 && method === "GET")
          return send(await dialogueDetail(rt, dialogue));
        if (parts[4] === "messages" && method === "POST")
          return send(
            await sendDialogue(
              rt,
              record,
              dialogue.id,
              await body(request, sendInput),
            ),
          );
        if (parts[4] === "export" && method === "GET")
          return fileResponse(
            new TextEncoder().encode(
              JSON.stringify({
                format: "jude-conversation",
                version: 1,
                case_id: caseId,
                conversation: await dialogueDetail(rt, dialogue),
              }),
            ),
            "application/json",
            `conversation-${dialogue.id}.json`,
          );
      }
      if (action === "audio-sessions") {
        if (parts.length === 3 && method === "POST")
          return send(
            await beginAudio(
              rt,
              record,
              request,
              await body(request, audioInput),
            ),
          );
        if (parts[4] === "transcripts" && method === "POST")
          return send(
            await saveAudio(
              rt,
              record,
              request,
              parts[3],
              await body(request, audioBatch),
            ),
          );
        if (parts[4] === "stop" && method === "POST")
          return send(await endAudio(rt, record, request, parts[3]));
      }
      if (action === "export.jude" && method === "GET")
        return fileResponse(
          await exportCase(rt, record),
          "application/vnd.jude+zip",
          `case-${caseId}.jude`,
        );
      if (action === "export" && method === "GET") {
        const detail = await caseDetail(rt, record),
          sources = (await rt.db.all("chunks", "case_id=?", [caseId])).map(
            ({ id, document_id, page, section, text }) => ({
              id,
              document_id,
              page,
              section,
              text,
            }),
          );
        return fileResponse(
          new TextEncoder().encode(
            JSON.stringify(
              {
                ...detail,
                sources,
                notice:
                  "Decision support only. Verify original sources.",
              },
              null,
              2,
            ),
          ),
          "application/json",
          `jude-${caseId}.json`,
        );
      }
      throw new HttpError(404, "Not found");
    };
    const response = await route();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  } catch (error) {
    const status =
      error instanceof HttpError
        ? error.status
        : error instanceof z.ZodError || error instanceof SyntaxError
          ? 422
          : 500;
    const reference = status === 500 ? reportUnexpectedError(error) : undefined;
    return json(
      {
        detail:
          error instanceof HttpError
            ? error.message
            : status === 422
              ? "The request does not match the expected format."
              : `The request could not be completed. Please try again. Reference: ${reference}`,
      },
      status,
      { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    );
  }
}
