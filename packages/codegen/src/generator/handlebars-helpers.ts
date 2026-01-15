import * as Handlebars from "handlebars";
import {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
} from "../utils/string.utils";

/**
 * Register common Handlebars helpers that can be shared across all generators
 * These helpers are language-agnostic and work with any generator type
 */
export function registerCommonHandlebarsHelpers(): void {
  // String transformation helpers
  Handlebars.registerHelper("pascal", (str: string) => toPascalCase(str));
  Handlebars.registerHelper("camel", (str: string) => toCamelCase(str));
  Handlebars.registerHelper("kebab", (str: string) => toKebabCase(str));
  Handlebars.registerHelper("snake", (str: string) => toSnakeCase(str));
  Handlebars.registerHelper(
    "serviceName",
    (tag: string) => toPascalCase(tag) + "Service"
  );
  Handlebars.registerHelper("serviceProp", (tag: string) => toCamelCase(tag));
  Handlebars.registerHelper("fileBase", (tag: string) =>
    toSnakeCase(tag).toLowerCase()
  );

  // Comparison helpers
  Handlebars.registerHelper("eq", (a: any, b: any) => a === b);
  Handlebars.registerHelper("ne", (a: any, b: any) => a !== b);
  Handlebars.registerHelper("gt", (a: any, b: any) => a > b);
  Handlebars.registerHelper("lt", (a: any, b: any) => a < b);
  Handlebars.registerHelper("sub", (a: number, b: number) => a - b);
  Handlebars.registerHelper("len", (arr: any) =>
    Array.isArray(arr) ? arr.length : 0
  );
  Handlebars.registerHelper("or", function (this: any, ...args: any[]) {
    const options = args[args.length - 1];
    if (options && options.fn) {
      // Block helper
      return args.slice(0, -1).some((a) => a)
        ? options.fn(this)
        : options.inverse(this);
    }
    // Regular helper
    return args.slice(0, -1).some((a) => a);
  });
  Handlebars.registerHelper("and", function (this: any, ...args: any[]) {
    const options = args[args.length - 1];
    if (options && options.fn) {
      // Block helper
      return args.slice(0, -1).every((a) => a)
        ? options.fn(this)
        : options.inverse(this);
    }
    // Regular helper
    return args.slice(0, -1).every((a) => a);
  });

  // String manipulation helpers
  Handlebars.registerHelper(
    "replace",
    (str: string, search: string, replace: string) => {
      if (typeof str !== "string") return str;
      return str.replace(
        new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        replace
      );
    }
  );
  Handlebars.registerHelper("index", (arr: any[], idx: number) => arr?.[idx]);

  // Service/namespace helpers
  Handlebars.registerHelper("getServiceName", (tag: string) => {
    const parts = tag.split(".");
    return parts.length > 1 ? parts[1] : tag;
  });
  Handlebars.registerHelper("groupByNamespace", (services: any[]) => {
    const namespaces: Record<string, any[]> = {};
    for (const service of services) {
      const parts = service.tag.split(".");
      if (parts.length === 1) {
        if (!namespaces[""]) namespaces[""] = [];
        namespaces[""].push(service);
      } else {
        const namespace = parts[0];
        if (!namespaces[namespace]) namespaces[namespace] = [];
        namespaces[namespace].push(service);
      }
    }
    return namespaces;
  });
  Handlebars.registerHelper("getRootServices", (services: any[]) => {
    return services.filter((s) => !s.tag.includes("."));
  });

  // Dictionary/object helpers for template state management
  Handlebars.registerHelper("dict", () => ({}));
  Handlebars.registerHelper(
    "setVar",
    (name: string, value: any, options: any) => {
      if (options && options.data && options.data.root) {
        options.data.root[`_${name}`] = value;
      }
      return "";
    }
  );
  Handlebars.registerHelper("getVar", (name: string, options: any) => {
    if (options && options.data && options.data.root) {
      return options.data.root[`_${name}`] || false;
    }
    return false;
  });
  Handlebars.registerHelper("set", (obj: any, key: string, value: any) => {
    if (obj && typeof obj === "object") {
      obj[key] = value;
    }
    return "";
  });
  Handlebars.registerHelper("hasKey", (obj: any, key: string) => {
    return obj && typeof obj === "object" && key in obj;
  });
  Handlebars.registerHelper("lookup", (obj: any, key: string) => {
    return obj && typeof obj === "object" ? obj[key] : undefined;
  });

  // Regex helper
  Handlebars.registerHelper("reMatch", (pattern: string, str: string) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(str);
    } catch {
      return false;
    }
  });
}
