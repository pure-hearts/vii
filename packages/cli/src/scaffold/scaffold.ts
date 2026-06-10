import { formatTargetDir, validateProjectName, validateTargetDir } from "./validators";
import { downloadTemplate } from "./download";
import { emptyDir, isEmpty } from "./fs/empty";
import type { ScaffoldOptions } from "./types";
import { logger } from "../utils";

/**
 * 脚手架主逻辑
 */
export async function scaffold(options: ScaffoldOptions): Promise<void> {
  const { projectName, template, targetDir, force = false, mirror } = options;

  // 格式化路径
  const formattedTargetDir = formatTargetDir(targetDir);

  // 验证项目名
  if (!validateProjectName(projectName)) {
    throw new Error(`无效的项目名: ${projectName}`);
  }

  // 验证目标目录
  const validation = validateTargetDir(formattedTargetDir, force);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // 如果目录存在且不为空，先清空
  if (!isEmpty(formattedTargetDir)) {
    emptyDir(formattedTargetDir);
  }

  // 下载模板
  await downloadTemplate(template, formattedTargetDir, mirror);

  logger.success(`项目 ${projectName} 已创建在 ${formattedTargetDir}`);
}
