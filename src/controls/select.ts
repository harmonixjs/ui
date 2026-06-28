import {
  ActionRowBuilder,
  AnyComponentBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from "discord.js";
import { createCustomId } from "../customIds";
import {
  Awaitable,
  LabelResolver,
  ViewControl,
  ViewInteractionContext,
  ViewRenderContext
} from "../types";
import { getTargetState, resolveLabel, setTargetState } from "./utils";

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  default?: boolean;
  emoji?: string;
}

export interface SelectOptions<State extends Record<string, any>, Data> {
  id: string;
  target?: string;
  placeholder?: LabelResolver<State, Data>;
  minValues?: number;
  maxValues?: number;
  disabled?: boolean | ((context: ViewRenderContext<State, Data>) => boolean);
  options: SelectOption[] | ((context: ViewRenderContext<State, Data>) => Awaitable<SelectOption[]>);
  onSelect?: (context: ViewInteractionContext<State, Data>, values: string[]) => Awaitable<void>;
}

export function select<State extends Record<string, any>, Data = unknown>(
  options: SelectOptions<State, Data>
): ViewControl<State, Data> {
  const target = options.target ?? options.id;

  return {
    id: options.id,
    target,
    async render(context) {
      const selectOptions = (await resolveOptions(options, context)).slice(0, 25);
      if (selectOptions.length === 0) return [];

      const menu = new StringSelectMenuBuilder()
        .setCustomId(createCustomId(context.viewId, options.id, "select"))
        .setPlaceholder(resolveLabel(options.placeholder, context, "Select an option"))
        .setMinValues(options.minValues ?? 1)
        .setMaxValues(options.maxValues ?? Math.max(1, Math.min(selectOptions.length, 1)))
        .setDisabled(resolveDisabled(options, context))
        .addOptions(selectOptions.map(option => {
          const builder = new StringSelectMenuOptionBuilder()
            .setLabel(option.label)
            .setValue(option.value)
            .setDefault(option.default ?? getTargetState(context.state, target).values?.includes(option.value));

          if (option.description) builder.setDescription(option.description);
          if (option.emoji) builder.setEmoji(option.emoji);
          return builder;
        }));

      return [new ActionRowBuilder<AnyComponentBuilder>().addComponents(menu)];
    },
    async handle(context) {
      if (!("values" in context.interaction)) return;

      const values = context.interaction.values as string[];
      if (options.onSelect) {
        await options.onSelect(context, values);
      } else {
        context.setState(state => setTargetState(state, target, { values }));
      }

      await context.update();
    }
  };
}

async function resolveOptions<State extends Record<string, any>, Data>(
  options: SelectOptions<State, Data>,
  context: ViewRenderContext<State, Data>
): Promise<SelectOption[]> {
  return typeof options.options === "function"
    ? await options.options(context)
    : options.options;
}

function resolveDisabled<State extends Record<string, any>, Data>(
  options: SelectOptions<State, Data>,
  context: ViewRenderContext<State, Data>
): boolean {
  return typeof options.disabled === "function"
    ? options.disabled(context)
    : options.disabled ?? false;
}
