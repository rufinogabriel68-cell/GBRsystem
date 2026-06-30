"use client";

import { StoreProvider, useStore } from "@/lib/store";
import { ToastProvider } from "@/components/ui";
import { Shell } from "@/components/Shell";

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-accent text-3xl shadow-xl shadow-accent/30">
        🖥️
      </div>
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="dot-pulse h-2 w-2 rounded-full bg-accent" />
        Carregando sistema...
      </div>
    </div>
  );
}

function Gate() {
  const { loading } = useStore();
  if (loading) return <Splash />;
  return <Shell />;
}

export default function Home() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </StoreProvider>
  );
}
