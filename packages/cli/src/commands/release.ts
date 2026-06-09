import { release } from "../../../release/src/index.js";
import type { ReleaseOptions } from "../../../release/src/types.js";

export interface ReleaseCommandOptions extends ReleaseOptions {}

export const releaseCommand = {
  name: "release",
  description: "发布新版本（类似 bumpp）",

  async action(options: ReleaseCommandOptions): Promise<void> {
    await release(options);
  },
};
