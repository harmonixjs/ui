import {
  APIEmbed,
  BaseMessageOptions,
  InteractionReplyOptions,
  MessageComponentInteraction,
  Message,
  MessageCreateOptions,
  ModalSubmitInteraction
} from "discord.js";

export type Awaitable<T> = T | Promise<T>;
export type TranslationResolver = (key: string, fallback?: string) => string;
export type RenderableComponent = any;

export interface ViewRenderResult extends Omit<BaseMessageOptions, "components"> {
  components?: RenderableComponent[];
  flags?: any;
}

export interface ViewRenderContext<State, Data> {
  state: State;
  data: Data;
  t: TranslationResolver;
  viewId: string;
}

export interface ViewInteractionContext<State, Data> extends ViewRenderContext<State, Data> {
  action: string;
  controlId: string;
  customId: string;
  interaction: MessageComponentInteraction | ModalSubmitInteraction;
  setState(updater: State | ((state: State) => State)): void;
  render(): Promise<ViewRenderResult>;
  update(): Promise<void>;
}

export interface ViewControl<State = any, Data = any> {
  id: string;
  target?: string;
  render(context: ViewRenderContext<State, Data>): Awaitable<RenderableComponent[]>;
  handle?(context: ViewInteractionContext<State, Data>): Awaitable<void>;
}

export interface ViewSendTarget {
  send(options: MessageCreateOptions): Promise<Message>;
}

export interface ViewReplyTarget {
  reply(options: InteractionReplyOptions & { fetchReply: true }): Promise<Message>;
}

export type ViewTarget = ViewSendTarget | ViewReplyTarget;

export type LabelResolver<State, Data> =
  | string
  | ((context: ViewRenderContext<State, Data>) => string);

export type BooleanResolver<State, Data> =
  | boolean
  | ((context: ViewRenderContext<State, Data>) => boolean);

export type EmbedResolver<State, Data> =
  | APIEmbed
  | APIEmbed[]
  | ((context: ViewRenderContext<State, Data>) => Awaitable<APIEmbed | APIEmbed[]>);

export type ComponentResolver<State, Data> =
  | RenderableComponent[]
  | ((context: ViewRenderContext<State, Data>) => Awaitable<RenderableComponent[]>);

export interface ViewOptions<State, Data> {
  id?: string;
  state?: State;
  data?: Data | (() => Awaitable<Data>);
  t?: TranslationResolver;
  timeout?: number;
  ownerOnly?: boolean;
  onUnauthorized?: (interaction: MessageComponentInteraction) => Awaitable<void>;
  onTimeout?: "disable" | "remove" | "keep";
  render: (context: ViewRenderContext<State, Data>) => Awaitable<ViewRenderResult>;
}

export interface EmbedViewOptions<State, Data>
  extends Omit<ViewOptions<State, Data>, "render"> {
  content?: LabelResolver<State, Data>;
  embeds: EmbedResolver<State, Data>;
  render?: (context: ViewRenderContext<State, Data>) => Awaitable<Omit<ViewRenderResult, "embeds">>;
}

export interface ComponentViewOptions<State, Data>
  extends Omit<ViewOptions<State, Data>, "render"> {
  content?: LabelResolver<State, Data>;
  components: ComponentResolver<State, Data>;
  render?: (context: ViewRenderContext<State, Data>) => Awaitable<Omit<ViewRenderResult, "components">>;
}
