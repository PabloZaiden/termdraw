import { afterEach, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Session } from "tuistory";
import { closeSessionSafely, getScreenText, launchTermdraw, waitForChrome } from "./helpers";

const sessions: Session[] = [];

afterEach(async () => {
  while (sessions.length > 0) {
    const session = sessions.pop();
    if (session) {
      await closeSessionSafely(session);
    }
  }
});

test("termdraw launches with the full chrome visible", async () => {
  const session = await launchTermdraw();
  sessions.push(session);

  const text = await waitForChrome(session);

  expect(text.includes("Select")).toBe(true);
  expect(text.includes("Box")).toBe(true);
  expect(text.includes("Line")).toBe(true);
  expect(text.includes("Brush")).toBe(true);
  expect(text.includes("Text")).toBe(true);
  expect(text.includes("Ctrl+Q") || text.includes("Ctrl+S")).toBe(true);
});

test("Ctrl+Q cancels and exits cleanly", async () => {
  const session = await launchTermdraw();
  sessions.push(session);

  await waitForChrome(session);
  await session.press(["ctrl", "q"]);
  await session.waitIdle({ timeout: 1_000 });

  const output = session.readAll();
  expect(output.includes("Drawing cancelled.")).toBe(true);
  expect(session.isDead).toBe(true);
});

test("saving with --output writes a file after drawing and saving", async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "termdraw-tuistory-"));
  const outputPath = join(tempDir, "drawing.txt");

  try {
    const session = await launchTermdraw(["--output", outputPath]);
    sessions.push(session);

    await waitForChrome(session);
    await session.press("t");
    await session.press(["ctrl", "s"]);
    await session.waitIdle({ timeout: 1_500 });

    expect(session.isDead).toBe(true);
    expect(existsSync(outputPath)).toBe(true);

    const saved = readFileSync(outputPath, "utf8");
    expect(saved.endsWith("\n")).toBe(true);

    const output = session.readAll();
    expect(output.includes(`Saved drawing to ${outputPath}`)).toBe(true);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("tool hotkeys update the visible palette state", async () => {
  const session = await launchTermdraw();
  sessions.push(session);

  await waitForChrome(session);
  await session.press("t");

  const text = await getScreenText(session);
  expect(text.includes("No border")).toBe(true);
  expect(text.includes("Double")).toBe(true);
});
