"use client";
import { Minus, Plus, Scan } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { centre, type Landmarks, type Point } from "@/features/characters/document";
export const landmarkSteps = [
  {
    key: "leftEye",
    title: "Image-left eye",
    hint: "Trace the white and iris with at least 4 points. Keep bangs outside the contour.",
  },
  {
    key: "rightEye",
    title: "Image-right eye",
    hint: "Trace the other eye in order with at least 4 points.",
  },
  { key: "mouth", title: "Mouth center", hint: "Click the center of the closed mouth line." },
  { key: "chin", title: "Chin", hint: "Click the lowest point of the chin." },
  {
    key: "neck",
    title: "Neck pivot",
    hint: "Click where the head meets the neck to define a stable pivot.",
  },
  { key: "crown", title: "Crown", hint: "Click the highest point of the hair outline." },
] as const;
export type LandmarkKey = (typeof landmarkSteps)[number]["key"];
export type DraftMarks = Partial<Landmarks>;
export function markPoints(marks: DraftMarks, key: LandmarkKey): Point[] {
  const v = marks[key];
  return !v ? [] : Array.isArray(v) ? v : [v];
}
export function LandmarkCanvas({
  url,
  width,
  height,
  marks,
  active,
  onChange,
}: {
  url: string;
  width: number;
  height: number;
  marks: DraftMarks;
  active: LandmarkKey;
  onChange: (marks: DraftMarks) => void;
}) {
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<number | null>(null);
  const [zoom, setZoom] = useState(1),
    [focus, setFocus] = useState<Point>({ x: 0.5, y: 0.5 });
  const points = markPoints(marks, active),
    eye = active === "leftEye" || active === "rightEye";
  const viewWidth = width / zoom,
    viewHeight = height / zoom,
    ox = Math.max(0, Math.min(width - viewWidth, focus.x * width - viewWidth / 2)),
    oy = Math.max(0, Math.min(height - viewHeight, focus.y * height - viewHeight / 2));
  function locate(event: React.PointerEvent<SVGSVGElement>): Point | null {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (p.x < 0 || p.y < 0 || p.x > width || p.y > height) return null;
    return { x: p.x / width, y: p.y / height };
  }
  function update(p: Point, index?: number) {
    const next = [...points];
    if (index !== undefined) next[index] = p;
    else if (eye) {
      if (next.length >= 40) return;
      next.push(p);
    } else next.splice(0, next.length, p);
    onChange({ ...marks, [active]: eye ? next : p });
  }
  return (
    <div className="mark-workspace">
      <div className="canvas-tools">
        <span>{Math.round(zoom * 100)}%</span>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
        >
          <Minus />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Zoom in"
          onClick={() => {
            if (points.length) setFocus(centre(points));
            setZoom((z) => Math.min(6, z + 0.5));
          }}
        >
          <Plus />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Fit image"
          onClick={() => {
            setZoom(1);
            setFocus({ x: 0.5, y: 0.5 });
          }}
        >
          <Scan />
        </Button>
      </div>
      <svg
        ref={svg}
        viewBox={`${ox} ${oy} ${viewWidth} ${viewHeight}`}
        className="landmark-canvas checker"
        role="img"
        aria-label="Character landmark canvas"
        onPointerDown={(e) => {
          const p = locate(e);
          if (p) {
            update(p);
          }
        }}
        onPointerMove={(e) => {
          if (drag.current === null) return;
          const p = locate(e);
          if (p) update(p, drag.current);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <image href={url} width={width} height={height} />
        {landmarkSteps.map((step) => {
          const p = markPoints(marks, step.key),
            selected = step.key === active;
          return (
            <g key={step.key} opacity={selected ? 1 : 0.45}>
              {p.length > 1 && (
                <polygon
                  points={p.map((q) => `${q.x * width},${q.y * height}`).join(" ")}
                  fill={selected ? "#10b98126" : "#64748b14"}
                  stroke={selected ? "#059669" : "#64748b"}
                  strokeWidth={2 / zoom}
                />
              )}{" "}
              {p.map((q, i) => (
                <circle
                  key={`${step.key}-${i}`}
                  cx={q.x * width}
                  cy={q.y * height}
                  r={(Math.max(width, height) * 0.005) / zoom}
                  fill={selected ? "#fff" : "#64748b"}
                  stroke={selected ? "#059669" : "#fff"}
                  strokeWidth={2 / zoom}
                  style={{ cursor: selected ? "grab" : "default" }}
                  onPointerDown={(e) => {
                    if (!selected) return;
                    e.stopPropagation();
                    drag.current = i;
                    svg.current?.setPointerCapture(e.pointerId);
                  }}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="canvas-foot">
        <span>Click to add · Drag points to adjust</span>
        <span>{points.length} points</span>
      </div>
    </div>
  );
}
