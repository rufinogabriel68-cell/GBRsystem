"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { State } from "./types";
import { createSeedState } from "./seed";
import type { SafeUser } from "./auth";

export type SaveStatus = "loading" | "saving" | "saved" | "offline" | "error";

type StoreContextValue = {
  state: State;
  user: SafeUser | null;
  loading: boolean;
  saveStatus: SaveStatus;
  update: (fn: (draft: State) => void) => void;
  reload: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const LS_KEY = "gbr_state_v1";

const DEFAULT_USER: SafeUser = {
  id: "default",
  name: "Administrador",
  email: "admin@gbr.os",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => createSeedState());
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");

  const latestRef = useRef<State>(state);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async () => {
    const data = latestRef.current;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota */
    }
    try {
      const res = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("offline");
    }
  }, []);

  const scheduleSave = useCallback(() => {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 650);
  }, [persist]);

  const update = useCallback(
    (fn: (draft: State) => void) => {
      setState((prev) => {
        const next = structuredClone(prev);
        fn(next);
        latestRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      const json = await res.json();
      if (json.data) {
        setState(json.data);
        latestRef.current = json.data;
        if (json.user) setUser(json.user);
        setSaveStatus("saved");
      }
    } catch {
      setSaveStatus("offline");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load & automatic polling sync
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stRes = await fetch("/api/state", { cache: "no-store" });
        if (!stRes.ok) throw new Error();
        const st = await stRes.json();
        if (!alive) return;
        if (st.data) {
          setState(st.data);
          latestRef.current = st.data;
        }
        setUser(st.user || DEFAULT_USER);
        setSaveStatus("saved");
      } catch {
        if (!alive) return;
        try {
          const cached = localStorage.getItem(LS_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as State;
            setState(parsed);
            latestRef.current = parsed;
          }
        } catch {}
        setUser(DEFAULT_USER);
        setSaveStatus("offline");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    // Polling a cada 8 segundos para detectar novas OS abertas no portal público
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const stRes = await fetch("/api/state", { cache: "no-store" });
        if (!stRes.ok) return;
        const st = await stRes.json();
        if (st.data && alive) {
          const cur = latestRef.current;
          // Se chegou nova OS ou mudou contagem de mensagens ou contagem total
          const curOsCount = cur.os ? cur.os.length : 0;
          const newOsCount = st.data.os ? st.data.os.length : 0;
          const curMsgCount = (cur.os || []).reduce((a, o) => a + (o.mensagens?.length || 0), 0);
          const newMsgCount = (st.data.os || []).reduce((a: number, o: any) => a + (o.mensagens?.length || 0), 0);

          if (newOsCount !== curOsCount || newMsgCount !== curMsgCount) {
            setState(st.data);
            latestRef.current = st.data;
          }
        }
      } catch {}
    }, 8000);

    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <StoreContext.Provider
      value={{
        state,
        user: user || DEFAULT_USER,
        loading,
        saveStatus,
        update,
        reload,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
