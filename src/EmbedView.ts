import { APIEmbed } from "discord.js";
import { View } from "./View";
import { EmbedViewOptions, ViewRenderContext, ViewRenderResult } from "./types";

export class EmbedView<
  State extends Record<string, any> = Record<string, any>,
  Data = unknown
> extends View<State, Data> {
  constructor(options: EmbedViewOptions<State, Data>) {
    super({
      ...options,
      render: async context => renderEmbedView(options, context)
    });
  }
}

async function renderEmbedView<State, Data>(
  options: EmbedViewOptions<State, Data>,
  context: ViewRenderContext<State, Data>
): Promise<ViewRenderResult> {
  const extra = await options.render?.(context);
  const embeds = typeof options.embeds === "function"
    ? await options.embeds(context)
    : options.embeds;
  const content = typeof options.content === "function"
    ? options.content(context)
    : options.content;

  return {
    ...extra,
    content: extra?.content ?? content,
    embeds: Array.isArray(embeds)
      ? embeds as APIEmbed[]
      : [embeds as APIEmbed]
  };
}
