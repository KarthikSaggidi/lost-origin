"use client";
import { useState, useRef, useEffect, type CSSProperties } from "react";
import { Megaphone, Pause, Play, Check } from "lucide-react";
import { Field } from "./shared";
import { heroCampaign, type HeroCampaign } from "../lib/campaign";
import type { State } from "../lib/domain";
export function HeroCampaignTicker({
  campaign,
  preview = false,
}: {
  campaign: HeroCampaign;
  preview?: boolean;
}) {
  const [paused, setPaused] = useState(false);
  if (!campaign.enabled && !preview) return null;
  return (
    <div
      className={`hero-campaign-ticker ${preview ? "campaign-preview" : ""}`}
      role="region"
      aria-label="Current offer"
    >
      <Megaphone size={15} />
      <div
        className="campaign-ticker-window"
        tabIndex={0}
        role="group"
        aria-label="Campaign announcement"
      >
        <p className="visually-hidden">{campaign.text}</p>
        <div
          className="campaign-ticker-track"
          aria-hidden="true"
          style={
            {
              "--campaign-speed": `${campaign.speed}s`,
              animationPlayState: paused ? "paused" : "running",
            } as CSSProperties
          }
        >
          {[0, 1].map((n) => (
            <span key={n}>
              {campaign.text}
              <i>✦</i>
              {campaign.text}
              <i>✦</i>
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-label={
          paused ? "Play campaign animation" : "Pause campaign animation"
        }
        onClick={() => setPaused((v) => !v)}
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
      </button>
    </div>
  );
}
export default function HeroCampaignEditor({
  data,
  act,
  busy,
}: {
  data: State;
  act: any;
  busy: boolean;
}) {
  const savedCampaign = heroCampaign(data),
    key = JSON.stringify(savedCampaign);
  const dirty = useRef(false);
  const [form, setForm] = useState(savedCampaign),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!dirty.current) setForm(savedCampaign);
  }, [key]);
  const update = (value: Partial<HeroCampaign>) => {
    dirty.current = true;
    setSaved(false);
    setForm((v) => ({ ...v, ...value }));
  };
  return (
    <section className="panel hero-campaign-editor">
      <div className="panel-heading">
        <div>
          <h2>Hero announcement</h2>
          <p>
            A slim sliding message above the homepage search and action buttons.
          </p>
        </div>
        <span
          className={`campaign-state ${savedCampaign.enabled ? "enabled" : ""}`}
        >
          {savedCampaign.enabled ? "Live" : "Disabled"}
        </span>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await act("heroCampaign", form, "Homepage campaign saved");
            dirty.current = false;
            setSaved(true);
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        <Field label="Campaign message">
          <textarea
            required
            minLength={3}
            maxLength={300}
            rows={3}
            value={form.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Write your offer, event or coffee-house announcement…"
          />
        </Field>
        <div className="hero-campaign-editor-controls">
          <label className="check-field">
            <input
              type="checkbox"
              role="switch"
              checked={form.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            <span>Show on the homepage</span>
          </label>
          <Field label="Animation speed">
            <select
              value={form.speed}
              onChange={(e) => update({ speed: Number(e.target.value) })}
            >
              {![20, 30, 45, 60].includes(form.speed) && (
                <option value={form.speed}>{form.speed} seconds</option>
              )}
              <option value={20}>Fast · 20 seconds</option>
              <option value={30}>Comfortable · 30 seconds</option>
              <option value={45}>Slow · 45 seconds</option>
              <option value={60}>Very slow · 60 seconds</option>
            </select>
          </Field>
        </div>
        <div className="hero-campaign-preview">
          <small>MESSAGE PREVIEW</small>
          <HeroCampaignTicker campaign={form} preview />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={busy} type="submit">
          {busy ? "Saving…" : saved ? "Saved" : "Save campaign"}
          <Check size={15} />
        </button>
      </form>
    </section>
  );
}
