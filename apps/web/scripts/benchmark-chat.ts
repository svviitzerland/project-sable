/**
 * Live Bedrock check of the case assistant and courtroom practice on a .jude archive:
 * one assistant question and one practice turn per model, through the app's own
 * dialogue code (citation verification included). Prints answers for human reading.
 *
 *   pnpm tsx scripts/benchmark-chat.ts --models global.amazon.nova-2-lite-v1:0
 */
import { parseArgs } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  BedrockRuntimeClient,
  type ConverseCommand,
  type ConverseCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";
import { settings } from "../src/lib/server/config";
import { connectDatabase } from "../src/lib/server/database";
import type { Runtime } from "../src/lib/server/runtime";
import { importCase } from "../src/lib/server/archive";
import {
  createDialogue,
  dialogueInput,
  sendDialogue,
  sendInput,
} from "../src/lib/server/dialogues";
import { exactSourceQuote } from "../src/lib/server/quotes";

const { values } = parseArgs({
  options: {
    archive: { type: "string", default: "static/demo/sambo-796-public.jude" },
    models: { type: "string", default: "" },
    debug: { type: "boolean", default: false },
  },
});
const data = new Uint8Array(await readFile(values.archive));
for (const model of values.models.split(",").filter(Boolean)) {
  const dir = await mkdtemp(join(tmpdir(), "jude-chat-bench-"));
  const config = settings({
    JUDE_DATA_DIR: dir,
    AI_PROVIDER: "bedrock",
    AWS_REGION: "ap-southeast-1",
    BEDROCK_MODEL: model,
  });
  const rt: Runtime = {
    config,
    db: await connectDatabase(config),
    fetch,
    tasks: new Set(),
  };
  if (values.debug) {
    // Print each raw tool call (case data stays on this machine's console).
    const client = new BedrockRuntimeClient({ region: "ap-southeast-1" });
    rt.bedrock = {
      send: (async (command: ConverseCommand) => {
        try {
          const response = (await client.send(
            command,
          )) as ConverseCommandOutput;
          const tool = response.output?.message?.content?.find(
            (c) => c.toolUse,
          )?.toolUse;
          const input = tool?.input as {
            citations?: { chunk_id: string; quote: string }[];
          };
          const payload = JSON.parse(
            (command.input.messages![0].content![0] as { text: string }).text,
          );
          const sources: { chunk_id: string; text: string }[] =
            payload.case_context?.sources ?? [];
          for (const c of input?.citations ?? []) {
            const source = sources.find((s) => s.chunk_id === c.chunk_id);
            console.log(
              `  citation ${c.chunk_id.slice(0, 8)} known=${!!source} match=${!!source && !!exactSourceQuote(source.text, c.quote)} quote=${JSON.stringify(c.quote.slice(0, 160))}`,
            );
          }
          console.log(
            "  source ids:",
            sources.map((s) => s.chunk_id.slice(0, 8)).join(","),
          );
          return response;
        } catch (error) {
          console.log(
            "  error:",
            (error as Error).name,
            (error as Error).message,
          );
          throw error;
        }
      }) as never,
    };
  }
  try {
    const user = await rt.db.insert("users", {
      email: "chat-benchmark@example.invalid",
      name: "Benchmark",
      password_hash: "disabled",
    });
    const record = await importCase(rt, user, data);
    const turns: [string, Record<string, unknown>, string][] = [
      [
        "assistant",
        { kind: "assistant" },
        "Menurut putusan, siapa yang meminta Susi pindah ke lantai atas menemani Putri Candrawathi, dan di mana Susi tidur malam itu?",
      ],
      [
        "practice",
        {
          kind: "practice",
          conditions: {
            stage: "Cross-examination",
            user_role: "defense",
            language: "Bahasa Indonesia",
          },
        },
        "Saksi Susi, apakah Saudara melihat sendiri Om Kuat membopong Ibu Putri ke dalam kamar?",
      ],
    ];
    for (const [label, body, text] of turns) {
      const start = performance.now();
      try {
        const dialogue = await createDialogue(
          rt,
          record,
          dialogueInput.parse(body),
        );
        const detail = await sendDialogue(
          rt,
          record,
          dialogue.id,
          sendInput.parse({ text, request_id: randomUUID() }),
        );
        const replies = detail.messages.filter(
          (m: { role: string }) => m.role === "assistant",
        );
        console.log(
          `\n=== ${model} ${label} (${Math.round(performance.now() - start)} ms)`,
        );
        for (const m of replies.slice(label === "practice" ? 1 : 0))
          console.log(
            `[${m.speaker}] ${m.text}\n  citations: ${JSON.stringify(m.citations?.map((c: { quote: string }) => c.quote.slice(0, 120)))}`,
          );
      } catch (error) {
        console.log(
          `\n=== ${model} ${label} FAILED: ${(error as Error).message}`,
        );
      }
    }
  } finally {
    await rt.db.close();
    await rm(dir, { recursive: true, force: true });
  }
}
