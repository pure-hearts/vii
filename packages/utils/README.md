# @vyron/utils

> 通用工具函数

## Install

```bash
pnpm add @vyron/utils
```

## Usage

```typescript
import { getStorage, setStorage } from "@vyron/utils";

// 存储数据
setStorage("key", "value");

// 读取数据
const value = getStorage("key");

// 读取数据（带默认值）
const value = getStorage("key", "default");
```

## License

MIT
