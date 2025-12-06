"use client";
// Export Amplify Gen 2 outputs directly for Amplify.configure.
// This guarantees the correct shape (ResourcesConfig/AmplifyOutputs) for the SDK.
// You may also override via NEXT_PUBLIC_* at runtime by calling Amplify.configure again if desired.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import amplifyConfig from "../../amplify/amplify_outputs.json";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import { Thread } from "@/components/thread";
import { StreamProvider } from "@/providers/Stream";
import { ThreadProvider } from "@/providers/Thread";
import { ArtifactProvider } from "@/components/thread/artifact";
import { Toaster } from "@/components/ui/sonner";
import { WelcomeDialog } from "@/components/ui/welcome-dialog";
import React from "react";

Amplify.configure(amplifyConfig);

export default function DemoPage(): React.ReactNode {
  return (
    <React.Suspense fallback={<div>Loading (layout)...</div>}>
      <Toaster />
      <WelcomeDialog>
        <Authenticator initialState={"signUp"}>
          <ThreadProvider>
            <StreamProvider>
              <ArtifactProvider>
                <Thread />
              </ArtifactProvider>
            </StreamProvider>
          </ThreadProvider>
        </Authenticator>
      </WelcomeDialog>
    </React.Suspense>
  );
}
