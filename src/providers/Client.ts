"use client";
import { langGraphProxyFetch } from "@/lib/langgraphProxyFetch";
import { Client } from "@langchain/langgraph-sdk";
import { fetchAuthSession } from "aws-amplify/auth";

const RUNTIME_SESSION_ID_KEY = "runtimeSessionId";
const RUNTIME_SESSION_ID_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

function generateRuntimeSessionId(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  // A hyphenless UUID has 32 characters; we add one more to make it 33.
  const extra = Math.floor(Math.random() * 16).toString(16);
  return uuid + extra;
}

export function getRuntimeSessionId(): string {
  if (typeof window === "undefined") {
    // Server-side (SSG): generate new ID
    return generateRuntimeSessionId();
  }

  try {
    const stored = localStorage.getItem(RUNTIME_SESSION_ID_KEY);
    if (stored) {
      const { id, timestamp } = JSON.parse(stored);
      const now = Date.now();
      const age = now - timestamp;

      // If the ID is less than 6 hours old, reuse it
      if (age < RUNTIME_SESSION_ID_TTL && id && id.length >= 33) {
        return id;
      }
    }
  } catch {
    // If there's an error reading, continue and generate a new one
  }

  // Generate new ID and save it
  const newId = generateRuntimeSessionId();
  try {
    localStorage.setItem(
      RUNTIME_SESSION_ID_KEY,
      JSON.stringify({
        id: newId,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // If saving fails, return the ID anyway
  }

  return newId;
}

export const langGraphSDKClient = new Client({
  callerOptions: {
    fetch: langGraphProxyFetch,
  },
});

async function* parseSSE(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let sepIndex: number;

      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        for (const line of chunk.split("\n")) {
          if (line.startsWith("data:")) {
            yield { data: line.slice(5).trimStart() } as any;
          }
        }
      }
    }

    // Process remaining buffer
    for (const line of buffer.split("\n")) {
      if (line.startsWith("data:")) {
        yield { data: line.slice(5).trimStart() } as any;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function getUserId(): Promise<string> {
  try {
    const { tokens } = await fetchAuthSession();
    const sub = tokens?.idToken?.payload?.sub as string | undefined;
    return sub ?? "default_user";
  } catch {
    return "default_user";
  }
}
async function getAuthInfo(): Promise<{ userId: string; tokens: any }> {
  try {
    const { tokens } = await fetchAuthSession();
    const sub = tokens?.idToken?.payload?.sub as string | undefined;
    const userId = sub ?? "default_user";
    return { userId, tokens };
  } catch {
    return { userId: "default_user", tokens: null };
  }
}

export async function agentCoreRequest(command: { payload?: any }) {
  const { userId, tokens } = await getAuthInfo();
  const runtimeSessionId = getRuntimeSessionId();
  const agentRuntimeArn = process.env.NEXT_PUBLIC_AGENTCORE_RUNTIME_ARN;
  const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION;

  if (!agentRuntimeArn || !awsRegion) {
    throw new Error(
      "Missing NEXT_PUBLIC_AWS_REGION or NEXT_PUBLIC_AGENTCORE_RUNTIME_ARN",
    );
  }

  const jwt = tokens?.accessToken?.toString();
  if (!jwt) {
    throw new Error("User not authenticated. Please sign in.");
  }

  const url = `https://bedrock-agentcore.${awsRegion}.amazonaws.com/runtimes/${encodeURIComponent(agentRuntimeArn)}/invocations?qualifier=DEFAULT`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      "X-Amzn-Trace-Id": runtimeSessionId,
      "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": runtimeSessionId,
    },
    body: JSON.stringify({
      ...command.payload,
      runtimeSessionId: runtimeSessionId,
      userId,
    }),
  });

  const headers = Object.fromEntries(resp.headers.entries());
  const isSSE = resp.headers.get("content-type")?.includes("text/event-stream");

  if (isSSE && resp.body) {
    return {
      status: resp.status,
      headers,
      responseStream: parseSSE(resp.body),
    } as any;
  }

  const text = await resp.text();
  let body: any = text;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {}

  return {
    status: resp.status,
    headers,
    body: body ?? text,
  } as any;
}
