"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as model from "../lib/pos-bills";
import type { Item, Product } from "../lib/domain";
export default function usePosBills(enabled: boolean, account: string) {
  const [workspace, setWorkspace] = useState<model.PosWorkspace | null>(null),
    [notice, setNotice] = useState("");
  const current = useRef<model.PosWorkspace | null>(null),
    key = `lost-origin:pos-workspace:v1:${encodeURIComponent(account)}`;
  const commit = useCallback(
    (value: model.PosWorkspace) => {
      current.current = value;
      setWorkspace(value);
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        setNotice(
          "Draft recovery is unavailable in this browser. Keep this tab open until these bills are completed.",
        );
      }
      return value;
    },
    [key],
  );
  useEffect(() => {
    if (!enabled || !account) return;
    let disposed = false,
      release: (() => void) | undefined,
      channel: BroadcastChannel | undefined;
    let saved: model.PosWorkspace;
    try {
      const raw = sessionStorage.getItem(key);
      saved = raw
        ? model.restorePosWorkspace(JSON.parse(raw))
        : model.newPosWorkspace();
    } catch {
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) sessionStorage.setItem(`${key}:recovery-backup`, raw);
      } catch {}
      saved = model.newPosWorkspace();
      setNotice(
        "Saved drafts could not be restored. Review this device before starting a replacement bill.",
      );
    }
    const claim = (value: model.PosWorkspace) => {
      if (navigator.locks?.request)
        void navigator.locks
          .request(
            `${key}:${value.id}`,
            { ifAvailable: true },
            async (lock) => {
              if (disposed) return;
              if (!lock) {
                setNotice(
                  "This tab has its own billing workspace; bills in the other tab are separate.",
                );
                claim(model.newPosWorkspace());
                return;
              }
              commit(value);
              await new Promise<void>((resolve) => {
                release = resolve;
              });
            },
          )
          .catch(() => {
            if (!disposed) commit(model.newPosWorkspace());
          });
      else if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(key);
        let taken = false,
          owned = false;
        channel.onmessage = (event) => {
          if (event.data?.workspace !== value.id) return;
          if (event.data.type === "probe" && owned)
            channel?.postMessage({ type: "owned", workspace: value.id });
          if (event.data.type === "owned") taken = true;
        };
        channel.postMessage({ type: "probe", workspace: value.id });
        setTimeout(() => {
          if (disposed) return;
          const selected = taken ? model.newPosWorkspace() : value;
          value = selected;
          owned = true;
          commit(selected);
        }, 120);
      } else commit(value);
    };
    claim(saved);
    return () => {
      disposed = true;
      release?.();
      channel?.close();
    };
  }, [enabled, account, key, commit]);
  const update = useCallback(
    (transform: (state: model.PosWorkspace) => model.PosWorkspace) => {
      if (!current.current) throw new Error("The POS workspace is loading.");
      const next = transform(current.current);
      if (next !== current.current) commit(next);
      return next;
    },
    [commit],
  );
  return {
    workspace,
    notice,
    active: workspace?.bills.find((b) => b.id === workspace.activeId),
    get: (id: string) => {
      if (!current.current) throw new Error("The POS workspace is loading.");
      return model.posBill(current.current, id);
    },
    addItems: (id: string, items: Item[]) =>
      update((s) => model.addPosItems(s, id, items)),
    fields: (id: string, patch: Partial<model.PosFields>) =>
      update((s) => model.changePosFields(s, id, patch)),
    rename: (id: string, label: string) =>
      update((s) => model.renamePosBill(s, id, label)),
    adjust: (id: string, index: number, delta: number) =>
      update((s) => model.adjustPosItem(s, id, index, delta)),
    newBill: () => update(model.addPosBill),
    select: (id: string) => update((s) => model.selectPosBill(s, id)),
    clear: (id: string) => update((s) => model.clearPosBill(s, id)),
    close: (id: string) => update((s) => model.closePosBill(s, id)),
    complete: (id: string) => update((s) => model.finishPosBill(s, id)),
    fail: (id: string, definitive: boolean) =>
      update((s) => model.failPosBilling(s, id, definitive)),
    begin: (id: string) => {
      if (!current.current) throw new Error("The POS workspace is loading.");
      const result = model.beginPosBilling(current.current, id);
      commit(result.state);
      return result;
    },
    reprice: useCallback(
      (products: Product[]) =>
        update((s) => model.repricePosBills(s, products)),
      [update],
    ),
  };
}
