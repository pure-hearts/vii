import { writeFileSync } from "node:fs";

/**
 * 写入文件
 */
export function writeFile(file: string, content: string): void {
  writeFileSync(file, content, "utf-8");
}
