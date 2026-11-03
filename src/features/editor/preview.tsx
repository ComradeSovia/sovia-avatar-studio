"use client";
import { Download, LoaderCircle, ScanFace } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Pose } from "@/engine/deformation";
import { AvatarRenderer } from "@/engine/renderer";
import { artworkUrl, type Character } from "@/features/characters/document";
import { resourceImages, resourceUrl } from "@/features/characters/resources";
export function Preview({
  document: doc,
  pose,
  playing,
  talking,
  large = false,
}: {
  document: Character;
  pose: Pose;
  playing: boolean;
  talking: boolean;
  large?: boolean;
}) {
  const [focusFace, setFocusFace] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<AvatarRenderer | null>(null),
    state = useRef({ doc, pose, playing, talking, focusFace }),
    [status, setStatus] = useState("loading"),
    [message, setMessage] = useState("");
  state.current = { doc, pose, playing, talking, focusFace };
  const id = doc.id;
  const resourceKey = resourceImages(doc.resources)
    .map((a) => a.sha256)
    .sort()
    .join(":");
  useEffect(() => {
    let disposed = false,
      frame = 0;
    const image = new Image();
    setStatus("loading");
    image.src = artworkUrl(id);
    image
      .decode()
      .then(async () => {
        const parts = new Map<string, HTMLImageElement>();
        await Promise.all(
          (resourceKey ? resourceKey.split(":") : []).map(async (hash) => {
            const part = new Image();
            part.src = resourceUrl(id, hash);
            await part.decode();
            parts.set(hash, part);
          }),
        );
        if (disposed || !canvas.current) return;
        try {
          renderer.current = new AvatarRenderer(canvas.current, image, state.current.doc, parts);
          setStatus("ready");
          let last = 0;
          function tick(now: number) {
            if (disposed) return;
            frame = requestAnimationFrame(tick);
            if (now - last < 32 || document.hidden) return;
            last = now;
            const { doc: current, pose: p, playing: play, talking: talk } = state.current;
            const t = now / 1000,
              blink = Math.max(0, 1 - Math.max(0, 1 - Math.abs((t % 4.6) - 4.3) / 0.12));
            renderer.current?.draw(
              {
                ...p,
                yaw: play ? Math.sin(t * 0.65) * 0.7 : p.yaw,
                pitch: play ? Math.sin(t * 0.43) * 0.35 : p.pitch,
                eyes: play && current.motion.blink ? Math.min(p.eyes, blink) : p.eyes,
                mouth: talk ? (0.5 + 0.5 * Math.sin(t * 13)) * 0.8 : p.mouth,
              },
              play ? t : 0,
              state.current.focusFace,
            );
          }
          frame = requestAnimationFrame(tick);
        } catch (e) {
          setStatus("error");
          setMessage(e instanceof Error ? e.message : "Preview failed.");
        }
      })
      .catch(() => {
        if (!disposed) {
          setStatus("error");
          setMessage(
            "The artwork or a part image could not be loaded. Check the project resources.",
          );
        }
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [id, resourceKey]);
  useEffect(() => {
    renderer.current?.setDocument(doc);
  }, [doc]);
  return (
    <div className={`preview-stage checker ${large ? "preview-large" : ""}`}>
      <canvas
        ref={canvas}
        aria-label="Live character preview"
        data-testid="avatar-preview"
        onContextMenu={(e) => e.preventDefault()}
      />
      <Button
        className="framing-button"
        variant="secondary"
        size="sm"
        disabled={status !== "ready"}
        onClick={() => setFocusFace((v) => !v)}
      >
        <ScanFace size={13} />
        {focusFace ? "Show full character" : "Focus face"}
      </Button>
      {status === "loading" && (
        <div className="preview-status" role="status">
          <LoaderCircle className="animate-spin" />
          Preparing preview…
        </div>
      )}
      {status === "error" && (
        <div className="preview-status error-message" role="alert">
          {message}
        </div>
      )}
      <span className="preview-indicator">
        <span className={status === "ready" ? "status-dot" : ""} />
        {status === "ready" ? "Preview ready" : "Local preview"}
      </span>
      <Button
        size="icon"
        variant="secondary"
        className="snapshot-button"
        aria-label="Save preview image"
        disabled={status !== "ready"}
        onClick={() => {
          const link = document.createElement("a");
          link.download = `${doc.name}-preview.png`;
          link.href = canvas.current?.toDataURL("image/png") ?? "";
          link.click();
        }}
      >
        <Download size={15} />
      </Button>
    </div>
  );
}
