import { Client } from "@langchain/langgraph-sdk";

export function createClient(
  apiUrl: string,
  apiKey: string | undefined,
  authScheme: string | undefined,
  callerOptions?: {
    fetch?: typeof fetch;
  },
) {
  return new Client({
    apiKey,
    apiUrl,
    callerOptions,
    ...(authScheme && {
      defaultHeaders: {
        "X-Auth-Scheme": authScheme,
      },
    }),
  });
}
