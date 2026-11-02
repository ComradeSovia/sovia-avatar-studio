import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { deformPoint, neutral } from "@/engine/deformation";
import { packCharacter, unpackCharacter } from "@/features/characters/archive";
import { characterSchema, FORMAT, landmarksSchema } from "@/features/characters/document";
import { fixturePng, marks } from "./fixture";

const root = resolve("projects", `.tests-${randomUUID()}`);
process.env.STUDIO_DATA_DIR = root;
const store = await import("@/server/storage");
const { checkWrite, boundedBody } = await import("@/server/http");
after(async () => {
  assert.ok(
    root.startsWith(`${resolve("projects")}\\`) || root.startsWith(`${resolve("projects")}/`),
  );
  await rm(root, { recursive: true, force: true });
});
test("independent document creation and portable archive round trip", async () => {
  const png = fixturePng(),
    doc = await store.createCharacter("Character test", marks, png);
  assert.equal(doc.format, FORMAT);
  assert.equal(doc.revision, 0);
  const data = unpackCharacter(packCharacter(doc, png));
  assert.deepEqual(data.document, doc);
  assert.deepEqual(Buffer.from(data.image), png);
  assert.deepEqual(await store.getCharacter(doc.id), doc);
});
test("normalized contours must have area and valid anchors", () => {
  assert.ok(landmarksSchema.safeParse(marks).success);
  assert.equal(landmarksSchema.safeParse({ ...marks, chin: { x: 0.5, y: 0 } }).success, false);
  assert.equal(
    landmarksSchema.safeParse({
      ...marks,
      leftEye: [
        { x: 0, y: 0 },
        { x: 0.1, y: 0 },
        { x: 0.2, y: 0 },
        { x: 0.3, y: 0 },
      ],
    }).success,
    false,
  );
  assert.equal(
    landmarksSchema.safeParse({ ...marks, mouth: { x: Infinity, y: 0.3 } }).success,
    false,
  );
});
test("neutral deformation preserves positions, neck stays pinned, body is stable", async () => {
  const d = await store.createCharacter("Projection", marks, fixturePng());
  d.motion.breathe = false;
  for (let y = 0; y <= 10; y++)
    for (let x = 0; x <= 10; x++) {
      const p = { x: x / 10, y: y / 10 },
        q = deformPoint(p, d, neutral);
      assert.ok(Math.abs(p.x - q.x) < 1e-14 && Math.abs(p.y - q.y) < 1e-14);
    }
  const pose = { ...neutral, yaw: 1, pitch: -1, tilt: 0.8 };
  assert.deepEqual(deformPoint(marks.neck, d, pose), marks.neck);
  assert.deepEqual(deformPoint({ x: 0.2, y: 0.8 }, d, pose), { x: 0.2, y: 0.8 });
  assert.notDeepEqual(deformPoint({ x: 0.5, y: 0.3 }, d, pose), { x: 0.5, y: 0.3 });
});
test("concurrent saves detect revision conflicts instead of losing edits", async () => {
  const d = await store.createCharacter("Original", marks, fixturePng());
  const result = await Promise.allSettled([
    store.saveCharacter(d.id, { ...d, name: "First" }),
    store.saveCharacter(d.id, { ...d, name: "Second" }),
  ]);
  assert.equal(result.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal((await store.getCharacter(d.id)).revision, 1);
  await assert.rejects(
    store.saveCharacter(d.id, {
      ...d,
      artwork: { ...d.artwork, sha256: "0".repeat(64) },
      revision: 1,
    }),
  );
});
test("archives reject unrelated paths and old formats", () => {
  assert.throws(() => unpackCharacter(zipSync({ "../portrait.png": new Uint8Array([1]) })));
  assert.throws(() =>
    unpackCharacter(
      zipSync({
        "character.json": strToU8('{"format":"mesh-avatar"}'),
        "artwork/portrait.png": fixturePng(),
      }),
    ),
  );
  assert.equal(characterSchema.safeParse({ format: "mesh-avatar" }).success, false);
});
test("PNG header dimensions checked before decoding, paths cannot traverse", async () => {
  const png = fixturePng();
  png.writeUInt32BE(50000, 16);
  assert.throws(() => store.inspectPng(png));
  await assert.rejects(store.getCharacter("../../work"));
  await assert.rejects(store.createCharacter("", marks, fixturePng()));
});
test("broken project entries do not hide healthy ones", async () => {
  const id = randomUUID();
  await mkdir(join(root, id));
  await writeFile(join(root, id, "character.json"), "broken");
  const items = await store.listCharacters();
  assert.ok(items.length >= 1);
  assert.ok(items.every((p) => p.id !== id));
});
test("write endpoints reject cross-origin requests and cap streaming bodies", async () => {
  assert.throws(() =>
    checkWrite(
      new Request("http://127.0.0.1:6080/api/characters", {
        headers: { origin: "https://example.com" },
      }),
    ),
  );
  checkWrite(
    new Request("http://127.0.0.1:6080/api/characters", {
      headers: { origin: "http://127.0.0.1:6080" },
    }),
  );
  await assert.rejects(
    boundedBody(new Request("http://localhost", { method: "POST", body: "12345" }), 4),
  );
});
