import {
  ActionRowBuilder,
  AnyComponentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle
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

export interface SearchableSelectLabels<State, Data> {
  placeholder?: LabelResolver<State, Data>;
  search?: LabelResolver<State, Data>;
  clear?: LabelResolver<State, Data>;
  previous?: LabelResolver<State, Data>;
  next?: LabelResolver<State, Data>;
  modalTitle?: LabelResolver<State, Data>;
  modalInput?: LabelResolver<State, Data>;
}

export interface SearchableSelectOptions<Item, State extends Record<string, any>, Data> {
  id: string;
  target?: string;
  items: Item[] | ((context: ViewRenderContext<State, Data>) => Awaitable<Item[]>);
  pageSize?: number;
  minValues?: number;
  maxValues?: number;
  labels?: SearchableSelectLabels<State, Data>;
  getLabel: (item: Item, context: ViewRenderContext<State, Data>) => string;
  getValue: (item: Item, context: ViewRenderContext<State, Data>) => string;
  getDescription?: (item: Item, context: ViewRenderContext<State, Data>) => string | undefined;
  filter?: (item: Item, query: string, context: ViewRenderContext<State, Data>) => boolean;
  onSelect?: (context: ViewInteractionContext<State, Data>, values: string[], items: Item[]) => Awaitable<void>;
}

export function searchableSelect<
  Item,
  State extends Record<string, any>,
  Data = unknown
>(options: SearchableSelectOptions<Item, State, Data>): ViewControl<State, Data> {
  const target = options.target ?? options.id;

  return {
    id: options.id,
    target,
    async render(context) {
      const current = getTargetState(context.state, target);
      const pageSize = Math.max(1, Math.min(options.pageSize ?? 25, 25));
      const items = await resolveItems(options, context);
      const filteredItems = filterItems(options, items, current.query ?? "", context);
      const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
      const page = Math.min(current.page ?? 0, totalPages - 1);
      const pageItems = filteredItems.slice(page * pageSize, page * pageSize + pageSize);
      const rows: ActionRowBuilder<AnyComponentBuilder>[] = [];

      if (pageItems.length > 0) {
        rows.push(new ActionRowBuilder<AnyComponentBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(createCustomId(context.viewId, options.id, "select"))
            .setPlaceholder(resolveLabel(options.labels?.placeholder, context, "Select items"))
            .setMinValues(options.minValues ?? 0)
            .setMaxValues(options.maxValues ?? Math.max(1, Math.min(pageItems.length, pageSize)))
            .addOptions(pageItems.map(item => {
              const value = options.getValue(item, context);
              const option = new StringSelectMenuOptionBuilder()
                .setLabel(options.getLabel(item, context))
                .setValue(value)
                .setDefault(current.values?.includes(value) ?? false);
              const description = options.getDescription?.(item, context);

              if (description) option.setDescription(description);
              return option;
            }))
        ));
      }

      rows.push(new ActionRowBuilder<AnyComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(createCustomId(context.viewId, options.id, "search"))
          .setLabel(resolveLabel(options.labels?.search, context, "Search"))
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(createCustomId(context.viewId, options.id, "clear"))
          .setLabel(resolveLabel(options.labels?.clear, context, "Clear"))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!current.query),
        new ButtonBuilder()
          .setCustomId(createCustomId(context.viewId, options.id, "previous"))
          .setLabel(resolveLabel(options.labels?.previous, context, "Previous"))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(createCustomId(context.viewId, options.id, "next"))
          .setLabel(resolveLabel(options.labels?.next, context, "Next"))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1)
      ));

      return rows;
    },
    async handle(context) {
      const current = getTargetState(context.state, target);

      if (context.action === "select" && "values" in context.interaction) {
        const values = context.interaction.values as string[];
        const items = await resolveItems(options, context);
        const selectedItems = items.filter(item => values.includes(options.getValue(item, context)));

        if (options.onSelect) {
          await options.onSelect(context, values, selectedItems);
        } else {
          context.setState(state => setTargetState(state, target, { values }));
        }

        await context.update();
        return;
      }

      if (context.action === "search") {
        await openSearchModal(options, context, target);
        return;
      }

      const nextPatch = context.action === "clear"
        ? { query: "", page: 0 }
        : context.action === "previous"
          ? { page: Math.max(0, (current.page ?? 0) - 1) }
          : { page: (current.page ?? 0) + 1 };

      context.setState(state => setTargetState(state, target, nextPatch));
      await context.update();
    }
  };
}

async function resolveItems<Item, State extends Record<string, any>, Data>(
  options: SearchableSelectOptions<Item, State, Data>,
  context: ViewRenderContext<State, Data>
): Promise<Item[]> {
  return typeof options.items === "function"
    ? await options.items(context)
    : options.items;
}

function filterItems<Item, State extends Record<string, any>, Data>(
  options: SearchableSelectOptions<Item, State, Data>,
  items: Item[],
  query: string,
  context: ViewRenderContext<State, Data>
): Item[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return items;

  return items.filter(item => options.filter
    ? options.filter(item, query, context)
    : options.getLabel(item, context).toLowerCase().includes(normalizedQuery));
}

async function openSearchModal<Item, State extends Record<string, any>, Data>(
  options: SearchableSelectOptions<Item, State, Data>,
  context: ViewInteractionContext<State, Data>,
  target: string
): Promise<void> {
  const modalCustomId = createCustomId(context.viewId, options.id, "search-submit");
  const inputCustomId = `${options.id}-query`;
  const modal = new ModalBuilder()
    .setCustomId(modalCustomId)
    .setTitle(resolveLabel(options.labels?.modalTitle, context, "Search"))
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(inputCustomId)
          .setLabel(resolveLabel(options.labels?.modalInput, context, "Search query"))
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue(getTargetState(context.state, target).query ?? "")
      )
    );

  await (context.interaction as any).showModal(modal);

  const submitted = await (context.interaction as any).awaitModalSubmit({
    time: 60_000,
    filter: (interaction: any) =>
      interaction.customId === modalCustomId &&
      interaction.user.id === context.interaction.user.id
  }).catch(() => null);

  if (!submitted) return;

  const query = submitted.fields.getTextInputValue(inputCustomId);
  context.setState(state => setTargetState(state, target, { query, page: 0 }));
  await submitted.update(await context.render() as any);
}
