import { code } from "@streamdown/code";

import { DescriptionImage } from "@/components/DescriptionImage";

/** Shared Streamdown plugins — syntax-highlighted code blocks via Shiki. */
export const streamdownPlugins = { code };

/** Shared Streamdown component overrides. */
export const streamdownComponents = { img: DescriptionImage };
