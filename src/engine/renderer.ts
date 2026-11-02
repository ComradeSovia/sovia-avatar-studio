import { type Character, centre, type Point } from "@/features/characters/document";
import { clamp, deformPoint, type Pose } from "./deformation";

const vertex = `attribute vec2 a_position; attribute vec2 a_uv; varying vec2 v_uv; void main(){gl_Position=vec4(a_position.x*2.0-1.0,1.0-a_position.y*2.0,0.0,1.0);v_uv=a_uv;}`;
const fragment = `precision mediump float; uniform sampler2D u_image; varying vec2 v_uv; void main(){gl_FragColor=texture2D(u_image,v_uv);}`;
function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error("Could not create a preview shader.");
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error("This browser does not support the preview shader.");
  return s;
}
function path(ctx: CanvasRenderingContext2D, points: Point[], w: number, h: number) {
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i) ctx.lineTo(p.x * w, p.y * h);
    else ctx.moveTo(p.x * w, p.y * h);
  });
  ctx.closePath();
}
export class AvatarRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private position: WebGLBuffer;
  private uv: WebGLBuffer;
  private indices: WebGLBuffer;
  private texture: WebGLTexture;
  private shaders: WebGLShader[];
  private surface: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private points: Point[] = [];
  private count = 0;
  private lastTexture = "";
  private skin: string;
  constructor(
    private canvas: HTMLCanvasElement,
    private image: HTMLImageElement,
    private doc: Character,
  ) {
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error("WebGL is unavailable. Enable hardware acceleration and try again.");
    this.gl = gl;
    const program = gl.createProgram(),
      position = gl.createBuffer(),
      uv = gl.createBuffer(),
      indices = gl.createBuffer(),
      texture = gl.createTexture();
    if (!program || !position || !uv || !indices || !texture)
      throw new Error("There are not enough resources to initialize the preview.");
    this.program = program;
    this.position = position;
    this.uv = uv;
    this.indices = indices;
    this.texture = texture;
    this.shaders = [shader(gl, gl.VERTEX_SHADER, vertex), shader(gl, gl.FRAGMENT_SHADER, fragment)];
    for (const s of this.shaders) gl.attachShader(program, s);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("The preview program could not be initialized.");
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
    gl.useProgram(program);
    const cols = 36,
      rows = Math.min(
        120,
        Math.max(24, Math.round((cols * doc.artwork.height) / doc.artwork.width)),
      ),
      coords: number[] = [],
      triangles: number[] = [];
    for (let y = 0; y <= rows; y++)
      for (let x = 0; x <= cols; x++) {
        this.points.push({ x: x / cols, y: y / rows });
        coords.push(x / cols, y / rows);
      }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const i = y * (cols + 1) + x;
        triangles.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1);
      }
    this.count = triangles.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, uv);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
    const ua = gl.getAttribLocation(program, "a_uv");
    gl.enableVertexAttribArray(ua);
    gl.vertexAttribPointer(ua, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);
    this.surface = document.createElement("canvas");
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    this.surface.width = Math.round(image.naturalWidth * scale);
    this.surface.height = Math.round(image.naturalHeight * scale);
    const ctx = this.surface.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Could not create an image canvas.");
    this.ctx = ctx;
    ctx.drawImage(image, 0, 0, this.surface.width, this.surface.height);
    const samples: number[][] = [],
      m = doc.landmarks;
    for (const d of [-0.018, 0.018]) {
      const x = Math.round(clamp(m.mouth.x + d) * this.surface.width),
        y = Math.round(clamp(m.mouth.y - 0.012) * this.surface.height);
      samples.push([
        ...ctx.getImageData(
          Math.min(x, this.surface.width - 1),
          Math.min(y, this.surface.height - 1),
          1,
          1,
        ).data,
      ]);
    }
    this.skin = `rgb(${[0, 1, 2].map((k) => Math.round(samples.reduce((s, p) => s + p[k], 0) / samples.length)).join(" ")})`;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, "u_image"), 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.surface);
  }
  setDocument(doc: Character) {
    this.doc = doc;
    this.lastTexture = "";
  }
  private expressions(pose: Pose) {
    const key = `${Math.round(pose.eyes * 40)}:${Math.round(pose.mouth * 30)}`;
    if (key === this.lastTexture) return;
    this.lastTexture = key;
    const ctx = this.ctx,
      w = this.surface.width,
      h = this.surface.height,
      m = this.doc.landmarks;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.image, 0, 0, w, h);
    if (pose.eyes < 0.98)
      for (const eye of [m.leftEye, m.rightEye]) {
        const center = centre(eye),
          xs = eye.map((p) => p.x * w),
          ys = eye.map((p) => p.y * h),
          x0 = Math.min(...xs),
          x1 = Math.max(...xs),
          y0 = Math.min(...ys),
          y1 = Math.max(...ys),
          e = clamp(pose.eyes);
        ctx.save();
        path(ctx, eye, w, h);
        ctx.clip();
        ctx.fillStyle = this.skin;
        ctx.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
        if (e > 0.05) {
          ctx.translate(0, center.y * h * (1 - e));
          ctx.scale(1, e);
          ctx.drawImage(this.image, 0, 0, w, h);
        }
        ctx.restore();
        if (e < 0.35) {
          const left = eye.reduce((a, b) => (a.x < b.x ? a : b)),
            right = eye.reduce((a, b) => (a.x > b.x ? a : b));
          ctx.beginPath();
          ctx.moveTo(left.x * w, left.y * h);
          ctx.quadraticCurveTo(
            center.x * w,
            center.y * h + (y1 - y0) * 0.25,
            right.x * w,
            right.y * h,
          );
          ctx.strokeStyle = "#67433e";
          ctx.lineWidth = Math.max(1.4, (x1 - x0) * 0.038);
          ctx.lineCap = "round";
          ctx.stroke();
        }
      }
    if (pose.mouth > 0.04) {
      const d = Math.abs(centre(m.rightEye).x - centre(m.leftEye).x) * w,
        rx = d * 0.12,
        ry = rx * (0.15 + pose.mouth * 0.9),
        x = m.mouth.x * w,
        y = m.mouth.y * h;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      const g = ctx.createLinearGradient(x, y - ry, x, y + ry);
      g.addColorStop(0, "#6b2c34");
      g.addColorStop(1, "#d88b92");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "#a76666";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texSubImage2D(
      this.gl.TEXTURE_2D,
      0,
      0,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.surface,
    );
  }
  draw(pose: Pose, time: number) {
    const gl = this.gl;
    this.expressions(pose);
    const ratio = Math.min(window.devicePixelRatio || 1, 2),
      width = Math.round(this.canvas.clientWidth * ratio),
      height = Math.round(this.canvas.clientHeight * ratio);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const imageAspect = this.doc.artwork.width / this.doc.artwork.height,
      viewAspect = width / height,
      sx = Math.min(0.9, (0.9 * imageAspect) / viewAspect),
      sy = Math.min(0.9, (0.9 * viewAspect) / imageAspect),
      positions = new Float32Array(this.points.length * 2);
    this.points.forEach((p, i) => {
      const q = deformPoint(p, this.doc, pose, time);
      positions[i * 2] = 0.5 + (q.x - 0.5) * sx;
      positions[i * 2 + 1] = 0.5 + (q.y - 0.5) * sy;
    });
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL useProgram is not a React hook.
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.position);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    const a = gl.getAttribLocation(this.program, "a_position");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
  }
  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    for (const b of [this.position, this.uv, this.indices]) gl.deleteBuffer(b);
    for (const s of this.shaders) gl.deleteShader(s);
    gl.deleteProgram(this.program);
  }
}
