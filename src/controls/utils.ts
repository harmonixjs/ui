import { LabelResolver, ViewRenderContext } from "../types";

export function resolveLabel<State, Data>(
  label: LabelResolver<State, Data> | undefined,
  context: ViewRenderContext<State, Data>,
  fallback: string
): string {
  if (!label) return fallback;
  return typeof label === "function" ? label(context) : label;
}

export function getTargetState<State extends Record<string, any>>(
  state: State,
  target: string
): Record<string, any> {
  return state[target] ?? {};
}

export function setTargetState<State extends Record<string, any>>(
  state: State,
  target: string,
  patch: Record<string, any>
): State {
  return {
    ...state,
    [target]: {
      ...(state[target] ?? {}),
      ...patch
    }
  };
}
