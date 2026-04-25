import { expect, test } from "bun:test";
import type { KeyEvent } from "@opentui/core";
import { handleDiagramSavePromptKey } from "./input";
import type { DiagramSavePromptState } from "./types";

function createKeyEvent(
  name: string,
  overrides: Partial<KeyEvent> = {},
): { event: KeyEvent; wasPrevented: () => boolean } {
  let prevented = false;

  return {
    event: {
      name,
      ctrl: false,
      meta: false,
      shift: false,
      option: false,
      sequence: "",
      number: false,
      raw: "",
      eventType: "press",
      source: "raw",
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {},
      ...overrides,
    } as KeyEvent,
    wasPrevented: () => prevented,
  };
}

test("handleDiagramSavePromptKey cancels the prompt for esc keys", () => {
  const prompt: DiagramSavePromptState = {
    value: "diagram",
    error: null,
    pending: false,
  };
  const { event, wasPrevented } = createKeyEvent("esc");

  const result = handleDiagramSavePromptKey(event, prompt);

  expect(result).toEqual({
    handled: true,
    prompt: null,
    statusMessage: "Save diagram cancelled.",
  });
  expect(wasPrevented()).toBe(true);
});
