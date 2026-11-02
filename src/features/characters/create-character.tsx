"use client";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type DraftMarks,
  LandmarkCanvas,
  landmarkSteps,
  markPoints,
} from "@/features/editor/landmark-canvas";
import { landmarksSchema } from "./document";
export function CreateCharacter({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter(),
    fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null),
    [url, setUrl] = useState(""),
    [size, setSize] = useState({ width: 1, height: 1 }),
    [step, setStep] = useState(-1),
    [marks, setMarks] = useState<DraftMarks>({}),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  async function choose(f?: File) {
    if (!f) return;
    setError("");
    if (f.type !== "image/png" || f.size > 20 * 1024 * 1024) {
      setError("Choose a PNG image smaller than 20 MB.");
      return;
    }
    setLoading(true);
    const next = URL.createObjectURL(f);
    try {
      const image = new Image();
      image.src = next;
      await image.decode();
      if (
        image.width < 64 ||
        image.height < 64 ||
        image.width > 4096 ||
        image.height > 4096 ||
        image.width * image.height > 8_000_000
      )
        throw new Error(
          "Image dimensions must be 64–4096 pixels, with no more than 8 million pixels in total.",
        );
      setFile(f);
      setUrl(next);
      setSize({ width: image.width, height: image.height });
      setName(f.name.replace(/\.png$/i, ""));
      setMarks({});
      setStep(0);
    } catch (e) {
      URL.revokeObjectURL(next);
      setError(e instanceof Error ? e.message : "The image could not be opened.");
    } finally {
      setLoading(false);
    }
  }
  async function create() {
    setError("");
    const result = landmarksSchema.safeParse(marks);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Complete all landmarks.");
      return;
    }
    if (!file || !name.trim()) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.set("image", file);
      form.set("name", name.trim());
      form.set("landmarks", JSON.stringify(result.data));
      const response = await fetch("/api/characters", { method: "POST", body: form }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error);
      onOpenChange(false);
      router.push(`/characters/${data.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the character.");
    } finally {
      setBusy(false);
    }
  }
  const current = landmarkSteps[step],
    points = current ? markPoints(marks, current.key) : [],
    canNext = current ? (step < 2 ? points.length >= 4 : points.length === 1) : false;
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v);
      }}
    >
      <DialogContent className="creation-dialog">
        <DialogHeader>
          <DialogTitle>Start with an illustration</DialogTitle>
          <DialogDescription>
            Keep the original artwork. Bring it to life. Everything runs on your computer.
          </DialogDescription>
        </DialogHeader>
        <div className="wizard-layout">
          <nav className="wizard-steps" aria-label="Creation steps">
            <button
              type="button"
              className={step === -1 ? "active" : ""}
              onClick={() => setStep(-1)}
            >
              <span>{file ? <Check size={14} /> : "01"}</span>Choose artwork
            </button>
            {landmarkSteps.map((s, i) => (
              <button
                key={s.key}
                type="button"
                disabled={!file || busy}
                className={step === i ? "active" : ""}
                onClick={() => setStep(i)}
              >
                <span>
                  {markPoints(marks, s.key).length ? (
                    <Check size={14} />
                  ) : (
                    String(i + 2).padStart(2, "0")
                  )}
                </span>
                {s.title}
              </button>
            ))}
            <button
              type="button"
              disabled={!file || busy}
              className={step === 6 ? "active" : ""}
              onClick={() => setStep(6)}
            >
              <span>08</span>Review and create
            </button>
          </nav>
          <div className="wizard-content">
            {step === -1 ? (
              <section
                className="upload-zone"
                aria-label="Drop a character image"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void choose(e.dataTransfer.files[0]);
                }}
              >
                <div className="upload-symbol">
                  <ImagePlus size={36} />
                </div>
                <h3>Drop your artwork here</h3>
                <p>Transparent PNG · Up to 20 MB</p>
                <Button onClick={() => fileInput.current?.click()} disabled={loading}>
                  {loading ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}Choose image
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/png"
                  aria-label="Choose character image"
                  hidden
                  onChange={(e) => {
                    void choose(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <small>
                  Front-facing artwork or a slight head tilt works best. Strong profiles and
                  occlusions limit movement.
                </small>
                {file && (
                  <Button variant="ghost" onClick={() => setStep(0)}>
                    Continue marking <ArrowRight />
                  </Button>
                )}
              </section>
            ) : current ? (
              <>
                <div className="step-heading">
                  <div>
                    <span className="eyebrow">
                      LANDMARK {String(step + 1).padStart(2, "0")} / 06
                    </span>
                    <h3>{current.title}</h3>
                    <p>{current.hint}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = { ...marks };
                      if (step < 2) {
                        const p = markPoints(marks, current.key).slice(0, -1);
                        Object.assign(next, { [current.key]: p });
                      } else delete next[current.key];
                      setMarks(next);
                    }}
                    disabled={!points.length}
                  >
                    <Undo2 />
                    Undo point
                  </Button>
                </div>
                <LandmarkCanvas
                  key={current.key}
                  url={url}
                  {...size}
                  marks={marks}
                  active={current.key}
                  onChange={setMarks}
                />
              </>
            ) : (
              <div className="confirmation">
                <div className="confirm-image checker">
                  {url && <img src={url} alt="Character to create" />}
                </div>
                <div>
                  <span className="eyebrow">READY TO CREATE</span>
                  <h3>Name your character</h3>
                  <Label htmlFor="character-name">Character name</Label>
                  <Input
                    id="character-name"
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p>
                    Landmarks are saved with the artwork and can be adjusted later. Start with
                    gentle head turns and basic blinking.
                  </p>
                  <div className="notice">
                    Basic eyes and mouths are drawn procedurally. Detailed artwork may need
                    refinement. A single image cannot reconstruct a hidden profile.
                  </div>
                </div>
              </div>
            )}
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <footer className="wizard-footer">
              <Button
                variant="ghost"
                disabled={step === -1 || busy}
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft />
                Back
              </Button>
              <span>
                {file
                  ? `${size.width} × ${size.height}`
                  : "Images are never sent to external services"}
              </span>
              {step === 6 ? (
                <Button onClick={() => void create()} disabled={busy || !name.trim()}>
                  {busy ? <LoaderCircle className="animate-spin" /> : <Check />}
                  {busy ? "Creating…" : "Create character"}
                </Button>
              ) : (
                <Button
                  disabled={!canNext || busy}
                  onClick={() => {
                    setError("");
                    setStep((s) => s + 1);
                  }}
                >
                  Next
                  <ArrowRight />
                </Button>
              )}
            </footer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
