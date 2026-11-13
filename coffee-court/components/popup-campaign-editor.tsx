"use client";
import { authFetch } from "../lib/client-auth";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Download,
  Eye,
  ImagePlus,
  Plus,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Field } from "./shared";
import { downloadText } from "./workspace-tools";
import { csvText } from "../lib/workspace-data";
import { todayIST, type State } from "../lib/domain";
import {
  defaultPopupCampaign,
  popupCampaign,
  popupCampaignStatus,
  type PopupCampaign,
} from "../lib/popup-campaign";
import { PopupCampaignDialog } from "./popup-campaign";

const inputTime = (value: string) =>
  value
    ? new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
        .format(new Date(value))
        .replace(" ", "T")
    : "";
const savedTime = (value: string) =>
  value ? new Date(`${value}:00+05:30`).toISOString() : "";
export default function PopupCampaignEditor({
  data,
  act,
  busy,
}: {
  data: State;
  act: any;
  busy: boolean;
}) {
  const saved = popupCampaign(data),
    savedKey = JSON.stringify(saved);
  const [form, setForm] = useState(saved),
    [tab, setTab] = useState("Content"),
    [preview, setPreview] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false),
    [dirtyState, setDirtyState] = useState(false);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setForm(saved);
  }, [savedKey]);
  const update = (value: Partial<PopupCampaign>) => {
    dirty.current = true;
    setDirtyState(true);
    setSuccess(false);
    setForm((current) => ({ ...current, ...value }));
  };
  const updateField = (id: string, value: any) =>
    update({
      fields: form.fields.map((field) =>
        field.id === id ? { ...field, ...value } : field,
      ),
    });
  const upload = async (file?: File) => {
    if (!file) return;
    setError("");
    if (
      !/^image\/(png|jpeg|webp)$/.test(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPG, PNG or WebP image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const payload = new FormData();
      payload.append("image", file);
      const response = await authFetch("/api/v1/media", {
        method: "POST",
        body: payload,
      });
      if (!response.headers.get("content-type")?.includes("application/json"))
        throw new Error(
          response.status === 413
            ? "The image is too large. Choose an image smaller than 5 MB."
            : "The image could not be uploaded. Please try again.",
        );
      const result = (await response.json()) as {
        image: string;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Image upload failed.");
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () =>
          reject(new Error("This image cannot be displayed."));
        image.src = result.image;
      });
      update({ image: result.image, imageAlt: form.imageAlt || form.title });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <>
      <section className="panel popup-campaign-editor">
        <div className="panel-heading">
          <div>
            <h2>Popup campaign</h2>
            <p>
              Welcome visitors with an image, an offer or a registration form.
            </p>
          </div>
          <span
            className={`campaign-state ${popupCampaignStatus(saved) === "Live" ? "enabled" : ""}`}
          >
            {popupCampaignStatus(saved)}
          </span>
        </div>
        <div className="popup-editor-toolbar">
          <label className="check-field">
            <input
              type="checkbox"
              role="switch"
              checked={form.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            <span>Enable popup campaign</span>
          </label>
          <div>
            <button
              className="btn secondary small"
              type="button"
              disabled={uploading || !form.title.trim()}
              onClick={() => setPreview(true)}
            >
              <Eye size={16} />
              Preview popup
            </button>
            <button
              className="text-btn"
              type="button"
              onClick={() => {
                update({
                  ...structuredClone(defaultPopupCampaign),
                  campaignId: `popup-${crypto.randomUUID()}`,
                });
                setTab("Content");
              }}
            >
              <Plus size={15} />
              New popup draft
            </button>
          </div>
        </div>
        <div
          className="popup-editor-tabs"
          role="group"
          aria-label="Popup settings"
        >
          {["Content", "Display", "Registration"].map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={tab === name}
              className={tab === name ? "active" : ""}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            try {
              await act(
                "popupCampaign",
                { value: form },
                "Popup campaign saved",
              );
              dirty.current = false;
              setDirtyState(false);
              setSuccess(true);
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          {tab === "Content" && (
            <div className="popup-content-grid">
              <div>
                <Field label="Popup title">
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.title}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </Field>
                <Field label="Popup description">
                  <textarea
                    rows={4}
                    maxLength={700}
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Button text">
                    <input
                      required
                      minLength={2}
                      maxLength={40}
                      value={form.buttonLabel}
                      onChange={(e) => update({ buttonLabel: e.target.value })}
                    />
                  </Field>
                  {!form.registrationEnabled && (
                    <Field label="Button destination">
                      <select
                        value={form.target}
                        onChange={(e) =>
                          update({ target: e.target.value as "menu" | "book" })
                        }
                      >
                        <option value="menu">Our menu</option>
                        <option value="book">Book a court</option>
                      </select>
                    </Field>
                  )}
                </div>
                <Field label="Confirmation message">
                  <textarea
                    rows={2}
                    required
                    minLength={2}
                    maxLength={300}
                    value={form.successMessage}
                    onChange={(e) => update({ successMessage: e.target.value })}
                  />
                </Field>
              </div>
              <div className="popup-upload-panel">
                {form.image ? (
                  <img
                    src={form.image}
                    alt={form.imageAlt || "Popup image preview"}
                  />
                ) : (
                  <div className="popup-image-empty">
                    <ImagePlus size={35} strokeWidth={1.3} />
                    <p>Add your campaign image</p>
                    <small>JPG, PNG or WebP · up to 5 MB</small>
                  </div>
                )}
                <div className="popup-upload-actions">
                  <label className="btn secondary">
                    <Upload size={16} />
                    {uploading
                      ? "Uploading…"
                      : form.image
                        ? "Replace image"
                        : "Upload image"}
                    <input
                      className="visually-hidden"
                      aria-label="Upload image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploading}
                      onChange={(e) => {
                        void upload(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {form.image && (
                    <button
                      className="icon-btn bordered"
                      type="button"
                      aria-label="Remove popup image"
                      disabled={uploading}
                      onClick={() => update({ image: "", imageAlt: "" })}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <Field label="Popup image description">
                  <input
                    maxLength={180}
                    required={Boolean(form.image)}
                    value={form.imageAlt}
                    onChange={(e) => update({ imageAlt: e.target.value })}
                    placeholder="Describe the image"
                  />
                </Field>
              </div>
            </div>
          )}
          {tab === "Display" && (
            <div className="popup-display-fields">
              <div className="form-grid">
                <Field label="Show after (seconds)">
                  <input
                    type="number"
                    required
                    min={0}
                    max={60}
                    value={form.delaySeconds}
                    onChange={(e) =>
                      update({ delaySeconds: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Display frequency">
                  <select
                    value={form.frequency}
                    onChange={(e) =>
                      update({
                        frequency: e.target.value as PopupCampaign["frequency"],
                      })
                    }
                  >
                    <option value="session">Once per browser session</option>
                    <option value="daily">Once per day</option>
                    <option value="always">Every page visit</option>
                  </select>
                </Field>
              </div>
              <Field label="Show on pages">
                <div className="popup-page-options">
                  {[
                    ["home", "Home"],
                    ["menu", "Our menu"],
                    ["book", "Court booking"],
                    ["track", "My orders"],
                  ].map(([value, label]) => (
                    <label className="check-field" key={value}>
                      <input
                        type="checkbox"
                        checked={form.pages.includes(value as any)}
                        onChange={(e) =>
                          update({
                            pages: e.target.checked
                              ? [...form.pages, value as any]
                              : form.pages.filter((page) => page !== value),
                          })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </Field>
              <div className="form-grid">
                <Field label="Starts at (IST, optional)">
                  <input
                    type="datetime-local"
                    value={inputTime(form.startAt)}
                    onChange={(e) =>
                      update({ startAt: savedTime(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Ends at (IST, optional)">
                  <input
                    type="datetime-local"
                    value={inputTime(form.endAt)}
                    onChange={(e) =>
                      update({ endAt: savedTime(e.target.value) })
                    }
                  />
                </Field>
              </div>
              <p className="note">
                Leave dates blank to run whenever enabled. Popups wait until
                other dialogs are closed.
              </p>
            </div>
          )}
          {tab === "Registration" && (
            <div className="popup-registration-settings">
              <label className="check-field">
                <input
                  type="checkbox"
                  role="switch"
                  checked={form.registrationEnabled}
                  onChange={(e) =>
                    update({ registrationEnabled: e.target.checked })
                  }
                />
                <span>Collect registration details</span>
              </label>
              <p className="note">
                Choose the fields visitors see. Required fields must be
                completed before registration. Turn collection off to show a
                simple image and button.
              </p>
              {form.fields.map((field) => (
                <div className="popup-field-editor" key={field.id}>
                  <Field label="Field label">
                    <input
                      aria-label={`${field.id} field label`}
                      maxLength={80}
                      required
                      value={field.label}
                      onChange={(e) =>
                        updateField(field.id, { label: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Field type">
                    <select
                      aria-label={`${field.id} field type`}
                      value={field.type}
                      onChange={(e) =>
                        updateField(field.id, { type: e.target.value })
                      }
                    >
                      <option value="text">Text</option>
                      <option value="tel">Contact number</option>
                      <option value="email">Email</option>
                    </select>
                  </Field>
                  <div className="popup-field-options">
                    <label className="check-field">
                      <input
                        aria-label={`Show ${field.label}`}
                        type="checkbox"
                        checked={field.enabled}
                        onChange={(e) =>
                          updateField(field.id, { enabled: e.target.checked })
                        }
                      />
                      <span>Show</span>
                    </label>
                    <label className="check-field">
                      <input
                        aria-label={`Require ${field.label}`}
                        type="checkbox"
                        disabled={!field.enabled}
                        checked={field.required}
                        onChange={(e) =>
                          updateField(field.id, { required: e.target.checked })
                        }
                      />
                      <span>Required</span>
                    </label>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${field.label} field`}
                      onClick={() =>
                        update({
                          fields: form.fields.filter(
                            (item) => item.id !== field.id,
                          ),
                        })
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="btn secondary"
                type="button"
                disabled={form.fields.length >= 8}
                onClick={() =>
                  update({
                    fields: [
                      ...form.fields,
                      {
                        id: `field-${crypto.randomUUID().slice(0, 8)}`,
                        label: "Additional details",
                        type: "text",
                        enabled: true,
                        required: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add registration field
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="popup-editor-save">
            <button
              className="btn primary"
              disabled={busy || uploading}
              type="submit"
            >
              {busy ? "Saving…" : success ? "Saved" : "Save popup campaign"}
              <Check size={16} />
            </button>
            <span>
              {uploading
                ? "Image upload in progress"
                : dirtyState
                  ? "Unsaved changes"
                  : "Saved settings control the website popup"}
            </span>
          </div>
        </form>
        {preview && (
          <PopupCampaignDialog
            key={form.campaignId}
            campaign={form}
            preview
            close={() => setPreview(false)}
            navigate={() => {}}
          />
        )}
      </section>
      <CampaignRegistrations data={data} act={act} busy={busy} />
    </>
  );
}

function CampaignRegistrations({
  data,
  act,
  busy,
}: {
  data: State;
  act: any;
  busy: boolean;
}) {
  const [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState("");
  const all = data.registrations || [];
  const rows = all.filter((entry) => {
    const date = todayIST(new Date(entry.createdAt));
    return (
      (!status || entry.status === status) &&
      (!from || date >= from) &&
      (!to || date <= to) &&
      [
        entry.id,
        entry.name,
        entry.phone,
        entry.email,
        entry.campaignTitle,
        ...Object.values(entry.answers),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase().trim())
    );
  });
  const key = [query, status, from, to].join("|");
  useEffect(() => setPage(0), [key]);
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  return (
    <section className="panel campaign-registration-panel">
      <div className="panel-heading">
        <div>
          <h2>Campaign registrations</h2>
          <p>
            Customer details, campaign context and follow-up status in one
            place.
          </p>
        </div>
        <button
          className="btn secondary"
          disabled={!rows.length}
          onClick={() =>
            downloadText(
              "lost-origin-campaign-registrations.csv",
              csvText(
                rows.map((entry) => ({
                  reference: entry.id,
                  campaign: entry.campaignTitle,
                  name: entry.name,
                  phone: entry.phone,
                  email: entry.email,
                  status: entry.status,
                  created_at: entry.createdAt,
                  details: Object.entries(entry.answers)
                    .map(
                      ([id, value]) =>
                        `${entry.fieldLabels[id] || id}: ${value}`,
                    )
                    .join("; "),
                })),
              ),
              "text/csv;charset=utf-8",
            )
          }
        >
          <Download size={16} />
          Export registrations
        </button>
      </div>
      <div className="campaign-registration-stats">
        <span>
          <Users size={17} />
          {all.length} total registrations
        </span>
        <span>
          {all.filter((entry) => entry.status === "New").length} awaiting
          contact
        </span>
      </div>
      <div className="campaign-registration-filters">
        <Field label="Find a registration">
          <input
            type="search"
            placeholder="Name, contact or campaign…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label="Registration status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["New", "Contacted", "Closed"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </Field>
        <Field label="Registered from">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Registered to">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div
        className="campaign-registration-table"
        tabIndex={0}
        role="region"
        aria-label="Campaign registration records"
      >
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Campaign</th>
              <th>Registration details</th>
              <th>Received · IST</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice(
                Math.min(page, pages - 1) * 20,
                (Math.min(page, pages - 1) + 1) * 20,
              )
              .map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <b>{entry.name || "Registration"}</b>
                    <small>{entry.id}</small>
                    {entry.phone && (
                      <a href={`tel:${entry.phone}`}>{entry.phone}</a>
                    )}
                    {entry.email && (
                      <a href={`mailto:${entry.email}`}>{entry.email}</a>
                    )}
                  </td>
                  <td>{entry.campaignTitle}</td>
                  <td>
                    {Object.entries(entry.answers)
                      .filter(([, value]) => value)
                      .map(([id, value]) => (
                        <p key={id}>
                          <small>{entry.fieldLabels[id] || id}</small>
                          {value}
                        </p>
                      ))}
                  </td>
                  <td>
                    {new Date(entry.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>
                    <select
                      aria-label={`Follow-up status for ${entry.id}`}
                      value={entry.status}
                      disabled={busy}
                      onChange={async (e) => {
                        setError("");
                        try {
                          await act(
                            "campaignRegistrationStatus",
                            { id: entry.id, status: e.target.value },
                            "Follow-up status saved",
                          );
                        } catch (error: any) {
                          setError(error.message);
                        }
                      }}
                    >
                      {["New", "Contacted", "Closed"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="campaign-registration-empty">
          <Users size={30} strokeWidth={1.4} />
          <h3>
            {all.length
              ? "No matching registrations"
              : "Your registrations will appear here"}
          </h3>
          <p>
            {all.length
              ? "Try a different search or date range."
              : "Enable a registration popup and share it with your visitors."}
          </p>
        </div>
      )}
      {pages > 1 && (
        <div className="registration-pagination">
          <button
            className="btn secondary small"
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </button>
          <span>
            Page {Math.min(page, pages - 1) + 1} of {pages}
          </span>
          <button
            className="btn secondary small"
            disabled={page >= pages - 1}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
