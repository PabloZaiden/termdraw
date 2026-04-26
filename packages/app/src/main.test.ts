import { expect, test } from "bun:test";
import { parseArgs, runTermDrawAppCli } from "./main";

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
