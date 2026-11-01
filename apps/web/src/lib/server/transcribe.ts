import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import type { Runtime } from "./runtime";

/**
 * Presigned Amazon Transcribe streaming WebSocket URL. The browser connects directly with
 * it; the server's AWS credentials (instance role) never leave the server. The signature
 * is valid for five minutes to open the connection; one stream can then last four hours.
 */
export const TRANSCRIBE_MAX_SECONDS = 4 * 60 * 60;

export async function transcribeUrl(
  rt: Runtime,
  options: { language: "id" | "en"; sampleRate: number },
) {
  const region = rt.config.awsRegion;
  const hostname = `transcribestreaming.${region}.amazonaws.com`;
  const signer = new SignatureV4({
    service: "transcribe",
    region,
    credentials: rt.awsCredentials ?? defaultProvider(),
    sha256: Sha256,
  });
  const signed = await signer.presign(
    {
      method: "GET",
      protocol: "wss:",
      hostname,
      port: 8443,
      path: "/stream-transcription-websocket",
      headers: { host: `${hostname}:8443` },
      query: {
        "language-code": options.language === "id" ? "id-ID" : "en-US",
        "media-encoding": "pcm",
        "sample-rate": String(options.sampleRate),
        "show-speaker-label": "true",
        "enable-partial-results-stabilization": "true",
        "partial-results-stability": "medium",
      },
    },
    { expiresIn: 300 },
  );
  const url = new URL(`wss://${hostname}:8443${signed.path}`);
  for (const [key, value] of Object.entries(signed.query ?? {}))
    url.searchParams.set(
      key,
      Array.isArray(value) ? value.join(",") : String(value),
    );
  return url.href;
}
