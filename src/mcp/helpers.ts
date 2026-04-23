// Shared helpers for MCP tool handlers

import { Effect } from "effect";
import { AppLayer } from "@/composition-root";

export async function runEffect<A>(program: Effect.Effect<A, any, any>): Promise<A> {
  const exit = await Effect.runPromiseExit((program as any).pipe(Effect.provide(AppLayer)));
  if (exit._tag === "Failure") throw exit.cause;
  return exit.value;
}

export async function runEffectSafe<A>(
  program: Effect.Effect<A, any, any>,
): Promise<{ ok: true; value: A } | { ok: false; error: string }> {
  const exit = await Effect.runPromiseExit((program as any).pipe(Effect.provide(AppLayer)));
  if (exit._tag === "Failure") return { ok: false, error: String(exit.cause) };
  return { ok: true, value: exit.value };
}

export function errResult(msg: string) {
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

export function okResult(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}