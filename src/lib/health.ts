// src/lib/health.ts
import { invokeAgentCore } from "@/lib/langgraphProxyFetch";

async function checkAgentCoreGraphStatus(): Promise<boolean> {
  try {
    const payload = {
      target: "langgraph_proxy",
      request: { path: "/info", method: "get" },
    };
    const res = await invokeAgentCore({ payload });
    return res.status === 200;
  } catch (e) {
    console.error(e);
    return false;
  }
}

let inFlightHealth: Promise<boolean> | null = null;
export function healthGate(): Promise<boolean> {
  if (!inFlightHealth) inFlightHealth = checkAgentCoreGraphStatus();
  return inFlightHealth;
}
