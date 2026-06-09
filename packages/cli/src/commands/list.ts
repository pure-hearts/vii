import { BUILTIN_TEMPLATES } from "../prompts/template";

export const listCommand = {
  name: "list",
  description: "查看可用的项目模板列表",

  async action(): Promise<void> {
    console.log("\n📋 可用项目模板列表:");
    for (const t of BUILTIN_TEMPLATES) {
      console.log(`  - ${t.name.padEnd(8)}: ${t.description} (${t.value})`);
    }
    console.log();
  },
};
