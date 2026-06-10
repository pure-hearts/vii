import ora, { Ora } from "ora";

export interface CloneProgressInfo {
  percent: number;
  speed: string;
  size: string;
}

export function createCloneSpinner(repoLabel: string, branchLabel: string, mirrorLabel: string) {
  const isCI = !!process.env.CI;
  const isTTY = !!process.stdout.isTTY;
  const useSpinner = isTTY && !isCI;

  let spinner: Ora | null = null;
  const labelPrefix = `正在下载 ${repoLabel}${branchLabel ? ` (分支: ${branchLabel})` : ""}`;
  const suffix = mirrorLabel ? ` [通过 ${mirrorLabel} 加速]` : "";

  if (useSpinner) {
    spinner = ora(`${labelPrefix}...${suffix}`).start();
  } else {
    console.log(`⌛ ${labelPrefix}...${suffix}`);
  }

  // 节流控制：限制 100ms 刷新一次
  let lastUpdateTime = 0;
  const THROTTLE_MS = 100;

  return {
    update(info: Partial<CloneProgressInfo>) {
      const now = Date.now();
      // 如果不是 100% 且距离上次更新不足 100ms，则跳过刷新以防终端闪烁
      if (info.percent !== 100 && now - lastUpdateTime < THROTTLE_MS) {
        return;
      }
      lastUpdateTime = now;

      const percentStr = info.percent !== undefined ? ` ${info.percent}%` : "";
      const metricsParts: string[] = [];
      if (info.size) metricsParts.push(info.size);
      if (info.speed) metricsParts.push(info.speed);
      const metricsStr = metricsParts.length > 0 ? ` (${metricsParts.join(", ")})` : "";

      const text = `${labelPrefix}...${percentStr}${metricsStr}${suffix}`;

      if (spinner) {
        spinner.text = text;
      }
    },

    warn(message: string) {
      if (spinner) {
        spinner.warn(message);
        // 重新启动 spinner 实例，保持旋转
        spinner.start();
      } else {
        console.warn(`⚠️  ${message}`);
      }
    },

    succeed(durationSeconds: string) {
      const successText = `下载 ${repoLabel} 成功 (耗时 ${durationSeconds}s)`;
      if (spinner) {
        spinner.succeed(successText);
      } else {
        console.log(`✔ ${successText}`);
      }
    },

    fail(message: string, adviceTip?: string) {
      const failText = `下载 ${repoLabel} 失败`;
      if (spinner) {
        spinner.fail(failText);
      } else {
        console.error(`✖ ${failText}`);
      }
      if (message) {
        console.error(`\x1b[31m${message}\x1b[0m`);
      }
      if (adviceTip) {
        console.log(`\n\x1b[36m${adviceTip}\x1b[0m`);
      }
    },

    stop() {
      if (spinner) {
        spinner.stop();
      }
    },
  };
}
