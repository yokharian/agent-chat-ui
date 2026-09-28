import { validate } from "uuid";
import { Thread } from "@langchain/langgraph-sdk";
import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { createClient } from "./client";

interface ThreadContextType {
  getThreads: () => Promise<Thread[]>;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

function getThreadSearchMetadata(
  assistantId: string,
): { graph_id: string } | { assistant_id: string } {
  if (validate(assistantId)) {
    return { assistant_id: assistantId };
  }
  return { graph_id: assistantId };
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const envAssistantId = process.env.NEXT_PUBLIC_ASSISTANT_ID;

  if (!envApiUrl || !envAssistantId) {
    throw new Error(
      `Missing required configuration. API URL: ${envApiUrl}, Assistant ID: ${envAssistantId}`,
    );
  }

  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    const client = createClient(envApiUrl, undefined, undefined, {
      fetch: authFetch,
    });

    return await client.threads.search({
      metadata: {
        ...getThreadSearchMetadata(envAssistantId),
      },
      limit: 100,
    });
  }, [envApiUrl, envAssistantId]);

  const value = {
    getThreads,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
