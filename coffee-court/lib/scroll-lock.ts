"use client";
import { useEffect } from "react";
let locks = 0;
let release: undefined | (() => void);
function acquire() {
  if (locks++ === 0) {
    const body = document.body;
    const root = document.documentElement;
    const y = window.scrollY;
    const keys = [
      "position",
      "top",
      "left",
      "right",
      "width",
      "overflow",
      "paddingRight",
    ] as const;
    const original = Object.fromEntries(
      keys.map((key) => [key, body.style[key]]),
    );
    const oldFlag = root.dataset.scrollLocked;
    const gutter = Math.max(0, window.innerWidth - root.clientWidth);
    Object.assign(body.style, {
      position: "fixed",
      top: `-${y}px`,
      left: "0",
      right: "0",
      width: "100%",
      overflow: "hidden",
      paddingRight: gutter ? `${gutter}px` : original.paddingRight,
    });
    root.dataset.scrollLocked = "true";
    release = () => {
      Object.assign(body.style, original);
      if (oldFlag === undefined) delete root.dataset.scrollLocked;
      else root.dataset.scrollLocked = oldFlag;
      window.scrollTo({ top: y, behavior: "instant" });
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) {
      release?.();
      release = undefined;
    }
  };
}
export function useScrollLock(locked = true) {
  useEffect(() => {
    if (locked) return acquire();
  }, [locked]);
}
