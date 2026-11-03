"use client";
import { ImagePlus, Layers, LoaderCircle, Replace, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { Character } from "@/features/characters/document";
import {
  type Part,
  partSchema,
  type Resources,
  resourcesSchema,
  resourceUrl,
} from "@/features/characters/resources";

const channels: Record<Part["channel"], string> = {
  artwork: "Foundation",
  "left-eye": "Left eye",
  "right-eye": "Right eye",
  mouth: "Mouth",
  hair: "Hair",
};
export function PartsPanel({
  document: doc,
  onChange,
  readOnly,
}: {
  document: Character;
  onChange: (doc: Character) => void;
  readOnly: boolean;
}) {
  const [selection, setSelection] = useState(doc.resources?.parts[0]?.id ?? ""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false),
    [filter, setFilter] = useState("all");
  const file = useRef<HTMLInputElement>(null),
    replacement = useRef(false);
  const resources: Resources = doc.resources ?? { version: 1, parts: [] },
    selected = resources.parts.find((p) => p.id === selection),
    validation = resourcesSchema.safeParse(resources);
  function update(next: Resources) {
    onChange({ ...doc, resources: next });
  }
  function edit(changes: Partial<Part>) {
    if (selected)
      update({
        ...resources,
        parts: resources.parts.map((p) => (p.id === selected.id ? { ...p, ...changes } : p)),
      });
  }
  async function upload(image?: File) {
    if (!image) return;
    setError("");
    if (image.type !== "image/png" || image.size > 20 * 1024 * 1024) {
      setError("Choose a PNG part image smaller than 20 MB.");
      return;
    }
    setUploading(true);
    try {
      const response = await fetch(`/api/characters/${doc.id}/assets`, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: image,
        }),
        asset = await response.json();
      if (!response.ok) throw new Error(asset.error);
      if (replacement.current && selected) edit({ image: asset });
      else {
        const part: Part = {
          id: `part-${crypto.randomUUID()}`,
          name: image.name.replace(/\.png$/i, "").slice(0, 64) || "New part",
          channel: "left-eye",
          role: "iris",
          state: "neutral",
          image: asset,
          region: {
            x: 0,
            y: 0,
            width: Math.min(1, asset.width / doc.artwork.width),
            height: Math.min(1, asset.height / doc.artwork.height),
          },
          visible: true,
          opacity: 1,
        };
        update({ ...resources, parts: [...resources.parts, part] });
        setSelection(part.id);
        setFilter("all");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The image could not be imported.");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div className="parts-panel">
      <div className="panel-heading">
        <Layers size={16} />
        <h2>Layers and expressions</h2>
        <span>{resources.parts.length} parts</span>
      </div>
      <div className="parts-intro">
        <p>
          Images, placement, visibility, and expression states are saved with the character and its
          archive.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={readOnly || uploading || resources.parts.length >= 64}
          onClick={() => {
            replacement.current = false;
            file.current?.click();
          }}
        >
          {uploading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}Import part
        </Button>
        <input
          hidden
          ref={file}
          type="file"
          accept="image/png"
          aria-label="Import part PNG"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {readOnly && (
          <p>Save a copy before importing images. You can preview changes to existing parts now.</p>
        )}
      </div>
      <div className="part-filters">
        {["all", ...Object.keys(channels)].map((channel) => (
          <Button
            key={channel}
            variant={filter === channel ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilter(channel)}
          >
            {channel === "all" ? "All" : channels[channel as Part["channel"]]}
          </Button>
        ))}
      </div>
      <section className="part-list" aria-label="Character parts">
        {resources.parts
          .filter((p) => filter === "all" || p.channel === filter)
          .map((p) => (
            <div className={`part-row ${selected?.id === p.id ? "selected" : ""}`} key={p.id}>
              <button
                type="button"
                className="part-pick"
                onClick={() => setSelection(p.id)}
                aria-pressed={selected?.id === p.id}
              >
                {/* biome-ignore lint/performance/noImgElement: Part thumbnails retain the exact PNG colors and alpha. */}
                <img src={resourceUrl(doc.id, p.image.sha256)} alt={p.name} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {channels[p.channel]} · {p.role} · {p.state}
                  </small>
                  <small>
                    {p.image.width} × {p.image.height} PNG
                  </small>
                </span>
              </button>
              <Switch
                aria-label={`Enable ${p.name}`}
                checked={p.visible}
                onCheckedChange={(visible) =>
                  update({
                    ...resources,
                    parts: resources.parts.map((item) =>
                      item.id === p.id ? { ...item, visible } : item,
                    ),
                  })
                }
              />
            </div>
          ))}
        {!resources.parts.length && (
          <p className="parts-empty">
            No separated parts yet. Import cropped PNG images and position them in artwork space.
            Characters without parts keep their procedural preview.
          </p>
        )}
      </section>
      {selected && (
        <section className="part-properties">
          <div className="control-title">
            <h3>Selected part</h3>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove selected part"
              onClick={() => {
                update({
                  ...resources,
                  parts: resources.parts.filter((p) => p.id !== selected.id),
                });
                setSelection("");
              }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
          <Label htmlFor="part-name">Part name</Label>
          <Input
            id="part-name"
            value={selected.name}
            maxLength={64}
            onChange={(e) => edit({ name: e.target.value })}
          />
          <div className="part-fields">
            <Label>
              Channel
              <select
                aria-label="Part channel"
                value={selected.channel}
                onChange={(e) => {
                  const channel = e.target.value as Part["channel"];
                  edit({
                    channel,
                    role:
                      channel === "artwork"
                        ? "base"
                        : channel === "hair"
                          ? "mask"
                          : channel === "mouth"
                            ? "expression"
                            : "iris",
                    state: channel === "mouth" ? "open" : "neutral",
                  });
                }}
              >
                {Object.entries(channels).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Role
              <select
                aria-label="Part role"
                value={selected.role}
                onChange={(e) =>
                  edit({
                    role: e.target.value as Part["role"],
                    state:
                      e.target.value === "expression"
                        ? selected.channel === "mouth"
                          ? "open"
                          : "closed"
                        : "neutral",
                  })
                }
              >
                {partSchema.shape.role.options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              State
              <select
                aria-label="Part state"
                value={selected.state}
                onChange={(e) => edit({ state: e.target.value as Part["state"] })}
              >
                {partSchema.shape.state.options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Label>
          </div>
          <div className="part-fields">
            {(["x", "y", "width", "height"] as const).map((key) => (
              <Label key={key}>
                {key} (%)
                <Input
                  aria-label={`Part ${key} percent`}
                  type="number"
                  step="0.1"
                  min={key === "width" || key === "height" ? 0.1 : 0}
                  max={100}
                  value={Number((selected.region[key] * 100).toFixed(2))}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    if (!Number.isFinite(v)) return;
                    const r = { ...selected.region };
                    if (key === "x") r.x = Math.max(0, Math.min(1 - r.width, v));
                    else if (key === "y") r.y = Math.max(0, Math.min(1 - r.height, v));
                    else r[key] = Math.max(0.001, Math.min(1 - r[key === "width" ? "x" : "y"], v));
                    edit({ region: r });
                  }}
                />
              </Label>
            ))}
          </div>
          <Label htmlFor="part-opacity">Opacity · {Math.round(selected.opacity * 100)}%</Label>
          <Slider
            id="part-opacity"
            aria-label="Part opacity"
            value={[selected.opacity]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(v) => edit({ opacity: v[0] })}
          />
          <div className="part-actions">
            <Button
              variant="outline"
              size="sm"
              disabled={readOnly || uploading}
              onClick={() => {
                replacement.current = true;
                file.current?.click();
              }}
            >
              <Replace />
              Replace image
            </Button>
            <a href={resourceUrl(doc.id, selected.image.sha256)} download={`${selected.id}.png`}>
              Download PNG
            </a>
          </div>
          <p className="part-checksum">SHA-256: {selected.image.sha256}</p>
        </section>
      )}
      {resources.hair && (
        <section className="part-properties">
          <h3>Hair guides</h3>
          <p>{resources.hair.strands.length} root-to-tip guides · masked spring motion</p>
          <Label htmlFor="hair-strength">
            Sway strength · {Math.round(resources.hair.strength * 100)}%
          </Label>
          <Slider
            id="hair-strength"
            aria-label="Hair sway strength"
            value={[resources.hair.strength]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={(v) =>
              update({ ...resources, hair: { ...resources.hair!, strength: v[0] } })
            }
          />
          <details>
            <summary>View saved guides</summary>
            {resources.hair.strands.map((s) => (
              <p key={s.id}>
                {s.name} · {s.points.length} points · stiffness {s.stiffness.toFixed(2)}
              </p>
            ))}
          </details>
        </section>
      )}
      {!validation.success && (
        <p className="error-message" role="alert">
          {validation.error.issues[0]?.message}
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
