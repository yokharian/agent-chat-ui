import { validate } from "uuid";
import {
  createContext,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useState,
} from "react";
import { langGraphSDKClient } from "@/providers/Client";
import { Thread } from "@langchain/langgraph-sdk";

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
  } else {
    return { graph_id: assistantId };
  }
}

export function ThreadProvider({ children }: { children: ReactNode }) {
  // Get environment variables
  const envRuntimeArn: string | undefined =
    process.env.NEXT_PUBLIC_AGENTCORE_RUNTIME_ARN;
  const envAssistantId: string | undefined =
    process.env.NEXT_PUBLIC_ASSISTANT_ID;

  // ERROR if we: don't have an Runtime Arn, or don't have an assistant ID
  if (!envRuntimeArn || !envAssistantId) {
    throw new Error(
      `Missing required configuration. Runtime Arn: ${envRuntimeArn}, Assistant ID: ${envAssistantId}`,
    );
  }

  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    if (!envRuntimeArn || !envAssistantId) return [];
    const threads = await langGraphSDKClient.threads.search({
      metadata: {
        ...getThreadSearchMetadata(envAssistantId),
      },
      limit: 100,
    });
    console.log(threads);
    return threads;
  }, [envRuntimeArn, envAssistantId]);

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
