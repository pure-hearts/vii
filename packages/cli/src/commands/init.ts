import { scaffold } from "../scaffold";
import { promptProjectName, promptTemplate, BUILTIN_TEMPLATES } from "../prompts";
import { formatTargetDir } from "../scaffold/validators";

export interface InitOptions {
  projectName?: string;
  template?: string;
  targetDir?: string;
  force?: boolean;
}

export const initCommand = {
  name: "init",
  description: "创建新项目",

  async action(options: InitOptions): Promise<void> {
    // 1. 收集用户输入
    const projectName = options.projectName ?? (await promptProjectName());
    if (!projectName) {
      console.log("\n⚠️  操作已取消。");
      return;
    }

    let template = options.template;
    if (template) {
      const found = BUILTIN_TEMPLATES.find((t) => t.name === template);
      if (found) {
        template = found.value;
      }
    } else {
      template = await promptTemplate();
    }

    if (!template) {
      console.log("\n⚠️  操作已取消。");
      return;
    }

    const targetDir = options.targetDir ?? formatTargetDir(`./${projectName}`);
    const force = options.force ?? false;

    // 2. 执行脚手架
    await scaffold({
      projectName,
      template,
      targetDir,
      force,
    });
  },
};
