// Local compatibility shim for workspace typechecking.
//
// The upstream OpenTUI React packages we consume expose runtime JS and some declaration files,
// but TypeScript does not resolve enough typed surface area for this repo's direct source usage:
// - `@opentui/react` resolves as an untyped JS module during workspace typecheck
// - `@opentui/react/test-utils` lacks the concrete test helper types this repo uses
// - `@opentui/react/jsx-runtime` and custom intrinsic elements used by Pi islands are not
//   available to the compiler here
// - Bun globals and `bun:test` are not consistently discovered across package tsconfig setups
//
// Keep this file intentionally narrow: only declare the pieces this workspace imports so local
// validation passes without trying to fully retype upstream packages.
declare function queueMicrotask(callback: () => void): void;

declare const Bun: {
  argv: string[];
  write(destination: string, data: string): Promise<number>;
};

declare module "bun:test" {
  export const expect: any;

  export function test(name: string, fn: (...args: any[]) => any): void;
  export function describe(name: string, fn: () => void): void;
}

declare module "@opentui/react" {
  import type * as React from "react";

  export interface OpenTUIComponents {}

  export function extend(components: Record<string, unknown>): void;

  export function createRoot(renderer: unknown): {
    render(node: React.ReactNode): void;
    unmount(): void;
  };
}

declare module "@opentui/react/test-utils" {
  import type * as React from "react";

  export interface OpenTUITestRenderResult {
    captureCharFrame(): string;
    renderOnce(): Promise<void>;
    mockInput: {
      pressEnter(): void;
      pressKey(key: string): void;
    };
  }

  export function testRender(
    node: React.ReactNode,
    testRendererOptions: Record<string, unknown>,
  ): Promise<OpenTUITestRenderResult>;
}

declare module "@opentui/react/jsx-runtime" {
  export const Fragment: unique symbol;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
