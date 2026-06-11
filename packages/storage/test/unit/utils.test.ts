import { describe, it, expect } from "vitest";
import { getValueByPath, defaultSerializer } from "../../src/utils";

describe("utils 单元测试", () => {
  describe("getValueByPath", () => {
    it("空路径应返回原对象", () => {
      const obj = { a: 1 };
      expect(getValueByPath(obj, "", "default")).toBe(obj);
    });

    it("简单属性获取应正常工作", () => {
      const obj = { a: 1, b: "hello" };
      expect(getValueByPath(obj, "a", "default")).toBe(1);
      expect(getValueByPath(obj, "b", "default")).toBe("hello");
    });

    it("嵌套属性获取应正常工作", () => {
      const obj = { a: { b: { c: 42 } } };
      expect(getValueByPath(obj, "a.b.c", "default")).toBe(42);
    });

    it("数组索引获取应正常工作", () => {
      const obj = { a: [10, 20, 30] };
      expect(getValueByPath(obj, "a[0]", "default")).toBe(10);
      expect(getValueByPath(obj, "a[1]", "default")).toBe(20);
      expect(getValueByPath(obj, "a[2]", "default")).toBe(30);
    });

    it("包含引号的键名应正常解析", () => {
      const obj = { a: { "b-c": 99 } };
      expect(getValueByPath(obj, "a['b-c']", "default")).toBe(99);
      expect(getValueByPath(obj, 'a["b-c"]', "default")).toBe(99);
    });

    it("未找到属性时应返回默认值", () => {
      const obj = { a: 1 };
      expect(getValueByPath(obj, "b", "default")).toBe("default");
      expect(getValueByPath(obj, "a.b.c", "default")).toBe("default");
    });

    it("当属性存在且为 null/undefined 时应分别处理", () => {
      const obj = { a: null, b: undefined };
      // 提取结果是 null，非 undefined，所以不退回默认值
      expect(getValueByPath(obj, "a", "default")).toBe(null);
      // 提取结果是 undefined，退回默认值
      expect(getValueByPath(obj, "b", "default")).toBe("default");
    });
  });

  describe("defaultSerializer", () => {
    it("应正确序列化和反序列化", () => {
      const testData = { name: "test", val: 123 };
      const serialized = defaultSerializer.serialize(testData);
      expect(serialized).toBe(JSON.stringify(testData));
      
      const deserialized = defaultSerializer.deserialize(serialized);
      expect(deserialized).toEqual(testData);
    });
  });
});
