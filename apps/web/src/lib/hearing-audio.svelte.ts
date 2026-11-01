import { untrack } from "svelte";
import { api } from "./workspace-api";
import { SpeechConnection, type SpeechCredentials } from "./speech-connection";
import { createVoiceTape, createVoiceUploader } from "./voice-tape";

type AudioSession = {
  ws?: SpeechConnection;
  context?: AudioContext;
  stream?: MediaStream;
  node?: AudioWorkletNode;
  source?: AudioNode;
  timeout?: number;
  rotationTimer?: number;
  stopping?: boolean;
  rotating?: boolean;
  buffering?: boolean;
  pending: ArrayBuffer[];
  pendingBytes: number;
  sentBytes: number;
  baseOffset: number;
  finish?: () => void;
};

export function createHearingAudio(
  caseId: () => string | null,
  onError: (message: string) => void,
  hearingId: () => string | null,
  onPartial: (text: string) => void,
) {
  let status = $state<"idle" | "connecting" | "recording" | "stopping">("idle");
  const setStatus = (value: typeof status) => {
    status = value;
  };
  const session = { current: null as AudioSession | null };
  const cleanup = (target = session.current) => {
    if (!target) return;
    if (session.current === target) {
      session.current = null;
      setStatus("idle");
    }
    clearTimeout(target.timeout);
    clearTimeout(target.rotationTimer);
    target.stream?.getTracks().forEach((track) => track.stop());
    target.node?.disconnect();
    target.source?.disconnect();
    if (target.source instanceof AudioBufferSourceNode)
      target.source.onended = null;
    void target.context?.close().catch(() => undefined);
    if (target.ws && target.ws.readyState < WebSocket.CLOSING)
      target.ws.close();
  };
  const stop = () => {
    const s = session.current;
    if (!s || s.stopping) return;
    s.stopping = true;
    setStatus("stopping");
    clearTimeout(s.rotationTimer);
    s.stream?.getTracks().forEach((track) => track.stop());
    s.source?.disconnect();
    // A rotating session must deliver its buffered audio on the new connection
    // before sending the final stop. Its ready handler completes that path.
    if (s.rotating) return;
    if (s.ws?.readyState === WebSocket.OPEN) {
      let finished = false;
      s.finish = () => {
        if (finished || session.current !== s) return;
        finished = true;
        s.node?.disconnect();
        if (s.ws?.readyState === WebSocket.OPEN)
          s.ws.send(JSON.stringify({ type: "stop" }));
      };
      if (s.node) s.node.port.postMessage({ type: "flush" });
      else s.finish();
      clearTimeout(s.timeout);
      s.timeout = window.setTimeout(() => {
        onError(
          "Final transcription timed out. Check the saved transcript for missing final words.",
        );
        cleanup(s);
      }, 25000);
    } else cleanup(s);
  };
  $effect(() => {
    caseId();
    hearingId();
    return () => untrack(() => cleanup());
  });
  async function start(language: string, file?: File) {
    if (!caseId() || session.current) return;
    const s: AudioSession = {
      pending: [],
      pendingBytes: 0,
      sentBytes: 0,
      baseOffset: 0,
    };
    session.current = s;
    setStatus("connecting");
    const active = () => session.current === s;
    const fail = (message: string) => {
      if (active()) onError(message);
      cleanup(s);
    };
    try {
      if (file && file.size > 30 * 1024 * 1024)
        throw new Error("Use a prepared audio file smaller than 30 MB.");
      const context = new AudioContext();
      s.context = context;
      await context.audioWorklet.addModule("/audio/pcm-worklet.js");
      if (!active()) return;
      let source: AudioNode;
      if (file) {
        const buffer = await context.decodeAudioData(await file.arrayBuffer());
        if (!active()) return;
        if (buffer.duration > 1800)
          throw new Error("Prepared audio must be shorter than 30 minutes.");
        const player = context.createBufferSource();
        player.buffer = buffer;
        player.onended = stop;
        source = player;
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        if (!active()) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        s.stream = stream;
        source = context.createMediaStreamSource(stream);
      }
      s.source = source;
      const tape = createVoiceTape(context.sampleRate),
        identify = createVoiceUploader(caseId()!);
      const sendChunk = (data: ArrayBuffer) => {
        if (!active()) return;
        if (s.buffering) {
          s.pending.push(data);
          s.pendingBytes += data.byteLength;
          if (s.pendingBytes > 1024 * 1024)
            fail(
              "Audio reconnection took too long. Recording stopped; check the final saved words before restarting.",
            );
        } else if (s.ws?.readyState === WebSocket.OPEN) {
          if (s.ws.bufferedAmount > 1000000) {
            onError(
              "Audio upload cannot keep up. Recording stopped to avoid losing testimony.",
            );
            stop();
          } else {
            s.ws.send(data);
            s.sentBytes += data.byteLength;
          }
        }
      };
      async function connect() {
        if (!active()) return;
        const currentCaseId = caseId()!;
        const credentials = await api<SpeechCredentials>(
          `/cases/${currentCaseId}/audio-sessions`,
          {
            method: "POST",
            body: JSON.stringify({
              sample_rate: context.sampleRate,
              language,
              authorized: true,
              hearing_id: hearingId(),
              start_offset:
                s.baseOffset + s.sentBytes / (2 * context.sampleRate),
            }),
          },
        );
        if (!active()) {
          await api(
            `/cases/${currentCaseId}/audio-sessions/${credentials.id}/stop`,
            { method: "POST" },
          );
          return;
        }
        const ws = new SpeechConnection(
          currentCaseId,
          credentials,
          onPartial,
          (turns) => {
            for (const turn of turns) {
              const clip = tape.clip(turn.start, turn.end);
              if (clip) identify(turn.id, clip);
            }
          },
        );
        s.ws = ws;
        clearTimeout(s.timeout);
        s.timeout = window.setTimeout(
          () =>
            fail(
              "Audio connection timed out. Check the saved transcript before reconnecting.",
            ),
          30000,
        );
        ws.onopen = () => {
          if (active())
            ws.send(
              JSON.stringify({
                sample_rate: context.sampleRate,
                language,
                authorized: true,
                hearing_id: hearingId(),
                start_offset:
                  s.baseOffset + s.sentBytes / (2 * context.sampleRate),
              }),
            );
        };
        ws.onmessage = async (event) => {
          if (!active() || s.ws !== ws) return;
          try {
            const message = JSON.parse(event.data);
            if (message.type === "ready") {
              clearTimeout(s.timeout);
              const first = !s.node;
              if (first) {
                s.baseOffset = message.start_offset || 0;
                tape.setOrigin(s.baseOffset);
                const node = new AudioWorkletNode(context, "jude-pcm");
                s.node = node;
                node.port.onmessage = (event) => {
                  if (event.data?.type === "flushed") s.finish?.();
                  else {
                    tape.push(event.data);
                    sendChunk(event.data);
                  }
                };
                const silence = context.createGain();
                silence.gain.value = 0;
                source.connect(node);
                node.connect(silence);
                silence.connect(context.destination);
                await context.resume();
                if (!active()) return;
                if (source instanceof AudioBufferSourceNode) source.start();
              }
              s.rotating = false;
              s.buffering = false;
              s.finish = undefined;
              const pending = s.pending;
              s.pending = [];
              s.pendingBytes = 0;
              pending.forEach(sendChunk);
              if (s.stopping) {
                s.finish = () => {
                  s.node?.disconnect();
                  ws.send(JSON.stringify({ type: "stop" }));
                };
                s.node?.port.postMessage({ type: "flush" });
                s.timeout = window.setTimeout(
                  () =>
                    fail(
                      "Final transcription timed out. Check the saved transcript for missing words.",
                    ),
                  25000,
                );
              } else {
                setStatus("recording");
                if (message.rotate_after > 0)
                  s.rotationTimer = window.setTimeout(() => {
                    if (!active() || s.stopping) return;
                    s.rotating = true;
                    s.finish = () => {
                      s.buffering = true;
                      s.finish = undefined;
                      ws.send(JSON.stringify({ type: "stop" }));
                      s.timeout = window.setTimeout(
                        () =>
                          fail(
                            "Audio rotation timed out. Check the saved transcript before restarting.",
                          ),
                        25000,
                      );
                    };
                    s.node?.port.postMessage({
                      type: "flush",
                      continueCapture: true,
                    });
                  }, message.rotate_after * 1000);
              }
            } else if (message.type === "error") fail(message.message);
            else if (message.type === "stopped") {
              clearTimeout(s.timeout);
              if (s.rotating) {
                // The server releases the case lease before closing this socket.
                ws.onclose = () => {
                  if (active())
                    void connect().catch(() =>
                      fail(
                        "Could not reconnect audio. Check the saved transcript before restarting.",
                      ),
                    );
                };
              } else cleanup(s);
            }
          } catch {
            fail("Could not process the audio connection. Please reconnect.");
          }
        };
        ws.onerror = () =>
          fail(
            "Audio connection failed. Saved testimony remains available; check the final words before restarting.",
          );
        ws.onclose = () => {
          if (active() && s.ws === ws)
            fail(
              "Audio connection ended unexpectedly. Check the saved transcript before restarting.",
            );
        };
      }
      await connect();
    } catch (error) {
      fail(
        error instanceof Error
          ? error.message
          : "Audio permission was denied. Allow microphone access and try again.",
      );
    }
  }
  return {
    get status() {
      return status;
    },
    start,
    stop,
  };
}
