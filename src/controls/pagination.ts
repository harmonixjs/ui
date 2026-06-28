import {
  ActionRowBuilder,
  AnyComponentBuilder,
  ButtonBuilder,
  ButtonStyle
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

export interface PaginationButtonOptions<State, Data> {
  label?: LabelResolver<State, Data>;
  style?: ButtonStyle;
  hiddenWhenDisabled?: boolean;
}

export interface PaginationOptions<State extends Record<string, any>, Data> {
  id: string;
  target?: string;
  getPage?: (context: ViewRenderContext<State, Data>) => number;
  setPage?: (context: ViewInteractionContext<State, Data>, page: number) => Awaitable<void>;
  totalPages: number | ((context: ViewRenderContext<State, Data>) => Awaitable<number>);
  buttons?: {
    previous?: PaginationButtonOptions<State, Data>;
    next?: PaginationButtonOptions<State, Data>;
  };
}

export function pagination<State extends Record<string, any>, Data = unknown>(
  options: PaginationOptions<State, Data>
): ViewControl<State, Data> {
  const target = options.target ?? options.id;

  return {
    id: options.id,
    target,
    async render(context) {
      const page = getPage(options, context, target);
      const totalPages = Math.max(1, await resolveTotalPages(options, context));
      const previousDisabled = page <= 0;
      const nextDisabled = page >= totalPages - 1;
      const previousOptions = options.buttons?.previous;
      const nextOptions = options.buttons?.next;
      const components: ButtonBuilder[] = [];

      if (!previousDisabled || !previousOptions?.hiddenWhenDisabled) {
        components.push(
          new ButtonBuilder()
            .setCustomId(createCustomId(context.viewId, options.id, "previous"))
            .setLabel(resolveLabel(previousOptions?.label, context, "Previous"))
            .setStyle(previousOptions?.style ?? ButtonStyle.Secondary)
            .setDisabled(previousDisabled)
        );
      }

      if (!nextDisabled || !nextOptions?.hiddenWhenDisabled) {
        components.push(
          new ButtonBuilder()
            .setCustomId(createCustomId(context.viewId, options.id, "next"))
            .setLabel(resolveLabel(nextOptions?.label, context, "Next"))
            .setStyle(nextOptions?.style ?? ButtonStyle.Secondary)
            .setDisabled(nextDisabled)
        );
      }

      return components.length
        ? [new ActionRowBuilder<AnyComponentBuilder>().addComponents(...components)]
        : [];
    },
    async handle(context) {
      const totalPages = Math.max(1, await resolveTotalPages(options, context));
      const currentPage = getPage(options, context, target);
      const nextPage = context.action === "previous"
        ? Math.max(0, currentPage - 1)
        : Math.min(totalPages - 1, currentPage + 1);

      if (options.setPage) {
        await options.setPage(context, nextPage);
      } else {
        context.setState(state => setTargetState(state, target, { page: nextPage }));
      }

      await context.update();
    }
  };
}

function getPage<State extends Record<string, any>, Data>(
  options: PaginationOptions<State, Data>,
  context: ViewRenderContext<State, Data>,
  target: string
): number {
  return options.getPage?.(context) ?? getTargetState(context.state, target).page ?? 0;
}

async function resolveTotalPages<State extends Record<string, any>, Data>(
  options: PaginationOptions<State, Data>,
  context: ViewRenderContext<State, Data>
): Promise<number> {
  return typeof options.totalPages === "function"
    ? await options.totalPages(context)
    : options.totalPages;
}
