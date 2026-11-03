import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { after, test } from "node:test";
import { unzipSync, zipSync } from "fflate";
import { PNG } from "pngjs";
import { neutral } from "@/engine/deformation";
import { HairDynamics } from "@/engine/hair";
import { expressionFrames } from "@/engine/scene";
import { packCharacter, unpackCharacter } from "@/features/characters/archive";
import { characterSchema } from "@/features/characters/document";
import { DEFAULT_EXAMPLE_ID } from "@/features/characters/example";
import {
  type Resources,
  resourceImages,
  resourcePath,
  resourcesSchema,
} from "@/features/characters/resources";
import { fixturePng, marks } from "./fixture";

const root = resolve("projects", `.resource-tests-${randomUUID()}`);
process.env.STUDIO_DATA_DIR = root;
const store = await import("@/server/storage");
after(async () => {
  assert.ok(
    root.startsWith(`${resolve("projects")}\\`) || root.startsWith(`${resolve("projects")}/`),
  );
  await rm(root, { recursive: true, force: true });
});
test("all twenty parts and eight guides survive copy, save, archive and reimport byte for byte", async () => {
  const original = await store.getCharacter(DEFAULT_EXAMPLE_ID),
    artwork = await store.getArtwork(DEFAULT_EXAMPLE_ID),
    assets = await store.getAssets(DEFAULT_EXAMPLE_ID);
  assert.equal(original.resources?.parts.length, 20);
  assert.equal(original.resources?.hair?.strands.length, 8);
  const copy = await store.copyExample(original),
    parts = copy.resources!.parts.map((p, i) =>
      i === 2
        ? { ...p, visible: false, opacity: 0.42, region: { ...p.region, x: p.region.x + 0.001 } }
        : p,
    );
  const saved = await store.saveCharacter(copy.id, {
    ...copy,
    resources: { ...copy.resources!, parts },
  });
  const stored = await store.getCharacter(copy.id);
  assert.deepEqual(stored.resources, saved.resources);
  const packed = packCharacter(
      stored,
      await store.getArtwork(copy.id),
      await store.getAssets(copy.id),
    ),
    contents = unpackCharacter(packed);
  assert.deepEqual(contents.document.resources, stored.resources);
  assert.equal(Object.keys(unzipSync(packed)).length, resourceImages(stored.resources).length + 2);
  for (const [hash, bytes] of Object.entries(assets))
    assert.deepEqual(Buffer.from(contents.assets[hash]), Buffer.from(bytes));
  const imported = await store.createCharacter(
    "Resource round trip",
    contents.document.landmarks,
    contents.image,
    contents.document,
    contents.assets,
  );
  assert.notEqual(imported.id, copy.id);
  assert.deepEqual(imported.resources, stored.resources);
  assert.deepEqual(await store.getAssets(imported.id), await store.getAssets(copy.id));
  assert.deepEqual(await store.getArtwork(imported.id), artwork);
  assert.deepEqual(await store.getCharacter(DEFAULT_EXAMPLE_ID), original);
});
test("missing and tampered resource images fail before publishing a project", async () => {
  const doc = await store.getCharacter(DEFAULT_EXAMPLE_ID),
    image = await store.getArtwork(DEFAULT_EXAMPLE_ID),
    assets = await store.getAssets(DEFAULT_EXAMPLE_ID),
    hash = Object.keys(assets)[0];
  const before = await readdir(root),
    missing = { ...assets };
  delete missing[hash];
  await assert.rejects(store.createCharacter("Missing", doc.landmarks, image, doc, missing));
  assert.deepEqual(await readdir(root), before);
  const tampered = { ...assets, [hash]: new Uint8Array(assets[hash]) };
  tampered[hash][tampered[hash].length - 1] ^= 1;
  await assert.rejects(store.createCharacter("Tampered", doc.landmarks, image, doc, tampered));
  assert.deepEqual(await readdir(root), before);
  const entries = unzipSync(packCharacter(doc, image, assets));
  delete entries[resourcePath(hash)];
  assert.throws(() => unpackCharacter(zipSync(entries)));
  const extra = unzipSync(packCharacter(doc, image, assets));
  extra[`assets/${"0".repeat(64)}.png`] = new Uint8Array(fixturePng());
  assert.throws(() => unpackCharacter(zipSync(extra)));
});
test("content-addressed uploads persist and missing references cannot replace the saved document", async () => {
  const doc = await store.createCharacter("Upload", marks, fixturePng()),
    png = new PNG({ width: 8, height: 9 });
  png.data.fill(255);
  const bytes = PNG.sync.write(png);
  const image = await store.uploadAsset(doc.id, bytes);
  assert.equal(image.width, 8);
  assert.equal(image.height, 9);
  assert.deepEqual(await store.uploadAsset(doc.id, bytes), image);
  const resources: Resources = {
    version: 1,
    parts: [
      {
        id: "detail",
        name: "Imported detail",
        channel: "left-eye",
        role: "iris",
        state: "neutral",
        image,
        region: { x: 0.2, y: 0.2, width: 0.02, height: 0.015 },
        visible: true,
        opacity: 0.8,
      },
    ],
  };
  const saved = await store.saveCharacter(doc.id, { ...doc, resources });
  assert.deepEqual(Buffer.from(await store.getAsset(doc.id, image.sha256)), bytes);
  await assert.rejects(
    store.saveCharacter(doc.id, {
      ...saved,
      resources: {
        ...resources,
        parts: [{ ...resources.parts[0], image: { ...image, sha256: "0".repeat(64) } }],
      },
    }),
  );
  assert.deepEqual(await store.getCharacter(doc.id), saved);
  await assert.rejects(store.uploadAsset(DEFAULT_EXAMPLE_ID, bytes));
  await assert.rejects(store.getAsset(doc.id, "../../portrait"));
});
test("resource validation rejects ambiguous states, duplicate IDs and conflicting hashes", async () => {
  const resources = (await store.getCharacter(DEFAULT_EXAMPLE_ID)).resources!;
  assert.ok(resourcesSchema.safeParse(resources).success);
  assert.equal(
    resourcesSchema.safeParse({ ...resources, parts: [...resources.parts, resources.parts[0]] })
      .success,
    false,
  );
  assert.equal(
    resourcesSchema.safeParse({
      ...resources,
      parts: [{ ...resources.parts[0], region: { x: 0.9, y: 0, width: 0.2, height: 1 } }],
    }).success,
    false,
  );
  assert.equal(
    resourcesSchema.safeParse({
      ...resources,
      parts: [{ ...resources.parts[0], channel: "mouth" }],
    }).success,
    false,
  );
  const part = resources.parts[2];
  assert.equal(
    resourcesSchema.safeParse({
      ...resources,
      parts: [
        part,
        { ...part, id: "another", image: { ...part.image, width: part.image.width + 1 } },
      ],
    }).success,
    false,
  );
});
test("drawn expression selection covers closed, half, smiling and all mouth shapes", async () => {
  const parts = (await store.getCharacter(DEFAULT_EXAMPLE_ID)).resources!.parts;
  const frames = (eyes: number) => expressionFrames(parts, "left-eye", { ...neutral, eyes });
  assert.deepEqual(
    frames(0).map((f) => f.part.state),
    ["closed"],
  );
  assert.deepEqual(frames(1), []);
  assert.deepEqual(
    frames(0.5).map((f) => f.part.state),
    ["half"],
  );
  assert.equal(
    expressionFrames(parts, "left-eye", { ...neutral, mood: "smile" }).at(-1)?.part.state,
    "smile",
  );
  for (const mouthShape of ["open", "wide", "round"] as const)
    assert.equal(
      expressionFrames(parts, "mouth", { ...neutral, mouth: 1, mouthShape }).at(-1)?.part.state,
      mouthShape,
    );
  assert.equal(
    expressionFrames(parts, "mouth", { ...neutral, mouth: 0.75, mouthShape: "round" })[0].weight,
    1,
  );
  assert.equal(expressionFrames(parts, "mouth", { ...neutral, mouth: 0.25 })[0].weight, 0.5);
});
test("independent spring motion affects masked hair while leaving face and clothing fixed", async () => {
  const doc = await store.getCharacter(DEFAULT_EXAMPLE_ID),
    mask = { width: 10, height: 10, values: new Uint8Array(100) };
  mask.values[4 * 10 + 2] = 255;
  doc.resources!.hair = {
    strength: 1,
    strands: [
      {
        id: "guide",
        name: "Guide",
        points: [
          { x: 0.2, y: 0.1 },
          { x: 0.2, y: 0.45 },
        ],
        radius: 0.1,
        stiffness: 0.65,
      },
    ],
  };
  const simulation = new HairDynamics(mask);
  for (let frame = 1; frame <= 120; frame++) simulation.update(doc, frame / 60);
  assert.notEqual(simulation.offset({ x: 0.2, y: 0.44 }, doc).x, 0);
  assert.deepEqual(simulation.offset({ x: 0.5, y: 0.3 }, doc), { x: 0, y: 0 });
  assert.deepEqual(simulation.offset({ x: 0.5, y: 0.8 }, doc), { x: 0, y: 0 });
  simulation.update(doc, 0);
  assert.deepEqual(simulation.offset({ x: 0.2, y: 0.44 }, doc), { x: 0, y: 0 });
});
test("the published example contains independent metadata and no legacy manifests", async () => {
  const doc = characterSchema.parse(
    JSON.parse(await readFile(resolve("public/examples/sovia/character.json"), "utf8")),
  );
  assert.ok(doc.resources);
  const names = await readdir(resolve("public/examples/sovia"));
  assert.ok(
    !names.includes("rig.json") &&
      !names.includes("layers.json") &&
      !names.includes("sprites.json"),
  );
  for (const image of resourceImages(doc.resources))
    assert.ok(
      (await readFile(join("public/examples/sovia", resourcePath(image.sha256)))).length > 0,
    );
});
