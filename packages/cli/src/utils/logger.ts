export const logger = {
  info(message: string): void {
    console.log(`\x1b[36mℹ️  ${message}\x1b[0m`);
  },
  success(message: string): void {
    console.log(`\x1b[32m✅ ${message}\x1b[0m`);
  },
  error(message: string): void {
    console.error(`\x1b[31m❌ ${message}\x1b[0m`);
  },
  warn(message: string): void {
    console.warn(`\x1b[33m⚠️  ${message}\x1b[0m`);
  },
};
