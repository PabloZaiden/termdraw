import { launchTerminal, type Session } from "tuistory";

const TERM_COLS = 120;
const TERM_ROWS = 36;

export async function launchTermdraw(args: string[] = []): Promise<Session> {
  return launchTerminal({
    command: "bun",
    args: ["run", "src/cli.tsx", ...args],
    cwd: new URL("../..", import.meta.url).pathname,
    cols: TERM_COLS,
    rows: TERM_ROWS,
    waitForDataTimeout: 10_000,
    env: {
      CI: process.env.CI,
      NO_COLOR: "1",
    },
  });
}

export async function getScreenText(session: Session): Promise<string> {
  return session.text({
    timeout: 5_000,
    trimEnd: true,
  });
}

export async function waitForChrome(session: Session): Promise<string> {
  return session.waitForText(/Select|Box|Line|Brush|Text/, {
    timeout: 10_000,
  });
}

export async function closeSessionSafely(session: Session): Promise<void> {
  try {
    session.close();
  } catch {
    // best effort cleanup in tests
  }
}
