"use client";
import {
  useRef,
  useEffect,
  useId,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { useScrollLock } from "../lib/scroll-lock";
export function Modal({
  title,
  children,
  close,
  wide = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useScrollLock();
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={`modal ${wide ? "wide" : ""} ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="modal-top">
        <h2 id={id}>{title}</h2>
        <button className="icon-btn" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  const control =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "select", "textarea"].includes(children.type);
  return (
    <div className="field">
      {control ? (
        <label htmlFor={id}>{label}</label>
      ) : (
        <span id={id}>{label}</span>
      )}
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<any>,
            control ? { id } : { role: "group", "aria-labelledby": id },
          )
        : children}
    </div>
  );
}
