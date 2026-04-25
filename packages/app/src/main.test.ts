import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DRAW_DOCUMENT_VERSION } from "../../opentui/src/index";
import { loadDiagramInput, parseArgs } from "./main";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (!dir) continue;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("parseArgs accepts --diagram alongside existing output options", () => {
  expect(parseArgs(["--diagram", "drawing.td.json", "--fenced", "--output", "art.txt"])).toEqual({
    diagramPath: "drawing.td.json",
    fenced: true,
    help: false,
    outputPath: "art.txt",
  });
});

test("loadDiagramInput reads and parses a diagram file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "termdraw-app-test-"));
  tempDirs.push(dir);
  const path = join(dir, "diagram.td.json");
  await Bun.write(
    path,
    JSON.stringify({
      version: DRAW_DOCUMENT_VERSION,
      objects: [],
    }),
  );

  await expect(loadDiagramInput(path)).resolves.toEqual({
    version: DRAW_DOCUMENT_VERSION,
    objects: [],
  });
});

test("loadDiagramInput reads stdin when --diagram - is used", async () => {
  await expect(
    loadDiagramInput("-", async () =>
      JSON.stringify({
        version: DRAW_DOCUMENT_VERSION,
        objects: [],
      }),
    ),
  ).resolves.toEqual({
    version: DRAW_DOCUMENT_VERSION,
    objects: [],
  });
});

test("loadDiagramInput surfaces clear parse errors", async () => {
  await expect(loadDiagramInput("-", async () => '{"version":999,"objects":[]}')).rejects.toThrow(
    `Failed to load diagram from stdin: termDRAW document version must be ${DRAW_DOCUMENT_VERSION}`,
  );
});
