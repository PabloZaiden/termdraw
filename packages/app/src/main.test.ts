import { expect, test } from "bun:test";
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

test("buildCliHelpText only shows CLI options", () => {
  const help = buildCliHelpText();

  expect(help).toContain("--version");
  expect(help).toContain("--output");
  expect(help).not.toContain("Controls:");
  expect(help).not.toContain("right palette");
  expect(help).not.toContain("Ctrl+T / Tab");
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

  expect(stdoutWrites.join("")).toBe("0.3.4\n");
});
