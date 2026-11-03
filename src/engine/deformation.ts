import { type Character, centre, type Point } from "@/features/characters/document";
export interface Pose {
  yaw: number;
  pitch: number;
  tilt: number;
  eyes: number;
  mouth: number;
  mood?: "neutral" | "smile";
  mouthShape?: "open" | "wide" | "round";
}
export const neutral: Pose = { yaw: 0, pitch: 0, tilt: 0, eyes: 1, mouth: 0 };
export const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
/** Curved-face projection in artwork pixels. The eye line defines local axes. */
export function deformPoint(point: Point, doc: Character, pose: Pose, time = 0): Point {
  const { width: w, height: h } = doc.artwork,
    m = doc.landmarks,
    a = centre(m.leftEye),
    b = centre(m.rightEye),
    cx = ((a.x + b.x) * w) / 2,
    cy = ((a.y + b.y) * h) / 2;
  const angle = Math.atan2((b.y - a.y) * h, (b.x - a.x) * w),
    c = Math.cos(angle),
    s = Math.sin(angle),
    x = point.x * w,
    y = point.y * h,
    dx = x - cx,
    dy = y - cy,
    u = dx * c + dy * s,
    v = -dx * s + dy * c;
  const headHeight = Math.max(30, (m.chin.y - m.crown.y) * h),
    eyeDistance = Math.hypot((b.x - a.x) * w, (b.y - a.y) * h),
    rx = Math.max(eyeDistance * 1.3, headHeight * 0.46),
    ry = headHeight * 0.72;
  const influence =
    (1 - smooth((Math.hypot(u / rx, (v + headHeight * 0.13) / ry) - 0.72) / 0.52)) *
    (1 - smooth((y - m.chin.y * h) / Math.max(12, (m.neck.y - m.chin.y) * h)));
  const yaw = (clamp(pose.yaw, -1, 1) * doc.motion.yaw * Math.PI) / 180,
    pitch = (clamp(pose.pitch, -1, 1) * doc.motion.pitch * Math.PI) / 180;
  const depth =
    eyeDistance * 0.55 * Math.sqrt(Math.max(0, 1 - (u / (rx * 0.92)) ** 2 - (v / (ry * 0.9)) ** 2));
  const du = u * (Math.cos(yaw) - 1) + depth * Math.sin(yaw),
    dv = v * (Math.cos(pitch) - 1) - depth * Math.sin(pitch);
  let px = x + (du * c - dv * s) * influence,
    py = y + (du * s + dv * c) * influence;
  const tilt = clamp(pose.tilt, -1, 1) * 0.18 * influence,
    nx = m.neck.x * w,
    ny = m.neck.y * h,
    tx = px - nx,
    ty = py - ny;
  px = nx + tx * Math.cos(tilt) - ty * Math.sin(tilt);
  py = ny + tx * Math.sin(tilt) + ty * Math.cos(tilt);
  if (doc.motion.breathe)
    py -=
      Math.sin(time * 1.7) *
      h *
      0.001 *
      smooth((point.y - m.neck.y) * 4) *
      (1 - smooth((point.y - 0.85) * 5));
  return { x: px / w, y: py / h };
}
