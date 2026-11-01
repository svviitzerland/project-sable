import { t } from "./i18n/index.svelte";
import { api } from "./workspace-api";
import {
  audioEvent,
  decodeEvent,
  toBatchResults,
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
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(
    private caseId: string,
    private credentials: SpeechCredentials,
    private partial: (text: string) => void,
    private saved: (turns: SavedTurn[]) => void = () => undefined,
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
            this.partial(result.Alternatives?.[0]?.Transcript ?? "");
            continue;
          }
          const results = toBatchResults(result);
          if (results.length) this.queue(results);
        }
      } catch {
        this.emit({
          type: "error",
          message: t("audio.error.providerResponse"),
        });
      }
    };
  }
  private queue(results: ReturnType<typeof toBatchResults>) {
    const batch = { sequence: ++this.sequence, results };
    this.saves = this.saves.then(async () => {
      let last: unknown;
      for (let attempt = 0; attempt < 3; attempt++)
        try {
          const result = await api<{ segments?: SavedTurn[] }>(
            `/cases/${this.caseId}/audio-sessions/${this.credentials.id}/transcripts`,
            { method: "POST", body: JSON.stringify(batch) },
          );
          this.partial("");
          if (result?.segments?.length) this.saved(result.segments);
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
    void this.saves.catch(() =>
      this.emit({
        type: "error",
        message: t("audio.error.saveFinal"),
      }),
    );
  }
  /** After the end-of-stream frame, Transcribe sends final results and closes. */
  private finish() {
    if (this.ended) return;
    this.ended = true;
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
