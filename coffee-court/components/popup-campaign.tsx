"use client";
import { authFetch } from "../lib/client-auth";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Modal, Field } from "./shared";
import { todayIST, type State } from "../lib/domain";
import {
  popupCampaign,
  popupCampaignStatus,
  type PopupCampaign,
} from "../lib/popup-campaign";

export function PopupCampaignDialog({
  campaign,
  close,
  page = "home",
  navigate,
  preview = false,
}: {
  campaign: PopupCampaign;
  close: () => void;
  page?: string;
  navigate: (view: string) => void;
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState("");
  const requestKey = useRef(crypto.randomUUID());
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const fields = campaign.fields.filter((field) => field.enabled);
  return (
    <Modal
      title={campaign.title}
      close={close}
      className="popup-campaign-dialog"
    >
      {preview && (
        <p className="popup-preview-label">
          Preview · registrations are not saved
        </p>
      )}
      {campaign.image && (
        <img
          className="popup-campaign-image"
          src={campaign.image}
          alt={campaign.imageAlt}
        />
      )}
      {reference ? (
        <div className="popup-registration-success" role="status">
          <CheckCircle2 size={40} strokeWidth={1.4} />
          <h3>You’re registered.</h3>
          <p>{campaign.successMessage}</p>
          <small>Reference: {reference}</small>
          <button className="btn primary full" onClick={close}>
            Done
            <CheckCircle2 size={16} />
          </button>
        </div>
      ) : (
        <>
          {campaign.description && (
            <p className="popup-campaign-description">{campaign.description}</p>
          )}
          {campaign.registrationEnabled ? (
            <form
              className="popup-registration-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                setBusy(true);
                if (preview) {
                  setReference("PREVIEW");
                  setBusy(false);
                  return;
                }
                try {
                  const response = await authFetch("/api/v1/state", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "campaignRegistration",
                      marketingOptIn,
                      campaignId: campaign.campaignId,
                      page,
                      answers: Object.fromEntries(
                        fields.map((field) => [
                          field.id,
                          answers[field.id] || "",
                        ]),
                      ),
                      requestKey: requestKey.current,
                    }),
                  });
                  const result = (await response.json()) as {
                    id: string;
                    error?: string;
                  };
                  if (!response.ok)
                    throw new Error(
                      result.error ||
                        "Your registration could not be saved. Please try again.",
                    );
                  setReference(result.id);
                } catch (e: any) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {fields.map((field) => (
                <Field
                  key={field.id}
                  label={`${field.label}${field.required ? " *" : " (optional)"}`}
                >
                  <input
                    type={field.type}
                    name={field.id}
                    required={field.required}
                    maxLength={
                      field.type === "tel"
                        ? 10
                        : field.type === "email"
                          ? 160
                          : 200
                    }
                    pattern={field.type === "tel" ? "[6-9][0-9]{9}" : undefined}
                    inputMode={
                      field.type === "tel"
                        ? "tel"
                        : field.type === "email"
                          ? "email"
                          : "text"
                    }
                    autoComplete={
                      field.id === "name"
                        ? "name"
                        : field.type === "tel"
                          ? "tel-national"
                          : field.type === "email"
                            ? "email"
                            : "off"
                    }
                    placeholder={
                      field.type === "tel"
                        ? "10-digit mobile number"
                        : field.label
                    }
                    disabled={busy}
                    value={answers[field.id] || ""}
                    onChange={(e) =>
                      setAnswers((current) => ({
                        ...current,
                        [field.id]: e.target.value,
                      }))
                    }
                  />
                </Field>
              ))}
              <p className="popup-contact-note">
                Your details will be shared with the Lost Origin team about this
                campaign.
              </p>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                />
                Send me offers and events on WhatsApp (optional)
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="btn primary full"
                disabled={busy}
              >
                {busy ? "Registering…" : campaign.buttonLabel}
                <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <button
              className="btn primary full"
              onClick={() => {
                close();
                if (!preview) navigate(campaign.target);
              }}
            >
              {campaign.buttonLabel}
              <ArrowRight size={17} />
            </button>
          )}
        </>
      )}
    </Modal>
  );
}

export default function CustomerPopupCampaign({
  data,
  view,
  blocked,
  navigate,
}: {
  data: State;
  view: string;
  blocked: boolean;
  navigate: (view: string) => void;
}) {
  const campaign = popupCampaign(data),
    key = JSON.stringify(campaign);
  const [open, setOpen] = useState(""),
    [now, setNow] = useState(Date.now());
  const visited = useRef(new Set<string>());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const route = `${campaign.campaignId}:${view}`;
    if (
      blocked ||
      popupCampaignStatus(campaign, now) !== "Live" ||
      !campaign.pages.includes(view as any)
    ) {
      setOpen("");
      return;
    }
    if (visited.current.has(route)) return;
    const storageKey = `lost-origin-popup:${campaign.campaignId}`;
    const marker = campaign.frequency === "daily" ? todayIST() : "seen";
    try {
      if (
        campaign.frequency === "session" &&
        sessionStorage.getItem(storageKey) === marker
      )
        return;
      if (
        campaign.frequency === "daily" &&
        localStorage.getItem(storageKey) === marker
      )
        return;
    } catch {}
    const timer = setTimeout(() => {
      visited.current.add(route);
      try {
        if (campaign.frequency === "session")
          sessionStorage.setItem(storageKey, marker);
        if (campaign.frequency === "daily")
          localStorage.setItem(storageKey, marker);
      } catch {}
      setOpen(campaign.campaignId);
    }, campaign.delaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [key, view, blocked, now]);
  return open === campaign.campaignId &&
    !blocked &&
    popupCampaignStatus(campaign, now) === "Live" ? (
    <PopupCampaignDialog
      key={campaign.campaignId}
      campaign={campaign}
      page={view}
      close={() => setOpen("")}
      navigate={navigate}
    />
  ) : null;
}
