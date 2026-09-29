"use client";
import dynamic from "next/dynamic";
import { Thread } from "@/components/thread";
import { StreamProvider } from "@/providers/Stream";
import { ThreadProvider } from "@/providers/Thread";
import { AuthProvider } from "@/providers/Auth";
import { ArtifactProvider } from "@/components/thread/artifact";
import { Toaster } from "@/components/ui/sonner";
import { WelcomeDialog } from "@/components/ui/welcome-dialog";
import React, { useState } from "react";

const Gate = dynamic(() => import("@/components/gate").then((m) => m.Gate), {
  ssr: false,
});

export default function DemoPage(): React.ReactNode {
  const [mode, setMode] = useState<"member" | null>(null);

  const app = (
    <ThreadProvider>
      <StreamProvider>
        <ArtifactProvider>
          <Thread />
        </ArtifactProvider>
      </StreamProvider>
    </ThreadProvider>
  );

  return (
    <AuthProvider>
      <React.Suspense fallback={<div>Loading (layout)...</div>}>
        <Toaster />
        {mode === null ? (
          <WelcomeDialog onStart={() => setMode("member")} />
        ) : (
          <Gate>{app}</Gate>
        )}
      </React.Suspense>
    </AuthProvider>
  );
}
