"use client";

import { useEffect, useState } from "react";

type Health = { status: string; service: string };

export function ApiStatus() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/health", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch(() => setHealth(null));
    return () => controller.abort();
  }, []);

  return <p className="text-sm text-stone-600" role="status">API: {health?.status === "ok" ? "Connected" : "Waiting for backend"}</p>;
}
