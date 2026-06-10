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
  const { template } = await prompts({
    type: "select",
    name: "template",
    message: "选择模板:",
    choices: BUILTIN_TEMPLATES.map((t) => ({
      value: t.value,
      title: `${t.name} - ${t.description}`,
    })),
  });

  return template;
}
