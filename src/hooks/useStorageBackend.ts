import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api";

export type StorageBackend = { key: string; label: string };

const ADMIN_HEADERS = { "x-admin-token": "dev-admin-token" };

export function useStorageBackend() {
  const [selected, setSelected] = useState<string>("local");
  const [pendingConfirm, setPendingConfirm] = useState<null | {
    label: string;
    onYes: () => void;
    onNo: () => void;
  }>(null);

  const { data } = useQuery({
    queryKey: ["storage-backends"],
    queryFn: () =>
      fetch(`${API_BASE_URL}/admin/storage/backends`, { headers: ADMIN_HEADERS })
        .then((r) => r.json() as Promise<{ backends: StorageBackend[] }>),
    staleTime: 60_000,
  });

  const backends: StorageBackend[] = data?.backends ?? [{ key: "local", label: "Local server" }];
  const configuredKeys = new Set(backends.map((b) => b.key));

  function resolveBackend(): Promise<string | null> {
    if (selected === "local" || configuredKeys.has(selected)) {
      return Promise.resolve(selected);
    }
    const label = selected === "gdrive" ? "Google Drive" : selected === "r2" ? "Cloudflare R2" : selected;
    return new Promise((resolve) => {
      setPendingConfirm({
        label,
        onYes: () => { setPendingConfirm(null); resolve("local"); },
        onNo:  () => { setPendingConfirm(null); resolve(null); },
      });
    });
  }

  return { selected, setSelected, backends, configuredKeys, resolveBackend, pendingConfirm };
}
