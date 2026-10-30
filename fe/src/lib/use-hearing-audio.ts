"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { wsUrl } from "./workspace-api";

type AudioSession = {
  ws?: WebSocket;
  context?: AudioContext;
  stream?: MediaStream;
  node?: AudioWorkletNode;
  source?: AudioNode;
  timeout?: number;
  stopping?: boolean;
  finish?: () => void;
};

export function useHearingAudio(
  caseId: string | null,
  onError: (message: string) => void,
  hearingId?: string | null,
) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "recording" | "stopping"
  >("idle");
  const session = useRef<AudioSession | null>(null);
  const cleanup = useCallback((target = session.current) => {
    if (!target) return;
    clearTimeout(target.timeout);
    target.stream?.getTracks().forEach((track) => track.stop());
    target.node?.disconnect();
    target.source?.disconnect();
    if (target.source instanceof AudioBufferSourceNode)
      target.source.onended = null;
    void target.context?.close().catch(() => undefined);
    if (target.ws && target.ws.readyState < WebSocket.CLOSING)
      target.ws.close();
    if (session.current === target) {
      session.current = null;
      setStatus("idle");
    }
  }, []);
  const stop = useCallback(() => {
    const s = session.current;
    if (!s || s.stopping) return;
    s.stopping = true;
    s.stream?.getTracks().forEach((track) => track.stop());
    s.source?.disconnect();
    if (s.ws?.readyState === WebSocket.OPEN) {
      setStatus("stopping");
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
  }, [cleanup, onError]);
  useEffect(() => () => cleanup(), [caseId, hearingId, cleanup]);
  async function start(language: string, file?: File) {
    if (!caseId || session.current) return;
    const s: AudioSession = {};
    session.current = s;
    setStatus("connecting");
    const active = () => session.current === s && !s.stopping;
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
      const ws = new WebSocket(wsUrl(`/cases/${caseId}/audio`));
      s.ws = ws;
      s.timeout = window.setTimeout(() => {
        if (active())
          onError(
            "Audio connection timed out. Check the speech service and try again.",
          );
        cleanup(s);
      }, 30000);
      ws.onopen = () => {
        if (active())
          ws.send(
            JSON.stringify({
              sample_rate: context.sampleRate,
              language,
              authorized: true,
              hearing_id: hearingId,
            }),
          );
      };
      ws.onmessage = async (event) => {
        if (session.current !== s) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === "ready" && active()) {
            clearTimeout(s.timeout);
            const node = new AudioWorkletNode(context, "jude-pcm");
            s.node = node;
            node.port.onmessage = (event) => {
              if (session.current !== s) return;
              if (event.data?.type === "flushed") {
                s.finish?.();
                return;
              }
              if (ws.readyState === WebSocket.OPEN) {
                if (ws.bufferedAmount > 1000000) {
                  onError(
                    "Audio upload cannot keep up. Recording stopped to avoid losing testimony.",
                  );
                  stop();
                } else ws.send(event.data);
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
            setStatus("recording");
          } else if (message.type === "error") {
            onError(message.message);
            cleanup(s);
          } else if (message.type === "stopped") cleanup(s);
        } catch {
          if (active())
            onError(
              "Could not process the audio connection. Please reconnect.",
            );
          cleanup(s);
        }
      };
      ws.onerror = () => {
        if (active())
          onError(
            "Could not connect to live transcription. Check the backend and speech credentials.",
          );
        cleanup(s);
      };
      ws.onclose = () => cleanup(s);
    } catch (error) {
      if (active())
        onError(
          error instanceof Error
            ? error.message
            : "Audio permission was denied. Allow microphone access and try again.",
        );
      cleanup(s);
    }
  }
  return { status, start, stop };
}
