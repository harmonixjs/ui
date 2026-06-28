const PREFIX = "hxui";

export interface ParsedCustomId {
  viewId: string;
  controlId: string;
  action: string;
}

export function createViewId(prefix = "view"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCustomId(viewId: string, controlId: string, action: string): string {
  return [PREFIX, viewId, controlId, action].join(":");
}

export function parseCustomId(customId: string): ParsedCustomId | null {
  const [prefix, viewId, controlId, ...actionParts] = customId.split(":");

  if (prefix !== PREFIX || !viewId || !controlId || actionParts.length === 0) {
    return null;
  }

  return {
    viewId,
    controlId,
    action: actionParts.join(":")
  };
}

export function isViewCustomId(customId: string, viewId: string): boolean {
  const parsed = parseCustomId(customId);
  return parsed?.viewId === viewId;
}
