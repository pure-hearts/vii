import prompts from "prompts";

// 内置模板列表
export const BUILTIN_TEMPLATES = [
  {
    name: "vue-pc",
    value: "github:vfiee/project-boilerplate#vue-pc",
    description: "Vue 3 PC Template",
  },
  {
    name: "vue-mobile",
    value: "github:vfiee/project-boilerplate#vue-mobile",
    description: "Vue 3 Mobile Template",
  },
  {
    name: "nest-ts",
    value: "github:vfiee/project-boilerplate#nest-ts",
    description: "NestJS TypeScript Template",
  },
  {
    name: "uniapp-ts",
    value: "github:vfiee/project-boilerplate#uniapp-ts",
    description: "uni-app TypeScript Template",
  },
];

/**
 * 询问模板选择
 */
export async function promptTemplate(): Promise<string> {
  const choices = [
    ...BUILTIN_TEMPLATES.map((t) => ({
      value: t.value,
      title: `${t.name} - ${t.description}`,
    })),
    {
      value: "custom",
      title: "自定义 GitHub 仓库地址",
    },
  ];

  const { template } = await prompts({
    type: "select",
    name: "template",
    message: "选择模板:",
    choices,
  });

  if (template === "custom") {
    const { customUrl } = await prompts({
      type: "text",
      name: "customUrl",
      message: "请输入 GitHub 仓库地址 (例如: user/repo#branch 或 完整 git 链接):",
      validate: (value: string) => (value.trim().length > 0 ? true : "输入不能为空"),
    });
    return customUrl ? customUrl.trim() : "";
  }

  return template;
}
