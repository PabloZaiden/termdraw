import { expect, test } from "bun:test";
import { handleKeyPress } from "./input";

function createMockKey(
  name: string,
  options: Partial<{
    raw: string;
    ctrl: boolean;
    shift: boolean;
    meta: boolean;
    option: boolean;
  }> = {},
) {
  let prevented = false;

  return {
    key: {
      name,
      raw: options.raw ?? name,
      ctrl: options.ctrl ?? false,
      shift: options.shift ?? false,
      meta: options.meta ?? false,
      option: options.option ?? false,
      preventDefault: () => {
        prevented = true;
      },
    },
    wasPrevented: () => prevented,
  };
}

function createMockState(overrides: Record<string, unknown> = {}) {
  return {
    currentMode: "line",
    isTextEntryArmed: false,
    isEditingText: false,
    hasSelectedObject: false,
    clearSelection: () => {},
    cycleMode: () => {},
    setMode: () => {},
    undo: () => {},
    redo: () => {},
    clearCanvas: () => {},
    deleteSelectedObject: () => {},
    moveSelectedObjectBy: () => {},
    moveCursor: () => {},
    cycleBoxStyle: () => {},
    cycleLineStyle: () => {},
    stampBrushAtCursor: () => {},
    eraseAtCursor: () => {},
    cycleBrush: () => {},
    cycleTextBorderMode: () => {},
    backspace: () => {},
    deleteAtCursor: () => {},
    insertCharacter: () => {},
    ...overrides,
  };
}

test("handleKeyPress clears selection on Escape", () => {
  let cleared = 0;
  let renders = 0;
  let dismissed = 0;
  const { key, wasPrevented } = createMockKey("escape", { raw: "\u001b" });

  const handled = handleKeyPress({
    key: key as never,
    state: createMockState({
      clearSelection: () => {
        cleared += 1;
      },
    }) as never,
    cancelOnCtrlCEnabled: true,
    onSave: null,
    onCancel: null,
    requestRender: () => {
      renders += 1;
    },
    dismissStartupLogo: () => {
      dismissed += 1;
    },
  });

  expect(handled).toBe(true);
  expect(wasPrevented()).toBe(true);
  expect(cleared).toBe(1);
  expect(renders).toBe(1);
  expect(dismissed).toBe(1);
});

test("handleKeyPress invokes cancel on Ctrl+Q", () => {
  let cancelled = 0;
  const { key, wasPrevented } = createMockKey("q", { ctrl: true });

  const handled = handleKeyPress({
    key: key as never,
    state: createMockState() as never,
    cancelOnCtrlCEnabled: true,
    onSave: null,
    onCancel: () => {
      cancelled += 1;
    },
    requestRender: () => {},
    dismissStartupLogo: () => {},
  });

  expect(handled).toBe(true);
  expect(wasPrevented()).toBe(true);
  expect(cancelled).toBe(1);
});

test("handleKeyPress invokes save on Ctrl+S", () => {
  let saved = 0;
  const { key, wasPrevented } = createMockKey("s", { ctrl: true });

  const handled = handleKeyPress({
    key: key as never,
    state: createMockState() as never,
    cancelOnCtrlCEnabled: true,
    onSave: () => {
      saved += 1;
    },
    onCancel: null,
    requestRender: () => {},
    dismissStartupLogo: () => {},
  });

  expect(handled).toBe(true);
  expect(wasPrevented()).toBe(true);
  expect(saved).toBe(1);
});

test("handleKeyPress switches tools with hotkeys outside text entry", () => {
  let mode: string | null = null;
  let renders = 0;
  const { key, wasPrevented } = createMockKey("b", { raw: "b" });

  const handled = handleKeyPress({
    key: key as never,
    state: createMockState({
      currentMode: "line",
      setMode: (next: string) => {
        mode = next;
      },
    }) as never,
    cancelOnCtrlCEnabled: true,
    onSave: null,
    onCancel: null,
    requestRender: () => {
      renders += 1;
    },
    dismissStartupLogo: () => {},
  });

  expect(handled).toBe(true);
  expect(wasPrevented()).toBe(true);
  expect(mode === "paint").toBe(true);
  expect(renders).toBe(1);
});

test("handleKeyPress does not switch tools while text entry is armed", () => {
  let mode: string | null = null;
  let inserted: string | null = null;
  const { key } = createMockKey("b", { raw: "b" });

  const handled = handleKeyPress({
    key: key as never,
    state: createMockState({
      currentMode: "text",
      isTextEntryArmed: true,
      setMode: (next: string) => {
        mode = next;
      },
      insertCharacter: (value: string) => {
        inserted = value;
      },
    }) as never,
    cancelOnCtrlCEnabled: true,
    onSave: null,
    onCancel: null,
    requestRender: () => {},
    dismissStartupLogo: () => {},
  });

  expect(handled).toBe(true);
  expect(mode).toBeNull();
  expect(inserted === "b").toBe(true);
});

test("handleKeyPress cycles line styles with bracket keys", () => {
  const cycles: number[] = [];
  const { key: leftKey } = createMockKey("[", { raw: "[" });
  const { key: rightKey } = createMockKey("]", { raw: "]" });
  const state = createMockState({
    currentMode: "line",
    cycleLineStyle: (delta: number) => {
      cycles.push(delta);
    },
  });

  expect(
    handleKeyPress({
      key: leftKey as never,
      state: state as never,
      cancelOnCtrlCEnabled: true,
      onSave: null,
      onCancel: null,
      requestRender: () => {},
      dismissStartupLogo: () => {},
    }),
  ).toBe(true);

  expect(
    handleKeyPress({
      key: rightKey as never,
      state: state as never,
      cancelOnCtrlCEnabled: true,
      onSave: null,
      onCancel: null,
      requestRender: () => {},
      dismissStartupLogo: () => {},
    }),
  ).toBe(true);

  expect(cycles).toEqual([-1, 1]);
});

test("handleKeyPress deletes selected objects outside text editing", () => {
  let deleted = 0;
  let renders = 0;
  const { key, wasPrevented } = createMockKey("delete", { raw: "\u007f" });

  const handled = handleKeyPress({
    key: key as never,
    state: createMockState({
      hasSelectedObject: true,
      deleteSelectedObject: () => {
        deleted += 1;
      },
    }) as never,
    cancelOnCtrlCEnabled: true,
    onSave: null,
    onCancel: null,
    requestRender: () => {
      renders += 1;
    },
    dismissStartupLogo: () => {},
  });

  expect(handled).toBe(true);
  expect(wasPrevented()).toBe(true);
  expect(deleted).toBe(1);
  expect(renders).toBe(1);
});

test("handleKeyPress inserts printable text in text mode when entry is armed", () => {
  const inserted: string[] = [];
  let renders = 0;
  const { key, wasPrevented } = createMockKey("a", { raw: "a" });

  const handled = handleKeyPress({
    key: key as never,
    state: createMockState({
      currentMode: "text",
      isTextEntryArmed: true,
      insertCharacter: (value: string) => {
        inserted.push(value);
      },
    }) as never,
    cancelOnCtrlCEnabled: true,
    onSave: null,
    onCancel: null,
    requestRender: () => {
      renders += 1;
    },
    dismissStartupLogo: () => {},
  });

  expect(handled).toBe(true);
  expect(wasPrevented()).toBe(true);
  expect(inserted).toEqual(["a"]);
  expect(renders).toBe(1);
});
