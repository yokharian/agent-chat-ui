import React, { createContext, ReactNode, useContext, useEffect } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import {
  isRemoveUIMessage,
  isUIMessage,
  type RemoveUIMessage,
  type UIMessage,
  uiMessageReducer,
} from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "nuqs";
import { useThreads } from "./Thread";
import {
  
  langGraphProxyFetch,
} from "@/lib/langgraphProxyFetch";
import { toast } from "sonner";
import { healthGate } from "@/lib/health";
export type StateType = { messages: Message[]; ui?: UIMessage[] };

const useTypedStream = useStream<
  StateType,
  {
    UpdateType: {
      messages?: Message[] | Message | string;
      ui?: (UIMessage | RemoveUIMessage)[] | UIMessage | RemoveUIMessage;
      context?: Record<string, unknown>;
    };
    CustomEventType: UIMessage | RemoveUIMessage;
  }
>;

type StreamContextType = ReturnType<typeof useTypedStream>;
const StreamContext = createContext<StreamContextType | undefined>(undefined);

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


const StreamSession = ({
  children,
  assistantId,
}: {
  children: ReactNode;
  assistantId: string;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads } = useThreads();
  const streamValue = useTypedStream({
    assistantId: assistantId,
    threadId: threadId ?? null,
    callerOptions: {
      fetch: langGraphProxyFetch,
    },
    fetchStateHistory: true,
    onCustomEvent: (event, options) => {
      if (isUIMessage(event) || isRemoveUIMessage(event)) {
        options.mutate((prev) => {
          const ui = uiMessageReducer(prev.ui ?? [], event);
          return { ...prev, ui };
        });
      }
    },
    onThreadId: (id) => {
      setThreadId(id);
      // Refetch threads list when thread ID changes.
      // Wait for some seconds before fetching so we're able to get the new thread that was created.
      sleep().then(() => getThreads().then(setThreads).catch(console.error));
    },
  });

  useEffect(() => {
    let mounted = true;
    healthGate().then((ok) => { // ← Usar healthGate en lugar de checkAgentCoreGraphStatus
      if (!mounted) return;
      if (!ok) {
        toast.error("Failed to connect to LangGraph server", {
          description: () => <p>Failed to connect to LangGraph server.</p>,
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
};

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get environment variables
  const envAssistantId: string | undefined =
    process.env.NEXT_PUBLIC_ASSISTANT_ID;

  // ERROR if we: don't have an assistant ID
  if (!envAssistantId) {
    throw new Error(
      `Missing required configuration. Assistant ID: ${envAssistantId}`,
    );
  }
  return <StreamSession assistantId={envAssistantId}>{children}</StreamSession>;
};

// Create a custom hook to use the context
export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;
