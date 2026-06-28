# Harmonix UI

Composable Discord UI views and controls for discord.js.

```bash
npm install @harmonixjs/ui
```

```ts
import {
  EmbedView,
  ComponentView,
  pagination,
  searchableSelect,
  actions
} from "@harmonixjs/ui";
```

The package is standalone and does not require `@harmonixjs/core`. Harmonix
contexts work because they expose compatible `send` and `reply` methods.
