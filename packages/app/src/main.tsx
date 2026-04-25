import { openSync } from "node:fs";
import { ReadStream } from "node:tty";
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import {
  buildHelpText,
  formatSavedOutput,
  parseDrawDocument,
  TermDrawApp,
  type DrawDocument,
} from "../../opentui/src/index.js";

export interface CliOptions {
  diagramPath?: string;
  outputPath?: string;
  fenced: boolean;
  help: boolean;
}

type StdinLike = NodeJS.ReadableStream & {
  isTTY?: boolean;
  pause(): void;
  setEncoding(encoding: BufferEncoding): void;
};

function openInteractiveStdin(): NodeJS.ReadStream {
  return new ReadStream(openSync("/dev/tty", "r"));
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    fenced: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--fenced") {
      options.fenced = true;
      continue;
    }

    if (arg === "--plain") {
      options.fenced = false;
      continue;
    }

    if (arg === "-o" || arg === "--output") {
      const outputPath = argv[i + 1];
      if (!outputPath) {
        throw new Error(`Missing value for ${arg}`);
      }
      options.outputPath = outputPath;
      i += 1;
      continue;
    }

    if (arg === "--diagram") {
      const diagramPath = argv[i + 1];
      if (!diagramPath) {
        throw new Error(`Missing value for ${arg}`);
      }
      options.diagramPath = diagramPath;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function withTrailingNewline(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`;
}

export async function readTextFromStdin(stdin: StdinLike = process.stdin): Promise<string> {
  let text = "";
  stdin.setEncoding("utf8");

  try {
    for await (const chunk of stdin) {
      text += chunk;
    }
  } finally {
    stdin.pause();
  }

  return text;
}

export function shouldUseInteractiveTtyInput(
  diagramPath: string | undefined,
  stdin: Pick<StdinLike, "isTTY"> = process.stdin,
): boolean {
  return diagramPath === "-" && !stdin.isTTY;
}

export async function loadDiagramInput(
  path: string,
  readFromStdin: () => Promise<string> = readTextFromStdin,
): Promise<DrawDocument> {
  const sourceLabel = path === "-" ? "stdin" : path;

  let content: string;
  try {
    content = path === "-" ? await readFromStdin() : await Bun.file(path).text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read diagram from ${sourceLabel}: ${message}`);
  }

  try {
    return parseDrawDocument(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load diagram from ${sourceLabel}: ${message}`);
  }
}

function formatDiagramDocument(document: DrawDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export async function runTermDrawAppCli(argv = Bun.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);

  if (options.help) {
    process.stdout.write(buildHelpText("termdraw"));
    return;
  }

  const initialDocument = options.diagramPath
    ? await loadDiagramInput(options.diagramPath)
    : undefined;
  const initialDiagramPath =
    options.diagramPath && options.diagramPath !== "-" ? options.diagramPath : undefined;
  const interactiveStdin = shouldUseInteractiveTtyInput(options.diagramPath)
    ? openInteractiveStdin()
    : null;

  let renderer;
  try {
    renderer = await createCliRenderer({
      stdin: interactiveStdin ?? process.stdin,
      exitOnCtrlC: false,
      useMouse: true,
      enableMouseMovement: true,
      autoFocus: true,
      screenMode: "alternate-screen",
    });
  } catch (error) {
    interactiveStdin?.destroy();
    throw error;
  }

  const root = createRoot(renderer);
  let finished = false;

  const finish = async (art: string | null): Promise<void> => {
    if (finished) return;
    finished = true;

    renderer.destroy();
    interactiveStdin?.destroy();
    await new Promise((resolve) => setTimeout(resolve, 20));

    if (art === null) {
      process.stderr.write("Drawing cancelled.\n");
      process.exit(0);
    }

    const output = withTrailingNewline(formatSavedOutput(art, options.fenced));

    if (options.outputPath) {
      await Bun.write(options.outputPath, output);
      process.stderr.write(`Saved drawing to ${options.outputPath}\n`);
    } else {
      process.stdout.write(output);
    }

    process.exit(0);
  };

  root.render(
    <TermDrawApp
      width="100%"
      height="100%"
      autoFocus
      cancelOnCtrlC
      initialDocument={initialDocument}
      diagramPath={initialDiagramPath}
      onSave={(art: string) => {
        void finish(art);
      }}
      onSaveDiagram={async (document, path) => {
        await Bun.write(path, formatDiagramDocument(document));
      }}
      onCancel={() => {
        void finish(null);
      }}
    />,
  );
}
