import {
  ActionRowBuilder,
  AnyComponentBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import { createCustomId } from "../customIds";
import {
  Awaitable,
  BooleanResolver,
  LabelResolver,
  ViewControl,
  ViewInteractionContext,
  ViewRenderContext
} from "../types";
import { resolveLabel } from "./utils";

export interface ActionButton<State extends Record<string, any>, Data> {
  id: string;
  label: LabelResolver<State, Data>;
  style?: ButtonStyle;
  disabled?: BooleanResolver<State, Data>;
  hidden?: BooleanResolver<State, Data>;
  onClick?: (context: ViewInteractionContext<State, Data>) => Awaitable<void>;
}

export interface ActionsOptions<State extends Record<string, any>, Data> {
  id: string;
  buttons: ActionButton<State, Data>[];
}

export function actions<State extends Record<string, any>, Data = unknown>(
  options: ActionsOptions<State, Data>
): ViewControl<State, Data> {
  return {
    id: options.id,
    render(context) {
      const buttons = options.buttons
        .filter(button => !resolveBoolean(button.hidden, context))
        .map(button => new ButtonBuilder()
          .setCustomId(createCustomId(context.viewId, options.id, button.id))
          .setLabel(resolveLabel(button.label, context, button.id))
          .setStyle(button.style ?? ButtonStyle.Secondary)
          .setDisabled(resolveBoolean(button.disabled, context)));

      return buttons.length
        ? [new ActionRowBuilder<AnyComponentBuilder>().addComponents(...buttons.slice(0, 5))]
        : [];
    },
    async handle(context) {
      const button = options.buttons.find(item => item.id === context.action);
      if (!button) return;

      await button.onClick?.(context);
      await context.update();
    }
  };
}

function resolveBoolean<State extends Record<string, any>, Data>(
  value: BooleanResolver<State, Data> | undefined,
  context: ViewRenderContext<State, Data>
): boolean {
  return typeof value === "function" ? value(context) : value ?? false;
}
