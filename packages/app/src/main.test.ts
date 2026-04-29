import { expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { version as appVersion } from "../package.json";
import { buildCliHelpText, parseArgs, runTermDrawAppCli } from "./main";

test("parseArgs accepts --version and -v", () => {
  expect(parseArgs(["--version"])).toEqual({
    fenced: false,
    help: false,
    version: true,
  });

  expect(parseArgs(["-v"])).toEqual({
    fenced: false,
    help: false,
    version: true,
  });
});

test("parseArgs keeps the last output formatting flag", () => {
  expect(parseArgs(["--fenced", "--plain"])).toEqual({
    fenced: false,
    help: false,
    version: false,
  });

  expect(parseArgs(["--plain", "--fenced"])).toEqual({
    fenced: true,
    help: false,
    version: false,
  });
});

test("parseArgs rejects missing output values and unknown args", () => {
  expect(() => parseArgs(["--output"])).toThrow("Missing value for --output");
  expect(() => parseArgs(["--wat"])).toThrow("Unknown argument: --wat");
});

test("buildCliHelpText only shows CLI options", () => {
  const help = buildCliHelpText();

  expect(help).toContain("--version");
  expect(help).toContain("--output");
  expect(help).not.toContain("Controls:");
  expect(help).not.toContain("right palette");
  expect(help).not.toContain("Ctrl+T / Tab");
});

test("runTermDrawAppCli prints help without starting the renderer", async () => {
  const stdoutWrites: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutWrites.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stdout.write;

  try {
    await runTermDrawAppCli(["--help"]);
  } finally {
    process.stdout.write = originalWrite;
  }

  expect(stdoutWrites.join("")).toBe(buildCliHelpText("termdraw"));
});

test("runTermDrawAppCli prints the current version", async () => {
  const stdoutWrites: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdoutWrites.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stdout.write;

  try {
    await runTermDrawAppCli(["--version"]);
  } finally {
    process.stdout.write = originalWrite;
  }

  expect(stdoutWrites.join("")).toBe(`${appVersion}\n`);
});

test("with --output parseArgs records the destination path", () => {
  expect(parseArgs(["--output", "diagram.txt"])).toEqual({
    outputPath: "diagram.txt",
    fenced: false,
    help: false,
    version: false,
  });
});

test("help text can be written to a file-like destination path via normal parsing", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "termdraw-main-test-"));
  const outputPath = join(tempDir, "diagram.txt");

  try {
    expect(parseArgs(["--output", outputPath])).toEqual({
      outputPath,
      fenced: false,
      help: false,
      version: false,
    });
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
