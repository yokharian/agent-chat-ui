import { agentCoreRequest } from "@/providers/Client";

const textDecoder = new TextDecoder();

export type StreamCallbacks = {
  onMessage?: (data: string) => void;
  onError?: (err: any) => void;
  onEnd?: () => void;
};

export type InvocationRequest = {
  // Opaque payload we send to AgentCore; typically contains the proxied HTTP request
  payload: any;
  // If true, expect a streaming response (token/event stream)
  stream?: boolean;
};

export type InvocationResponse = {
  // Decoded JSON body from AgentCore (non-stream)
  body?: any;
  // Optional raw text
  text?: string;
  // HTTP-like status code if provided by your AgentCore backend
  status?: number;
  // Headers map if provided
  headers?: Record<string, string>;
};

function headersToObject(
  headers: HeadersInit | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    headers.forEach((v, k) => (out[k] = v));
    return out;
  }
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) out[k] = v as string;
    return out;
  }
  return { ...(headers as Record<string, string>) };
}

function tryDecodeChunk(ev: any): string | null {
  // Try common fields where the SDK places text chunks
  const fields = ["bytes", "chunk", "data", "message"];
  for (const f of fields) {
    const v = ev?.[f];
    if (!v) continue;
    if (typeof v === "string") return v;
    if (v instanceof Uint8Array) return textDecoder.decode(v);
    if (Array.isArray(v)) {
      try {
        return textDecoder.decode(new Uint8Array(v));
      } catch {
        // ignore
      }
    }
  }
  return null;
}

async function readBody(init?: RequestInit): Promise<any> {
  if (!init?.body) return undefined;
  const ct =
    typeof init.headers === "object" && init.headers
      ? headersToObject(init.headers)["content-type"] ||
        headersToObject(init.headers)["Content-Type"]
      : undefined;
  if (typeof init.body === "string") {
    if (ct && ct.includes("application/json")) {
      try {
        return JSON.parse(init.body);
      } catch {
        return init.body;
      }
    }
    return init.body;
  }
  try {
    // @ts-ignore
    if (init.body?.text) {
      // @ts-ignore
      return await init.body.text();
    }
  } catch {}
  return undefined;
}

function extractPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

function isSseRequest(headers: Record<string, string>, url: string): boolean {
  return (
    headers["accept"]?.includes("text/event-stream") ||
    headers["Accept"]?.includes("text/event-stream") ||
    url.includes("/events") ||
    url.includes("/stream")
  );
}

async function buildPayload(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{
  payload: any;
  isSse: boolean;
}> {
  const url = typeof input === "string" ? input : (input as URL).toString();
  const method = init?.method ?? "GET";
  const headers = headersToObject(init?.headers);
  const body = await readBody(init);
  const path = extractPath(url);

  const payload = {
    target: "langgraph_proxy",
    request: {
      path,
      method,
      headers,
      body,
    },
  };

  return { payload, isSse: isSseRequest(headers, url) };
}

export async function invokeAgentCore(
  req: InvocationRequest,
): Promise<InvocationResponse> {
  const res: any = await agentCoreRequest({
    payload: req.payload,
  });

  // Some event-stream APIs return a stream even for small replies
  if (
    res?.responseStream &&
    typeof res.responseStream[Symbol.asyncIterator] === "function"
  ) {
    let text = "";
    for await (const chunk of res.responseStream as AsyncIterable<any>) {
      const str = tryDecodeChunk(chunk);
      if (str) text += str;
    }
    try {
      return { body: JSON.parse(text), text };
    } catch {
      return { text };
    }
  }

  return res;
}

export async function invokeAgentCoreStream(
  req: InvocationRequest,
  cbs: StreamCallbacks,
): Promise<() => void> {
  let aborted = false;
  try {
    const res: any = await agentCoreRequest({
      payload: req.payload,
    });

    const stream: AsyncIterable<any> | undefined = (res as any)?.responseStream;
    if (!stream || typeof stream[Symbol.asyncIterator] !== "function") {
      // Try to interpret non-stream response as single message
      let text: string;
      if (res?.body !== undefined) {
        text =
          typeof res.body === "string" ? res.body : JSON.stringify(res.body);
      } else {
        text = JSON.stringify(res);
      }
      cbs.onMessage?.(text);
      cbs.onEnd?.();
      return () => {
        aborted = true;
      };
    }

    (async () => {
      try {
        for await (const event of stream) {
          if (aborted) break;
          const msg = tryDecodeChunk(event);
          if (msg != null) {
            cbs.onMessage?.(msg);
          }
        }
        if (!aborted) {
          cbs.onEnd?.();
        }
      } catch (err) {
        if (!aborted) {
          cbs.onError?.(err);
        }
      }
    })();

    return () => {
      aborted = true;
      // The AWS SDK stream doesn’t expose an explicit cancel here.
      // We flip a flag; underlying HTTP/2 will finish soon after.
    };
  } catch (err) {
    cbs.onError?.(err);
    return () => {
      aborted = true;
    };
  }
}

function createLangGraphProxyFetch() {
  return async function proxyFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const { payload, isSse } = await buildPayload(input, init);

    if (isSse) {
      let cancel: (() => void) | null = null;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          invokeAgentCoreStream(
            { payload, stream: true },
            {
              onMessage: (msg) => {
                try {
                  // Ensure the message is a valid string for SSE
                  let data: string;
                  if (typeof msg === "string") {
                    // If it's already a string, check if it's valid JSON
                    try {
                      JSON.parse(msg);
                      data = msg; // Valid JSON, use directly
                    } catch {
                      // Not JSON, serialize it
                      data = JSON.stringify(msg);
                    }
                  } else {
                    // If it's an object or other type, serialize it
                    data = JSON.stringify(msg);
                  }
                  const sse = `data: ${data}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sse));
                } catch (err) {
                  // If there's an error processing the message, send it as an error
                  const errorData = JSON.stringify({
                    error: "Failed to process message",
                    message: String(err),
                  });
                  controller.enqueue(
                    new TextEncoder().encode(
                      `event: error\ndata: ${errorData}\n\n`,
                    ),
                  );
                }
              },
              onError: (err) => {
                try {
                  const errorData = JSON.stringify({
                    message: String(err?.message ?? err),
                    error: err,
                  });
                  const sse = `event: error\ndata: ${errorData}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sse));
                } catch {
                  // Fallback if error cannot be serialized
                  const sse = `event: error\ndata: ${JSON.stringify({
                    message: "Unknown error occurred",
                  })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sse));
                } finally {
                  controller.close();
                }
              },
              onEnd: () => {
                controller.close();
              },
            },
          )
            .then((c) => (cancel = c))
            .catch((err) => {
              // Handle errors during stream initialization
              const errorData = JSON.stringify({
                message: String(err?.message ?? err),
              });
              controller.enqueue(
                new TextEncoder().encode(
                  `event: error\ndata: ${errorData}\n\n`,
                ),
              );
              controller.close();
            });

          if (init?.signal) {
            init.signal.addEventListener("abort", () => {
              cancel?.();
              controller.close();
            });
          }
        },
        cancel() {
          cancel?.();
        },
      });

      return new Response(stream as any, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no", // Disable buffering in nginx if present
        },
      });
    }

    const res = await invokeAgentCore({ payload });

    // Serialize body to JSON string so the SDK can call .json()
    let bodyText: string;
    if (res.body !== undefined) {
      bodyText =
        typeof res.body === "string" ? res.body : JSON.stringify(res.body);
    } else if (res.text !== undefined) {
      bodyText = res.text;
    } else {
      bodyText = "";
    }

    return new Response(bodyText, {
      status: res.status ?? 200,
      headers: new Headers(
        res.headers ?? { "Content-Type": "application/json" },
      ),
    });
  };
}

export const langGraphProxyFetch = createLangGraphProxyFetch();
