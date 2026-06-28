import { MessageFlags } from "discord.js";
import { ComponentViewOptions, ViewRenderContext, ViewRenderResult } from "./types";
import { View } from "./View";

export class ComponentView<
  State extends Record<string, any> = Record<string, any>,
  Data = unknown
> extends View<State, Data> {
  constructor(options: ComponentViewOptions<State, Data>) {
    super({
      ...options,
      render: async context => renderComponentView(options, context)
    });
  }
}

async function renderComponentView<State, Data>(
  options: ComponentViewOptions<State, Data>,
  context: ViewRenderContext<State, Data>
): Promise<ViewRenderResult> {
  const extra = await options.render?.(context);
  const components = typeof options.components === "function"
    ? await options.components(context)
    : options.components;
  const content = typeof options.content === "function"
    ? options.content(context)
    : options.content;

  return {
    ...extra,
    content: extra?.content ?? content,
    flags: extra?.flags ?? MessageFlags.IsComponentsV2,
    components
  };
}
