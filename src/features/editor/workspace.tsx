"use client";
import {
  ArrowLeft,
  Check,
  Download,
  LoaderCircle,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  Save,
  ScanFace,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { neutral, type Pose } from "@/engine/deformation";
import { artworkUrl, type Character, characterSchema } from "@/features/characters/document";
import { LandmarkCanvas, type LandmarkKey, landmarkSteps } from "./landmark-canvas";
import { Preview } from "./preview";

const poseControls = [
  { key: "yaw", label: "Head turn", min: -1 },
  { key: "pitch", label: "Look up / down", min: -1 },
  { key: "tilt", label: "Head tilt", min: -1 },
  { key: "eyes", label: "Eye openness", min: 0 },
  { key: "mouth", label: "Mouth openness", min: 0 },
] as const;
export function Workspace({ id }: { id: string }) {
  const [doc, setDoc] = useState<Character | null>(null),
    [saved, setSaved] = useState(""),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState("mark"),
    [active, setActive] = useState<LandmarkKey>("leftEye"),
    [pose, setPose] = useState<Pose>({ ...neutral }),
    [playing, setPlaying] = useState(false),
    [talking, setTalking] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(`/api/characters/${id}`),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const parsed = characterSchema.parse(data);
      setDoc(parsed);
      setSaved(JSON.stringify(parsed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The project could not be opened.");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);
  const dirty = !!doc && JSON.stringify(doc) !== saved;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  async function save() {
    if (!doc || busy) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = characterSchema.safeParse(doc);
      if (!result.success)
        throw new Error(result.error.issues[0]?.message ?? "Check the landmarks.");
      const r = await fetch(`/api/characters/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        }),
        data = await r.json();
      if (!r.ok) throw new Error(data.error);
      const next = characterSchema.parse(data);
      setDoc(next);
      setSaved(JSON.stringify(next));
      setNote("Saved locally");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!doc)
    return (
      <div className="loading-page">
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button onClick={() => void load()}>Reopen</Button>
            <Link href="/">Back to library</Link>
          </>
        ) : (
          <>
            <LoaderCircle className="animate-spin" />
            Opening character…
          </>
        )}
      </div>
    );
  const step = landmarkSteps.find((s) => s.key === active)!;
  return (
    <>
      <div className="editor-heading">
        <div className="editor-title">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to library"
            onClick={() => {
              if (
                dirty &&
                !window.confirm("You have unsaved changes. Return to the library anyway?")
              )
                return;
              window.location.href = "/";
            }}
          >
            <ArrowLeft />
          </Button>
          <div>
            <h1>{doc.name}</h1>
            <span>
              {doc.artwork.width} × {doc.artwork.height} ·{" "}
              <span className={dirty ? "unsaved" : ""}>
                {dirty ? "Unsaved changes" : "All changes saved"}
              </span>
            </span>
          </div>
        </div>
        <div className="heading-actions">
          <Button
            variant="outline"
            disabled={dirty || busy}
            title={dirty ? "Save your changes first" : "Export the artwork and character document"}
            onClick={() => {
              window.location.href = `/api/characters/${id}/export`;
            }}
          >
            <Download />
            Export character
          </Button>
          <Button onClick={() => void save()} disabled={!dirty || busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : dirty ? <Save /> : <Check />}
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
      <div className="editor-toolbar">
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="mark">
              <ScanFace size={15} />
              Landmarks
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Play size={15} />
              Motion preview
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="toolbar-caption">
          <span className="status-dot" />
          Local workspace<Badge variant="outline">2.5D</Badge>
        </div>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
      {note && (
        <p className="save-note" role="status">
          {note}
        </p>
      )}
      <fieldset
        disabled={busy}
        className={`editor-grid ${mode === "preview" ? "preview-mode" : ""}`}
      >
        <aside className="landmark-panel panel">
          <div className="panel-heading">
            <ScanFace size={16} />
            <h2>Landmarks</h2>
          </div>
          <div className="landmark-list">
            {landmarkSteps.map((s) => (
              <button
                key={s.key}
                type="button"
                className={active === s.key ? "active" : ""}
                onClick={() => {
                  setActive(s.key);
                  setMode("mark");
                }}
              >
                <span className="landmark-icon" />
                <span>{s.title}</span>
                <small>
                  {Array.isArray(doc.landmarks[s.key])
                    ? (doc.landmarks[s.key] as unknown[]).length
                    : "1"}
                </small>
              </button>
            ))}
          </div>
          <div className="landmark-guide">
            <strong>{step.title}</strong>
            <p>{step.hint}</p>
            <p>
              The eye contours define the head tilt. The preview updates as you adjust landmarks.
            </p>
          </div>
          <div className="project-info">
            <Label htmlFor="project-name">Character name</Label>
            <Input
              id="project-name"
              value={doc.name}
              maxLength={60}
              onChange={(e) => setDoc({ ...doc, name: e.target.value })}
            />
            <p>Basic procedural eyes and mouths require no layer extraction.</p>
          </div>
        </aside>
        <section className="main-stage panel">
          {mode === "mark" ? (
            <>
              <div className="panel-heading">
                <h2>Artwork and landmarks</h2>
                <span>Original artwork preserved</span>
              </div>
              <LandmarkCanvas
                key={active}
                url={artworkUrl(id)}
                width={doc.artwork.width}
                height={doc.artwork.height}
                marks={doc.landmarks}
                active={active}
                onChange={(marks) => {
                  const parsed = characterSchema.shape.landmarks.safeParse(marks);
                  if (parsed.success) setDoc({ ...doc, landmarks: parsed.data });
                }}
              />
            </>
          ) : (
            <>
              <div className="panel-heading">
                <h2>Motion preview</h2>
                <span>Gentle motion looks more natural</span>
              </div>
              <Preview document={doc} pose={pose} playing={playing} talking={talking} large />
              <div className="preview-bottom">
                <span>The original head tilt is preserved</span>
                <Button size="sm" variant="outline" onClick={() => setPlaying((v) => !v)}>
                  {playing ? <Pause /> : <Play />}
                  {playing ? "Pause motion" : "Play motion"}
                </Button>
              </div>
            </>
          )}
        </section>
        <aside className="inspector panel">
          <div className="panel-heading">
            <SlidersHorizontal size={16} />
            <h2>Motion controls</h2>
          </div>
          {mode === "mark" && (
            <Preview document={doc} pose={pose} playing={playing} talking={talking} />
          )}
          <div className="inspector-content">
            <div className="playback-buttons">
              <Button
                variant={playing ? "secondary" : "outline"}
                size="sm"
                onClick={() => setPlaying((v) => !v)}
              >
                {playing ? <Pause /> : <Play />}
                {playing ? "Pause" : "Play motion"}
              </Button>
              <Button
                variant={talking ? "secondary" : "outline"}
                size="sm"
                onClick={() => setTalking((v) => !v)}
              >
                <MessageCircle />
                Test speech
              </Button>
            </div>
            <div className="control-title">
              <h3>Pose controls</h3>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset pose"
                onClick={() => {
                  setPose({ ...neutral });
                  setPlaying(false);
                  setTalking(false);
                }}
              >
                <RotateCcw size={14} />
              </Button>
            </div>
            {poseControls.map((c) => (
              <div className="slider-field" key={c.key}>
                <Label htmlFor={`pose-${c.key}`}>
                  {c.label}
                  <span>{pose[c.key].toFixed(2)}</span>
                </Label>
                <Slider
                  id={`pose-${c.key}`}
                  aria-label={c.label}
                  value={[pose[c.key]]}
                  min={c.min}
                  max={1}
                  step={0.01}
                  onValueChange={(v) => {
                    setPlaying(false);
                    if (c.key === "mouth") setTalking(false);
                    setPose({ ...pose, [c.key]: v[0] });
                  }}
                />
              </div>
            ))}
            <div className="control-divider" />
            <h3>Motion range</h3>
            {(["yaw", "pitch"] as const).map((key) => (
              <div className="slider-field" key={key}>
                <Label htmlFor={`motion-${key}`}>
                  {key === "yaw" ? "Maximum yaw" : "Maximum pitch"}
                  <span>{doc.motion[key]}°</span>
                </Label>
                <Slider
                  id={`motion-${key}`}
                  aria-label={key === "yaw" ? "Maximum yaw" : "Maximum pitch"}
                  min={0}
                  max={key === "yaw" ? 25 : 18}
                  step={1}
                  value={[doc.motion[key]]}
                  onValueChange={(v) => setDoc({ ...doc, motion: { ...doc.motion, [key]: v[0] } })}
                />
              </div>
            ))}
            <div className="switch-field">
              <Label htmlFor="auto-blink">Auto blink</Label>
              <Switch
                id="auto-blink"
                checked={doc.motion.blink}
                onCheckedChange={(v) => setDoc({ ...doc, motion: { ...doc.motion, blink: v } })}
              />
            </div>
            <div className="switch-field">
              <Label htmlFor="breathing">Gentle breathing</Label>
              <Switch
                id="breathing"
                checked={doc.motion.breathe}
                onCheckedChange={(v) => setDoc({ ...doc, motion: { ...doc.motion, breathe: v } })}
              />
            </div>
            <p className="inspector-tip">
              A single image supports limited rotation. Basic blinking may retain original eye
              lines, and procedural mouths may differ from the artwork style.
            </p>
          </div>
        </aside>
      </fieldset>
    </>
  );
}
