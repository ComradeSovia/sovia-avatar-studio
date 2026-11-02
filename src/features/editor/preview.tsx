"use client";
import { Download, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Pose } from "@/engine/deformation";
import { AvatarRenderer } from "@/engine/renderer";
import { artworkUrl, type Character } from "@/features/characters/document";
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
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<AvatarRenderer | null>(null),
    state = useRef({ doc, pose, playing, talking }),
    [status, setStatus] = useState("loading"),
    [message, setMessage] = useState("");
  state.current = { doc, pose, playing, talking };
  const id = doc.id;
  useEffect(() => {
    let disposed = false,
      frame = 0;
    const image = new Image();
    setStatus("loading");
    image.src = artworkUrl(id);
    image
      .decode()
      .then(() => {
        if (disposed || !canvas.current) return;
        try {
          renderer.current = new AvatarRenderer(canvas.current, image, state.current.doc);
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
          setMessage("The artwork could not be loaded. Reopen the project.");
        }
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [id]);
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
