import { t } from "./i18n/index.svelte";
import { api } from "./workspace-api";
import {
  audioEvent,
  batchReady,
  batchText,
  decodeEvent,
  SPEECH_BATCH,
  toBatchResults,
  type BatchResult,
  type TranscribeResult,
} from "./aws-eventstream";
export type SpeechCredentials = {
  id: string;
  url: string;
  start_offset: number;
  rotate_after: number;
};
export type SavedTurn = { id: string; start: number; end: number };

/**
 * Browser-to-Amazon Transcribe stream over a presigned WebSocket. Audio frames are
 * event-stream encoded; only finalized, ordered batches enter the case API. Emits the same
 * control messages the audio session expects: ready, error and stopped.
 */
export class SpeechConnection {
  private socket: WebSocket;
  private sequence = 0;
  private saves = Promise.resolve();
  private stopping = false;
  private ended = false;
  private closed = false;
  /** Finalized results not yet saved (see SPEECH_BATCH). */
  private held: BatchResult[] = [];
  private heldSince = 0;
  private idle: ReturnType<typeof setTimeout> | undefined;
  private live = "";
  /** Saved batches stay on screen until the transcript has reloaded with them. */
  private saving: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(
    private caseId: string,
    private credentials: SpeechCredentials,
    private partial: (text: string) => void,
    private saved: (turns: SavedTurn[]) => void = () => undefined,
    private settle: () => Promise<unknown> = async () => undefined,
  ) {
    this.socket = new WebSocket(credentials.url);
    this.socket.binaryType = "arraybuffer";
    this.socket.onopen = () => {
      this.onopen?.();
      // Transcribe starts streaming as soon as the socket opens.
      this.emit({
        type: "ready",
        start_offset: credentials.start_offset,
        rotate_after: credentials.rotate_after,
      });
    };
    this.socket.onerror = () => this.onerror?.();
    this.socket.onclose = () => {
      if (this.stopping) this.finish();
      else if (!this.ended) this.onclose?.();
    };
    this.socket.onmessage = (event) => {
      try {
        const { headers, payload } = decodeEvent(event.data as ArrayBuffer);
        const body = payload.length
          ? JSON.parse(new TextDecoder().decode(payload))
          : {};
        if (headers[":message-type"] === "exception") {
          this.emit({
            type: "error",
            message:
              headers[":exception-type"] === "LimitExceededException"
                ? t("audio.error.limit")
                : t("audio.error.provider"),
          });
          return;
        }
        if (headers[":event-type"] !== "TranscriptEvent") return;
        for (const result of (body.Transcript?.Results ??
          []) as TranscribeResult[]) {
          if (result.IsPartial) {
            this.live = result.Alternatives?.[0]?.Transcript ?? "";
            this.show();
            this.wait();
            continue;
          }
          this.live = "";
          const results = toBatchResults(result);
          if (results.length) this.hold(results);
        }
      } catch {
        this.emit({
          type: "error",
          message: t("audio.error.providerResponse"),
        });
      }
    };
  }
  /** The live line shows held text plus what is being said now. */
  private show() {
    this.partial(
      [...this.saving, batchText(this.held), this.live]
        .filter(Boolean)
        .join(" "),
    );
  }
  private hold(results: BatchResult[]) {
    if (!this.held.length) this.heldSince = Date.now();
    this.held.push(...results);
    if (batchReady(this.held, Date.now() - this.heldSince)) this.flush();
    else {
      this.show();
      this.wait();
    }
  }
  /** Restart the pause timer; silence saves what is held. */
  private wait() {
    clearTimeout(this.idle);
    if (this.held.length)
      this.idle = setTimeout(() => this.flush(), SPEECH_BATCH.idleMs);
  }
  private flush() {
    clearTimeout(this.idle);
    if (!this.held.length) return;
    const results = this.held;
    this.held = [];
    this.show();
    this.queue(results);
  }
  private queue(results: BatchResult[]) {
    const batch = { sequence: ++this.sequence, results };
    const text = batchText(results);
    this.saving.push(text);
    const release = () => {
      const index = this.saving.indexOf(text);
      if (index >= 0) this.saving.splice(index, 1);
      this.show();
    };
    this.saves = this.saves.then(async () => {
      let last: unknown;
      for (let attempt = 0; attempt < 3; attempt++)
        try {
          const result = await api<{ segments?: SavedTurn[] }>(
            `/cases/${this.caseId}/audio-sessions/${this.credentials.id}/transcripts`,
            { method: "POST", body: JSON.stringify(batch) },
          );
          if (result?.segments?.length) this.saved(result.segments);
          // Keep the words visible until the transcript shows them.
          await this.settle().catch(() => undefined);
          release();
          return;
        } catch (error) {
          last = error;
          if (attempt < 2)
            await new Promise((resolve) =>
              setTimeout(resolve, 500 * (attempt + 1)),
            );
        }
      throw last;
    });
    void this.saves.catch(() => {
      release();
      this.emit({
        type: "error",
        message: t("audio.error.saveFinal"),
      });
    });
  }
  /** After the end-of-stream frame, Transcribe sends final results and closes. */
  private finish() {
    if (this.ended) return;
    this.ended = true;
    this.flush();
    void this.saves
      .then(() =>
        api(
          `/cases/${this.caseId}/audio-sessions/${this.credentials.id}/stop`,
          { method: "POST" },
        ),
      )
      .then(() => {
        if (this.closed) return;
        this.emit({ type: "stopped" });
        this.closed = true;
        this.onclose?.();
      })
      .catch(() =>
        this.emit({
          type: "error",
          message: t("audio.error.finishSave"),
        }),
      );
  }
  private emit(message: unknown) {
    if (!this.closed) this.onmessage?.({ data: JSON.stringify(message) });
  }
  get readyState() {
    return this.socket.readyState;
  }
  get bufferedAmount() {
    return this.socket.bufferedAmount;
  }
  send(data: string | ArrayBuffer) {
    if (typeof data !== "string") {
      if (this.socket.readyState === WebSocket.OPEN)
        this.socket.send(audioEvent(new Uint8Array(data)));
      return;
    }
    // Control messages from the audio session: only "stop" matters for Transcribe.
    if (JSON.parse(data).type !== "stop" || this.stopping) return;
    this.stopping = true;
    if (this.socket.readyState === WebSocket.OPEN)
      this.socket.send(audioEvent(new Uint8Array(0)));
    else this.finish();
  }
  close() {
    if (this.closed) return;
    this.flush();
    this.closed = true;
    this.socket.close();
    void this.saves
      .finally(() =>
        fetch(
          `/api/v1/cases/${this.caseId}/audio-sessions/${this.credentials.id}/stop`,
          { method: "POST", credentials: "same-origin", keepalive: true },
        ),
      )
      .catch(() => undefined);
  }
}
