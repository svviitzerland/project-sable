import { test, expect } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { zipSync, strToU8 } from "fflate";
import { register } from "./helpers";
import { settings } from "../../src/lib/server/config";
import { connectDatabase } from "../../src/lib/server/database";
import { handleApi } from "../../src/lib/server/api";
import type { Runtime } from "../../src/lib/server/runtime";
import { decodeEvent, encodeEvent } from "../../src/lib/aws-eventstream";
test("large direct uploads and speech rotation save finalized testimony", async ({
  page,
  context,
}) => {
  const dir = await mkdtemp(join(tmpdir(), "jude-browser-")),
    config = settings({ JUDE_DATA_DIR: dir });
  const rt: Runtime = {
    config,
    db: await connectDatabase(config),
    fetch: async () => {
      throw new Error("Unmocked provider");
    },
    tasks: new Set(),
    simulations: new Map(),
  };
  config.transcribe = true;
  rt.awsCredentials = {
    accessKeyId: "AKIDEXAMPLE",
    secretAccessKey: "server-secret",
  };
  const uploads: number[] = [],
    errors: string[] = [],
    connections: string[] = [],
    stops: number[] = [],
    binary: number[] = [];
  let sessions = 0;
  await context.grantPermissions(["microphone"]);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url());
    if (url.pathname.endsWith("/events")) {
      await route.fulfill({
        contentType: "text/event-stream",
        body: 'data: {"type":"connected"}\n\n',
      });
      return;
    }
    const response = await handleApi(
      rt,
      new Request(req.url(), {
        method: req.method(),
        headers: await req.allHeaders(),
        body: ["GET", "HEAD"].includes(req.method())
          ? undefined
          : req.postDataBuffer()
            ? new Uint8Array(req.postDataBuffer()!)
            : undefined,
      }),
    );
    if (url.pathname.endsWith("/documents") && req.method() === "POST")
      uploads.push(req.postDataBuffer()?.length || 0);
    if (url.pathname.endsWith("/audio-sessions") && response.ok) {
      const data = await response.json();
      data.rotate_after = sessions++ === 0 ? 0.3 : 0;
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: JSON.stringify(data),
      });
      return;
    }
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
  // Amazon Transcribe streaming: binary event-stream frames in both directions.
  await page.routeWebSocket(/wss:\/\/transcribestreaming\./, (ws) => {
    const index = connections.length;
    connections.push(ws.url());
    expect(ws.url()).not.toContain("server-secret");
    ws.onMessage((data) => {
      const { headers, payload } = decodeEvent(
        typeof data === "string" ? Buffer.from(data) : new Uint8Array(data),
      );
      expect(headers[":event-type"]).toBe("AudioEvent");
      if (payload.length) {
        binary.push(index);
        return;
      }
      // An empty audio event ends the stream: send the final result, then close.
      stops.push(index);
      const body = {
        Transcript: {
          Results: [
            {
              IsPartial: false,
              StartTime: 0,
              EndTime: 0.2,
              Alternatives: [
                {
                  Transcript: `Final words ${index}`,
                  Items: [
                    {
                      Type: "pronunciation",
                      Content: `Final words ${index}`,
                      StartTime: 0,
                      EndTime: 0.2,
                      Speaker: "0",
                      Confidence: 0.9,
                    },
                  ],
                },
              ],
            },
          ],
        },
      };
      ws.send(
        Buffer.from(
          encodeEvent(
            {
              ":event-type": "TranscriptEvent",
              ":message-type": "event",
              ":content-type": "application/json",
            },
            new TextEncoder().encode(JSON.stringify(body)),
          ),
        ),
      );
      ws.close();
    });
  });
  try {
    await register(page);
    await page.getByRole("button", { name: "New case", exact: true }).click();
    await page.getByLabel("Case title").fill("Transport case");
    await page
      .getByRole("button", { name: "Create case", exact: true })
      .click();
    await page.getByRole("tab", { name: "Case documents" }).click();
    const docx = zipSync(
      {
        "word/document.xml": strToU8(
          '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>The witness arrived at eight.</w:t></w:r></w:p></w:body></w:document>',
        ),
        "word/media/padding.bin": new Uint8Array(4 * 1024 * 1024),
      },
      { level: 0 },
    );
    await page
      .locator("input[type=file]")
      .last()
      .setInputFiles({
        name: "large-source.docx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer: Buffer.from(docx),
      });
    await expect(
      page.getByText("large-source.docx", { exact: true }).first(),
    ).toBeVisible();
    // One multipart request carries the whole file.
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toBeGreaterThan(4 * 1024 * 1024);
    await page.getByRole("tab", { name: "Hearings", exact: true }).click();
    await page
      .getByRole("button", { name: "New hearing", exact: true })
      .click();
    await page
      .getByLabel("Hearing title", { exact: true })
      .fill("Live rehearsal");
    await page
      .getByRole("button", { name: "Create hearing", exact: true })
      .click();
    await page
      .getByLabel("The presiding judge allowed recording", { exact: false })
      .check();
    await page
      .getByRole("button", { name: "Start microphone", exact: true })
      .click();
    await expect.poll(() => connections.length).toBe(2);
    await expect.poll(() => binary.includes(1)).toBe(true);
    expect(stops).toEqual([0]);
    await page.getByRole("button", { name: "Stop", exact: false }).click();
    await expect(
      page.getByRole("button", { name: "Start microphone", exact: true }),
    ).toBeVisible();
    expect(stops).toEqual([0, 1]);
    // Each connection opens with its own presigned (SigV4) URL from the server.
    expect(connections).toHaveLength(2);
    for (const url of connections)
      expect(new URL(url).searchParams.get("X-Amz-Signature")).toMatch(
        /^[0-9a-f]{64}$/,
      );
    const segments = await rt.db.all(
      "segments",
      "origin=?",
      ["transcribe"],
      "ORDER BY start",
    );
    expect(segments).toHaveLength(2);
    expect(segments.map((s) => s.text)).toEqual([
      "Final words 0",
      "Final words 1",
    ]);
    expect(segments[1].start).toBeGreaterThan(segments[0].start);
    expect(segments[0].speaker).not.toBe(segments[1].speaker);
    expect(errors).toEqual([]);
  } finally {
    await page.close();
    await rt.db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
