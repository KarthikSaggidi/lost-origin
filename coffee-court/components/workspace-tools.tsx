"use client";
import { useMemo, useRef, useState, type RefObject } from "react";
import {
  Printer,
  Upload,
  Download,
  CheckCircle2,
  FileText,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Modal, Field } from "./shared";
import type { Order, State, Booking } from "../lib/domain";
import { DownloadBill, WhatsAppShare } from "./bill-delivery";
import {
  capturePage,
  pageHTML,
  receiptHTML,
  bookingReceiptHTML,
} from "../lib/print-documents";
import {
  pageData,
  csvText,
  readImport,
  planImport,
  importTemplate,
  stableRequestKey,
  kindLabels,
  type DataKind,
  type ImportAction,
} from "../lib/workspace-data";
export function downloadText(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function PrintPreview({
  title,
  business,
  content = "",
  order,
  booking,
  canShare = false,
  close,
}: {
  title: string;
  business: Record<string, any>;
  content?: string;
  order?: Order;
  booking?: Booking;
  canShare?: boolean;
  close: () => void;
}) {
  const [width, setWidth] = useState<58 | 80>(
      business.receiptWidth === 58 ? 58 : 80,
    ),
    [landscape, setLandscape] = useState(false),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const frame = useRef<HTMLIFrameElement>(null);
  const thermal = Boolean(order || booking);
  const html = useMemo(
    () =>
      booking
        ? bookingReceiptHTML(booking, business, width, window.location.origin)
        : order
          ? receiptHTML(order, business, width, window.location.origin)
          : pageHTML(
              content,
              title,
              business,
              landscape,
              window.location.origin,
            ),
    [order, booking, business, width, content, title, landscape],
  );
  const change = (value: string) => {
    setReady(false);
    if (thermal) setWidth(Number(value) as 58 | 80);
    else setLandscape(value === "landscape");
  };
  return (
    <Modal
      title={thermal ? "Thermal receipt preview" : `${title} · Print preview`}
      close={close}
      wide
      className="print-preview-modal"
    >
      <div className="print-controls">
        {(order || booking) && (
          <DownloadBill
            record={(order || booking)!}
            kind={booking ? "booking" : "order"}
          />
        )}
        {canShare && (order || booking) && (
          <WhatsAppShare
            record={(order || booking)!}
            kind={booking ? "booking" : "order"}
          />
        )}
        <Field label={thermal ? "Receipt paper" : "Page layout"}>
          <select
            value={thermal ? width : landscape ? "landscape" : "portrait"}
            onChange={(e) => change(e.target.value)}
          >
            {thermal ? (
              <>
                <option value={80}>80 mm thermal roll</option>
                <option value={58}>58 mm thermal roll</option>
              </>
            ) : (
              <>
                <option value="portrait">A4 portrait</option>
                <option value="landscape">A4 landscape</option>
              </>
            )}
          </select>
        </Field>
        <button
          disabled={!ready}
          className="btn secondary"
          onClick={() =>
            downloadText(
              (booking?.id ||
                order?.id ||
                title.toLowerCase().replaceAll(" ", "-")) + ".html",
              frame.current?.contentDocument
                ? "<!doctype html>" +
                    frame.current.contentDocument.documentElement.outerHTML
                : html,
              "text/html;charset=utf-8",
            )
          }
        >
          <Download size={16} />
          Save printable copy
        </button>
        <button
          className="btn primary"
          disabled={!ready}
          onClick={() => {
            try {
              frame.current?.contentWindow?.focus();
              frame.current?.contentWindow?.print();
            } catch {
              setError(
                "Open the saved printable copy to print from your browser.",
              );
            }
          }}
        >
          <Printer size={16} />
          {thermal ? "Print bill" : "Print / save PDF"}
        </button>
      </div>
      <p className="print-help">
        {thermal
          ? "Select your thermal printer and matching roll width in the print dialog. Use 100% scale and turn off browser headers and footers."
          : "The preview shows the current page. Choose your printer or Save as PDF in the print dialog."}
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <iframe
        key={thermal ? width : landscape ? "landscape" : "portrait"}
        ref={frame}
        className={`print-frame ${thermal ? "thermal-frame" : ""}`}
        title={thermal ? `${width} mm bill preview` : `${title} printable page`}
        srcDoc={html}
        sandbox="allow-same-origin allow-modals"
        onLoad={() => {
          if (thermal) {
            const doc = frame.current?.contentDocument;
            const height = doc?.body.getBoundingClientRect().height || 600;
            const style = doc?.getElementById("paper-size");
            if (style)
              style.textContent = `@page{size:${width}mm ${Math.ceil((height * 25.4) / 96 + 5)}mm;margin:0}`;
          }
          const doc = frame.current?.contentDocument;
          const frameWidth = frame.current?.clientWidth || 800;
          const pageWidth = doc?.body.offsetWidth || frameWidth;
          if (doc && pageWidth > frameWidth - 24)
            doc.body.style.setProperty(
              "--print-preview-scale",
              String((frameWidth - 24) / pageWidth),
            );
          setReady(true);
        }}
      />
    </Modal>
  );
}
function ExportDialog({
  view,
  title,
  data,
  close,
}: {
  view: string;
  title: string;
  data: State;
  close: () => void;
}) {
  const [format, setFormat] = useState("csv");
  const profile = pageData(view, data);
  const name = `lost-origin-${view}-${new Date().toISOString().slice(0, 10)}`;
  return (
    <Modal title={`Export ${title.toLowerCase()}`} close={close}>
      <div className="data-file-summary">
        <FileText size={27} />
        <div>
          <h3>{profile.rows.length} records</h3>
          <p>All records for this module · money fields use integer paise.</p>
        </div>
      </div>
      <Field label="File format">
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="csv">CSV · Excel and other spreadsheets</option>
          <option value="json">JSON · complete structured records</option>
        </select>
      </Field>
      <p className="note">
        For a formatted PDF, use Print and choose Save as PDF. Imports validate
        editable source data and preserve existing financial history.
      </p>
      <button
        className="btn primary full"
        onClick={() => {
          downloadText(
            name + "." + format,
            format === "csv"
              ? profile.rows.length
                ? csvText(profile.rows)
                : csvText([
                    Object.fromEntries(
                      Object.keys(
                        importTemplate(profile.kind, data)[0] || { id: "" },
                      ).map((k) => [k, ""]),
                    ),
                  ]).split("\r\n")[0]
              : JSON.stringify(
                  {
                    format: "lost-origin-data-v1",
                    kind: profile.kind,
                    module: view,
                    exportedAt: new Date().toISOString(),
                    rows: profile.rows,
                  },
                  null,
                  2,
                ),
            format === "csv" ? "text/csv;charset=utf-8" : "application/json",
          );
        }}
      >
        <Download size={16} />
        Download {format.toUpperCase()}
      </button>
    </Modal>
  );
}
function ImportDialog({
  view,
  data,
  act,
  close,
}: {
  view: string;
  data: State;
  act: (
    action: string,
    values: Record<string, any>,
    message?: string,
  ) => Promise<any>;
  close: () => void;
}) {
  const [kind, setKind] = useState<DataKind>(pageData(view, data).kind),
    [fileName, setFileName] = useState(""),
    [source, setSource] = useState(""),
    [plans, setPlans] = useState<ImportAction[]>([]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [results, setResults] = useState<
      Record<number, { status: string; message?: string }>
    >({});
  const input = useRef<HTMLInputElement>(null);
  const review = async (file: File) => {
    setError("");
    setResults({});
    setPlans([]);
    setFileName(file.name);
    if (file.size > 2 * 1024 * 1024) {
      setError("Choose a file smaller than 2 MB.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = readImport(
        text,
        file.name.toLowerCase().endsWith(".json"),
      );
      const selected =
        parsed.kind && Object.hasOwn(kindLabels, parsed.kind)
          ? parsed.kind
          : kind;
      setKind(selected);
      setSource(text);
      setPlans(planImport(selected, parsed.rows, data));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const run = async (retry = false) => {
    setSaving(true);
    setError("");
    for (const plan of plans) {
      if (retry && results[plan.row]?.status !== "Failed") continue;
      if (plan.skip) {
        setResults((current) => ({
          ...current,
          [plan.row]: { status: "Unchanged" },
        }));
        continue;
      }
      setResults((current) => ({
        ...current,
        [plan.row]: { status: "Saving" },
      }));
      try {
        const values = { ...plan.values };
        if (["order", "booking", "expense", "stock"].includes(plan.action))
          values.requestKey = await stableRequestKey(
            kind + "\n" + source + "\n" + plan.row,
          );
        const result = await act(plan.action, values);
        setResults((current) => ({
          ...current,
          [plan.row]: {
            status:
              result?.duplicate || result?.unchanged ? "Unchanged" : "Saved",
          },
        }));
      } catch (e: any) {
        setResults((current) => ({
          ...current,
          [plan.row]: { status: "Failed", message: e.message },
        }));
      }
    }
    setSaving(false);
  };
  const done = Object.values(results).filter((r) =>
    ["Saved", "Unchanged", "Failed"].includes(r.status),
  ).length;
  const failed = Object.values(results).filter(
    (r) => r.status === "Failed",
  ).length;
  return (
    <Modal
      title="Import workspace data"
      close={() => {
        if (!saving) close();
      }}
      wide
      className="import-modal"
    >
      <div className="import-intro">
        <Upload size={24} />
        <div>
          <h3>Choose a file. Review it. Save it.</h3>
          <p>CSV or JSON · up to 100 records · validated before saving</p>
        </div>
      </div>
      <div className="form-grid">
        <Field label="Import data type">
          <select
            disabled={saving}
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as DataKind);
              setPlans([]);
              setResults({});
              setError("");
              setFileName("");
              if (input.current) input.current.value = "";
            }}
          >
            {Object.entries(kindLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="import-template-buttons">
          <span>Start with a template</span>
          <div>
            <button
              disabled={saving}
              className="btn secondary"
              onClick={() =>
                downloadText(
                  `lost-origin-${kind}-template.csv`,
                  csvText(importTemplate(kind, data)),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={14} />
              CSV
            </button>
            <button
              disabled={saving}
              className="btn secondary"
              onClick={() =>
                downloadText(
                  `lost-origin-${kind}-template.json`,
                  JSON.stringify(
                    { kind, rows: importTemplate(kind, data) },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              <Download size={14} />
              JSON
            </button>
          </div>
        </div>
      </div>
      <Field label="Choose CSV or JSON file">
        <input
          ref={input}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          disabled={saving}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void review(file);
          }}
        />
      </Field>
      <p className="note">
        New orders, bookings, stock movements and expenses use the same
        validation and ledgers as manual entries. Existing transaction IDs are
        left unchanged. Inventory quantity exports are treated as physical
        counts; templates use explicit stock movements. Each row saves
        independently, and failed rows can be retried.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {plans.length > 0 && (
        <>
          <div className="import-review-heading">
            <h3>
              Review {plans.length} change{plans.length === 1 ? "" : "s"}
            </h3>
            <span>{fileName}</span>
          </div>
          <div className="import-review">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Action</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.row}>
                    <td>{plan.row}</td>
                    <td>
                      {plan.summary}
                      {results[plan.row]?.message && (
                        <small className="danger-text">
                          {results[plan.row].message}
                        </small>
                      )}
                    </td>
                    <td>
                      <span
                        className={`import-status ${(results[plan.row]?.status || "").toLowerCase()}`}
                      >
                        {results[plan.row]?.status ||
                          (plan.skip ? "No change" : "Ready")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {done > 0 && (
            <p className="import-progress" role="status">
              <CheckCircle2 size={17} />
              {done} of {plans.length} reviewed changes processed
              {failed ? ` · ${failed} need attention` : ""}
            </p>
          )}
          <div className="import-actions">
            {failed > 0 && (
              <button
                disabled={saving}
                className="btn secondary"
                onClick={() => void run(true)}
              >
                Retry failed rows
              </button>
            )}
            <button
              className="btn primary"
              disabled={saving || (done === plans.length && !failed)}
              onClick={() => void run()}
            >
              {saving
                ? "Saving changes…"
                : done === plans.length
                  ? "Import complete"
                  : "Save reviewed changes"}
              <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
export function WorkspaceTools({
  view,
  title,
  data,
  contentRef,
  act,
}: {
  view: string;
  title: string;
  data: State;
  contentRef: RefObject<HTMLElement | null>;
  act: (
    action: string,
    values: Record<string, any>,
    message?: string,
  ) => Promise<any>;
}) {
  const [dialog, setDialog] = useState<"print" | "import" | "export" | null>(
      null,
    ),
    [snapshot, setSnapshot] = useState("");
  return (
    <>
      <div className="workspace-data-toolbar" aria-label="Page tools">
        <span>
          <FileText size={14} />
          {title}
          <small>Page tools</small>
        </span>
        <div>
          <button
            className="btn secondary small"
            onClick={() => {
              if (contentRef.current)
                setSnapshot(capturePage(contentRef.current));
              setDialog("print");
            }}
          >
            <Printer size={15} />
            Print
          </button>
          <button
            className="btn secondary small"
            onClick={() => setDialog("import")}
          >
            <Upload size={15} />
            Import
          </button>
          <button
            className="btn secondary small"
            onClick={() => setDialog("export")}
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>
      {dialog === "print" && (
        <PrintPreview
          title={title}
          business={data.settings.business}
          content={snapshot}
          close={() => setDialog(null)}
        />
      )}{" "}
      {dialog === "import" && (
        <ImportDialog
          view={view}
          data={data}
          act={act}
          close={() => setDialog(null)}
        />
      )}{" "}
      {dialog === "export" && (
        <ExportDialog
          view={view}
          title={title}
          data={data}
          close={() => setDialog(null)}
        />
      )}
    </>
  );
}
