import {
  activeSchool,
  emptyStore,
  mapActiveSchool,
  type School,
  type Store,
} from "@gita/domain";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadStore, saveStore } from "./persistence";

type StoreApi = {
  ready: boolean;
  error: string | null;
  store: Store;
  school: School | null;
  tableWeek: number;
  setTableWeek: (week: number) => void;
  updateStore: (recipe: (store: Store) => Store) => void;
  updateSchool: (recipe: (school: School) => School) => void;
  adoptStore: (store: Store) => void;
};

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [holdSave, setHoldSave] = useState(false);
  const [tableWeeks, setTableWeeks] = useState<Record<string, number>>({});
  const hydrated = useRef(false);

  useEffect(() => {
    let live = true;
    loadStore()
      .then((next) => {
        if (!live) return;
        setStore(next);
        setReady(true);
      })
      .catch((reason: unknown) => {
        if (!live) return;
        setError(reason instanceof Error ? `${reason.message} Dosya değiştirilmedi.` : "Kayıt okunamadı.");
        setHoldSave(true);
        setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || holdSave) return;
    if (!hydrated.current) {
      hydrated.current = true;
      void saveStore(store).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Kayıt yazılamadı");
      });
      return;
    }
    void saveStore(store).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Kayıt yazılamadı");
    });
  }, [store, ready, holdSave]);

  const school = activeSchool(store);
  const tableWeek = school
    ? Math.min(Math.max(0, tableWeeks[school.id] ?? 0), Math.max(0, school.weekCount - 1))
    : 0;

  const api = useMemo<StoreApi>(
    () => ({
      ready,
      error,
      store,
      school,
      tableWeek,
      setTableWeek: (week) => {
        if (!school) return;
        const max = Math.max(0, school.weekCount - 1);
        const next = Math.min(Math.max(0, Math.round(week)), max);
        setTableWeeks((current) => ({ ...current, [school.id]: next }));
      },
      updateStore: (recipe) => {
        setHoldSave(false);
        setStore((current) => recipe(current));
      },
      updateSchool: (recipe) => {
        setHoldSave(false);
        setStore((current) => mapActiveSchool(current, recipe));
      },
      adoptStore: (next) => {
        setHoldSave(false);
        setError(null);
        setStore(next);
      },
    }),
    [ready, error, store, school, tableWeek],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useGita(): StoreApi {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Kayıt sağlayıcısı yok");
  return value;
}
