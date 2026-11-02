import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { characterSchema } from "@/features/characters/document";
import { fixturePng, marks } from "../tests/fixture";

test("create, animate, save, reopen and export an independent character", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "New character", exact: true }).click();
  await page
    .getByLabel("Choose character image")
    .setInputFiles({ name: "Sample character.png", mimeType: "image/png", buffer: fixturePng() });
  const canvas = page.getByRole("img", { name: "Character landmark canvas" });
  await expect(canvas).toBeVisible();
  for (const step of ["leftEye", "rightEye", "mouth", "chin", "neck", "crown"] as const) {
    const v = marks[step],
      points = Array.isArray(v) ? v : [v];
    const box = await canvas.boundingBox();
    if (!box) throw new Error("No canvas");
    const scale = Math.min(box.width / 400, box.height / 600),
      ox = box.x + (box.width - 400 * scale) / 2,
      oy = box.y + (box.height - 600 * scale) / 2;
    for (const p of points)
      await canvas.click({
        position: { x: ox - box.x + p.x * 400 * scale, y: oy - box.y + p.y * 600 * scale },
      });
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await page.getByLabel("Character name", { exact: true }).fill("End-to-end character");
  await page.getByRole("button", { name: "Create character", exact: true }).click();
  await expect(page).toHaveURL(/\/characters\/[a-f0-9-]+/);
  await expect(page.getByText("Preview ready")).toBeVisible();
  const id = page.url().split("/").pop()!;
  const original = characterSchema.parse(await (await request.get(`/api/characters/${id}`)).json());
  expect(original.format).toBe("studio.character/v1");
  await page.getByRole("button", { name: "Play motion", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByLabel("Character name", { exact: true }).fill("Saved character");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Saved locally");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Saved character", exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export character", exact: true }).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toBe("Saved character.avatarstudio");
  const archivePath = await exported.path();
  if (!archivePath) throw new Error("The character archive was not downloaded.");
  await page.getByRole("tab", { name: "Motion preview" }).click();
  await expect(page.getByTestId("avatar-preview")).toBeVisible();
  await page.screenshot({ path: "projects/.review/new-studio-editor.png", fullPage: true });
  await page.goto("/");
  await page.getByLabel("Import character archive file").setInputFiles({
    name: "character.avatarstudio",
    mimeType: "application/x-avatar-studio",
    buffer: await readFile(archivePath),
  });
  await expect(page).toHaveURL(/\/characters\/[a-f0-9-]+/);
  const importedId = page.url().split("/").pop()!;
  expect(importedId).not.toBe(id);
  const imported = await (await request.get(`/api/characters/${importedId}`)).json();
  expect(imported.landmarks).toEqual(original.landmarks);
  expect(imported.artwork.sha256).toBe(original.artwork.sha256);
  await expect(page.getByText("Preview ready")).toBeVisible();
  expect(errors).toEqual([]);
});
test("reject invalid data, cross-site writes and conflicting saves", async ({ request }) => {
  const response = await request.post("/api/characters", {
    multipart: {
      name: "API test",
      landmarks: JSON.stringify(marks),
      image: { name: "fixture.png", mimeType: "image/png", buffer: fixturePng() },
    },
  });
  expect(response.status()).toBe(201);
  const doc = await response.json();
  expect(
    (
      await request.put(`/api/characters/${doc.id}`, { data: { ...doc, name: "changed" } })
    ).status(),
  ).toBe(200);
  expect((await request.put(`/api/characters/${doc.id}`, { data: doc })).status()).toBe(409);
  expect(
    (
      await request.post("/api/characters", {
        headers: { Origin: "https://example.com" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/characters", {
        multipart: {
          name: "bad",
          landmarks: "{}",
          image: { name: "bad.png", mimeType: "image/png", buffer: fixturePng() },
        },
      })
    ).status(),
  ).toBe(400);
});
test("library fits mobile and shows local-only creation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Library." })).toBeVisible();
  await expect(page.getByRole("button", { name: "New character", exact: true })).toBeVisible();
  await expect(page.getByText("Loading local characters…", { exact: true })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "projects/.review/new-studio-mobile.png", fullPage: true });
});
