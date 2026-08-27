import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type DialogKind = "success" | "error" | "info" | "confirm";
type DialogOptions = { kind?: DialogKind; title: string; message: ReactNode; confirmLabel?: string; cancelLabel?: string; dangerous?: boolean; closeOnBackdrop?: boolean };
type DialogState = DialogOptions & { resolve?: (value: boolean) => void };

const DialogContext = createContext<{ confirm: (options: DialogOptions) => Promise<boolean>; show: (options: DialogOptions) => void; close: () => void } | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(); const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback((result = false) => { setDialog((current) => { current?.resolve?.(result); return undefined; }); }, []);
  const confirm = useCallback((options: DialogOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, kind: "confirm", resolve })), []);
  const show = useCallback((options: DialogOptions) => setDialog({ ...options, kind: options.kind ?? "info" }), []);
  useEffect(() => {
    if (!dialog) return; const previous = document.activeElement as HTMLElement | null; const panel = panelRef.current; panel?.querySelector<HTMLElement>("button, a, input")?.focus();
    function keydown(event: KeyboardEvent) { if (event.key === "Escape") close(false); if (event.key === "Tab" && panel) { const focusable = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)")]; if (!focusable.length) return; const first = focusable[0]!; const last = focusable.at(-1)!; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }
    document.addEventListener("keydown", keydown); return () => { document.removeEventListener("keydown", keydown); previous?.focus(); };
  }, [dialog, close]);
  const Icon = dialog?.kind === "success" ? CheckCircle2 : dialog?.kind === "error" ? AlertCircle : Info;
  return <DialogContext.Provider value={{ confirm, show, close }}>{children}{dialog && <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && dialog.closeOnBackdrop !== false && close(false)}><div ref={panelRef} className={`dialog-panel ${dialog.kind ?? "info"}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close" onClick={() => close(false)} aria-label="Close dialog"><X/></button><Icon className="dialog-icon"/><h2 id="dialog-title">{dialog.title}</h2><div className="dialog-message">{dialog.message}</div><div className="dialog-actions">{dialog.kind === "confirm" && <button className="button ghost" onClick={() => close(false)}>{dialog.cancelLabel ?? "Cancel"}</button>}<button className={`button ${dialog.dangerous ? "danger" : "primary"}`} onClick={() => close(true)}>{dialog.confirmLabel ?? (dialog.kind === "confirm" ? "Confirm" : "Close")}</button></div></div></div>}</DialogContext.Provider>;
}

export function useDialog() { const value = useContext(DialogContext); if (!value) throw new Error("useDialog must be used inside DialogProvider"); return value; }
