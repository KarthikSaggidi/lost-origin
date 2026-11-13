"use client";
import { authFetch } from "../lib/client-auth";
import { useState } from "react";
import { ArrowUp, ArrowDown, Upload, Trash2, ImagePlus } from "lucide-react";
import { Field } from "./shared";
import { defaultHeroSlides, type HeroSlide } from "../lib/hero";
import type { Product } from "../lib/domain";
import CafeScene from "./cafe-scene";
export default function HeroEditor({
  slides,
  products,
  update,
  onUploading,
}: {
  slides: HeroSlide[];
  products: Product[];
  update: (value: HeroSlide[]) => void;
  onUploading: (value: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const change = (index: number, value: Partial<HeroSlide>) =>
    update(slides.map((s, i) => (i === index ? { ...s, ...value } : s)));
  const upload = async (file?: File, index?: number) => {
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
    onUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const response = await authFetch("/api/v1/media", {
        method: "POST",
        body: form,
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
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      // Check that the actual image decodes before putting it into the draft.
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () =>
          reject(new Error("This file cannot be displayed as an image."));
        img.src = result.image;
      });
      if (index === undefined)
        update([
          ...slides,
          {
            id: crypto.randomUUID(),
            image: result.image,
            alt: "Lost Origin Coffee House",
            active: true,
            position: "center",
          },
        ]);
      else change(index, { image: result.image });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please retry.");
    } finally {
      setUploading(false);
      onUploading(false);
    }
  };
  const move = (index: number, delta: number) => {
    const next = [...slides];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    update(next);
  };
  return (
    <section className="hero-editor" aria-label="Hero image manager">
      <div className="hero-editor-heading">
        <div>
          <h3>Homepage hero images</h3>
          <p>
            Upload up to 6 images. Reorder them below, then save changes to
            publish them across devices.
          </p>
        </div>
        <ImagePlus size={23} />
      </div>
      {slides.map((slide, index) => (
        <article className="hero-editor-card" key={slide.id}>
          <div className="hero-editor-image-preview">
            <CafeScene slide={slide} products={products} />
          </div>
          <div className="hero-editor-fields">
            <div className="row space-between">
              <b>Image {index + 1}</b>
              <label className="hero-visible">
                <input
                  type="checkbox"
                  checked={slide.active}
                  disabled={
                    uploading ||
                    (slide.active &&
                      slides.filter((s) => s.active).length === 1)
                  }
                  onChange={(e) => change(index, { active: e.target.checked })}
                />
                Visible
              </label>
            </div>
            <Field label={`Image ${index + 1} description`}>
              <input
                required
                minLength={2}
                maxLength={180}
                value={slide.alt}
                disabled={uploading}
                onChange={(e) => change(index, { alt: e.target.value })}
              />
            </Field>
            <Field label={`Image ${index + 1} focal point`}>
              <select
                value={slide.position}
                disabled={uploading}
                onChange={(e) =>
                  change(index, {
                    position: e.target.value as HeroSlide["position"],
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Centre</option>
                <option value="right">Right</option>
              </select>
            </Field>
            <div className="hero-editor-actions">
              <label
                className={`btn secondary small upload-label ${uploading ? "disabled" : ""}`}
              >
                <Upload size={14} />
                Replace
                <input
                  aria-label={`Replace hero image ${index + 1}`}
                  disabled={uploading}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    void upload(e.target.files?.[0], index);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move image ${index + 1} up`}
                disabled={index === 0 || uploading}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Move image ${index + 1} down`}
                disabled={index === slides.length - 1 || uploading}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove image ${index + 1}`}
                disabled={
                  uploading ||
                  slides.length === 1 ||
                  (slide.active && slides.filter((s) => s.active).length === 1)
                }
                onClick={() => update(slides.filter((_, i) => i !== index))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </article>
      ))}
      <div className="hero-editor-actions">
        <label
          className={`btn secondary upload-label ${uploading || slides.length >= 6 ? "disabled" : ""}`}
        >
          <Upload size={16} />
          {uploading ? "Uploading…" : "Add hero image"}
          <input
            aria-label="Add hero image"
            disabled={uploading || slides.length >= 6}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="text-btn"
          disabled={uploading}
          onClick={() => update(defaultHeroSlides)}
        >
          Restore reference image
        </button>
        <small>
          JPG, PNG or WebP · max. 5 MB each · wide images recommended
        </small>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
