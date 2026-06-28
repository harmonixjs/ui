import {
  ActionRowBuilder,
  MessageComponentInteraction,
  Message,
} from "discord.js";
import { createViewId, isViewCustomId, parseCustomId } from "./customIds";
import {
  Awaitable,
  ViewControl,
  ViewInteractionContext,
  ViewOptions,
  RenderableComponent,
  ViewRenderContext,
  ViewRenderResult,
  ViewTarget
} from "./types";

export class View<State extends Record<string, any> = Record<string, any>, Data = unknown> {
  public readonly id: string;
  protected state: State;
  protected controls: Map<string, ViewControl<State, Data>> = new Map();
  protected options: ViewOptions<State, Data>;

  constructor(options: ViewOptions<State, Data>) {
    this.id = options.id ?? createViewId();
    this.state = options.state ?? ({} as State);
    this.options = options;
  }

  use(control: ViewControl<State, Data>): this {
    if (this.controls.has(control.id)) {
      throw new Error(`View control '${control.id}' is already registered.`);
    }

    this.controls.set(control.id, control);
    return this;
  }

  getState(): State {
    return this.state;
  }

  setState(updater: State | ((state: State) => State)): this {
    this.state = typeof updater === "function"
      ? (updater as (state: State) => State)(this.state)
      : updater;

    return this;
  }

  async send(target: ViewTarget): Promise<Message> {
    const message = "send" in target
      ? await target.send(await this.renderMessage() as any)
      : await target.reply({
          ...await this.renderMessage(),
          fetchReply: true
        } as any);

    this.createCollector(message);
    return message;
  }

  async renderMessage(): Promise<ViewRenderResult> {
    const context = await this.createRenderContext();
    const base = await this.options.render(context);
    const controlRows = await this.renderControls(context);

    return {
      ...base,
      components: [
        ...(base.components ?? []),
        ...controlRows
      ].slice(0, 5)
    };
  }

  protected async createRenderContext(): Promise<ViewRenderContext<State, Data>> {
    return {
      state: this.state,
      data: await this.resolveData(),
      t: this.options.t ?? ((key, fallback) => fallback ?? key),
      viewId: this.id
    };
  }

  protected async resolveData(): Promise<Data> {
    if (typeof this.options.data === "function") {
      return await (this.options.data as () => Awaitable<Data>)();
    }

    return this.options.data as Data;
  }

  protected async renderControls(
    context: ViewRenderContext<State, Data>
  ): Promise<RenderableComponent[]> {
    const rows: RenderableComponent[] = [];

    for (const control of this.controls.values()) {
      rows.push(...await control.render(context));
    }

    return rows;
  }

  protected createCollector(message: Message): void {
    const collector = message.createMessageComponentCollector({
      time: this.options.timeout ?? 120_000,
      filter: async interaction => {
        if (!isViewCustomId(interaction.customId, this.id)) {
          return false;
        }

        if (
          this.options.ownerOnly &&
          message.interaction?.user?.id &&
          interaction.user.id !== message.interaction.user.id
        ) {
          await this.options.onUnauthorized?.(interaction);
          return false;
        }

        return true;
      }
    });

    collector.on("collect", async interaction => {
      await this.handleInteraction(interaction);
    });

    collector.on("end", async () => {
      if (this.options.onTimeout === "keep") return;

      const rendered = await this.renderMessage();
      const components = this.options.onTimeout === "remove"
        ? []
        : disableRows(rendered.components ?? []);

      await message.edit({
        ...rendered,
        components: components as any
      }).catch(() => undefined);
    });
  }

  protected async handleInteraction(
    interaction: MessageComponentInteraction
  ): Promise<void> {
    const parsed = parseCustomId(interaction.customId);
    if (!parsed || parsed.viewId !== this.id) return;

    const control = this.controls.get(parsed.controlId);
    if (!control?.handle) return;

    const baseContext = await this.createRenderContext();
    const context: ViewInteractionContext<State, Data> = {
      ...baseContext,
      action: parsed.action,
      controlId: parsed.controlId,
      customId: interaction.customId,
      interaction,
      setState: updater => this.setState(updater),
      render: async () => this.renderMessage(),
      update: async () => {
        await interaction.update(await this.renderMessage() as any);
      }
    };

    await control.handle(context);
  }
}

function disableRows(
  rows: RenderableComponent[]
): RenderableComponent[] {
  return rows.map(row => {
    if (!("components" in row)) {
      return row;
    }

    const cloned = ActionRowBuilder.from(row as any) as ActionRowBuilder<any>;

    cloned.components.forEach(component => {
      if ("setDisabled" in component) {
        (component as any).setDisabled(true);
      }
    });

    return cloned;
  });
}
