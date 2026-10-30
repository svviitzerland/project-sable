import { api } from "./workspace-api";
export type SpeechCredentials = {
  id: string;
  token: string;
  url: string;
  start_offset: number;
  rotate_after: number;
};
/** Browser-to-provider stream; only finalized, ordered batches enter the case API. */
export class SpeechConnection {
  private socket: WebSocket;
  private sent = 0;
  private acknowledged = 0;
  private sequence = 0;
  private saves = Promise.resolve();
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
  ) {
    const url = new URL(credentials.url);
    url.searchParams.set("jwt", credentials.token);
    this.socket = new WebSocket(url);
    this.socket.onopen = () => this.onopen?.();
    this.socket.onerror = () => this.onerror?.();
    this.socket.onclose = () => {
      if (!this.ended) this.onclose?.();
    };
    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.message === "RecognitionStarted")
          this.emit({
            type: "ready",
            start_offset: credentials.start_offset,
            rotate_after: credentials.rotate_after,
          });
        else if (message.message === "AudioAdded")
          this.acknowledged = message.seq_no;
        else if (message.message === "AddPartialTranscript")
          this.partial(message.metadata?.transcript || "");
        else if (message.message === "AddTranscript") {
          const batch = {
            sequence: ++this.sequence,
            results: message.results || [],
          };
          this.saves = this.saves.then(async () => {
            let last: unknown;
            for (let attempt = 0; attempt < 3; attempt++)
              try {
                await api(
                  `/cases/${caseId}/audio-sessions/${credentials.id}/transcripts`,
                  { method: "POST", body: JSON.stringify(batch) },
                );
                this.partial("");
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
              message:
                "Could not save the final transcript. Recording stopped; check the last saved words before restarting.",
            }),
          );
        } else if (message.message === "EndOfTranscript") {
          this.ended = true;
          void this.saves
            .then(() =>
              api(`/cases/${caseId}/audio-sessions/${credentials.id}/stop`, {
                method: "POST",
              }),
            )
            .then(() => {
              if (this.closed) return;
              this.emit({ type: "stopped" });
              this.socket.close();
              this.closed = true;
              this.onclose?.();
            })
            .catch(() =>
              this.emit({
                type: "error",
                message:
                  "Could not finish saving this audio session. Check the last saved words before restarting.",
              }),
            );
        } else if (message.message === "Error")
          this.emit({
            type: "error",
            message:
              "Speech provider reported an error. Check connection settings and quota.",
          });
      } catch {
        this.emit({
          type: "error",
          message: "Could not process the speech provider response.",
        });
      }
    };
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
      if (this.sent - this.acknowledged > 400) {
        this.emit({
          type: "error",
          message:
            "Audio upload cannot keep up. Recording stopped to avoid losing testimony.",
        });
        return;
      }
      this.socket.send(data);
      this.sent++;
      return;
    }
    const message = JSON.parse(data);
    if (message.type === "stop")
      this.socket.send(
        JSON.stringify({ message: "EndOfStream", last_seq_no: this.sent }),
      );
    else
      this.socket.send(
        JSON.stringify({
          message: "StartRecognition",
          audio_format: {
            type: "raw",
            encoding: "pcm_s16le",
            sample_rate: message.sample_rate,
          },
          transcription_config: {
            language: message.language,
            diarization: "speaker",
            enable_partials: true,
            max_delay: 2,
          },
        }),
      );
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
