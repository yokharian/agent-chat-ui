import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
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
import { authFetch } from "@/lib/auth-fetch";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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

async function checkGraphStatus(apiUrl: string): Promise<boolean> {
  try {
    const response = await authFetch(`${apiUrl}/info`);

    return response.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}

type StreamContextType = ReturnType<typeof useTypedStream> & {
  apiUrl: string;
};
const StreamContext = createContext<StreamContextType | undefined>(undefined);

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const StreamSession = ({
  children,
  apiUrl,
  assistantId,
}: {
  children: ReactNode;
  apiUrl: string;
  assistantId: string;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads } = useThreads();

  const streamValue = useTypedStream({
    apiUrl,
    assistantId,
    // Auth for every SDK request: the Client routes HTTP calls and the SSE
    // run stream through asyncCaller.fetch, so this covers both channels.
    callerOptions: { fetch: authFetch },
    threadId: threadId ?? null,
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
    checkGraphStatus(apiUrl).then((ok) => {
      if (!ok) {
        toast.error("Failed to connect to LangGraph server", {
          description: () => (
            <p>
              Please ensure your graph is running at <code>{apiUrl}</code>.
            </p>
          ),
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
  }, [apiUrl]);

  return (
    <StreamContext.Provider
      value={{
        ...streamValue,
        apiUrl,
      }}
    >
      {children}
    </StreamContext.Provider>
  );
};

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Get environment variables
  const envApiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL;
  const envAssistantId: string | undefined =
    process.env.NEXT_PUBLIC_ASSISTANT_ID;

  // Welcome dialog visibility
  const [showWelcome, setShowWelcome] = useState(true);

  // ERROR if we: don't have an API URL, or don't have an assistant ID
  if (!envApiUrl || !envAssistantId) {
    throw new Error(
      `Missing required configuration. API URL: ${envApiUrl}, Assistant ID: ${envAssistantId}`,
    );
  }

  // display welcome dialog
  if (showWelcome) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-4">
        <div className="animate-in fade-in-0 zoom-in-95 bg-background flex max-w-3xl flex-col rounded-lg border shadow-lg">
          <div className="mt-14 flex flex-col gap-2 border-b p-6">
            <div className="flex flex-col items-start gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Agent Chat
              </h1>
            </div>
            <p className="text-muted-foreground">Welcome to my Agent Chat!</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowWelcome(false);
            }}
            className="bg-muted/50 flex flex-col gap-6 p-6"
          >
            <div className="mt-2 flex justify-end">
              <Button
                type="submit"
                size="lg"
              >
                Start
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <StreamSession
      apiUrl={envApiUrl}
      assistantId={envAssistantId}
    >
      {children}
    </StreamSession>
  );
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
