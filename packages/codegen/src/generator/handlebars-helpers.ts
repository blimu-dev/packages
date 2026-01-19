import * as Handlebars from 'handlebars';
import type { IRService } from '../ir/ir.types';
import {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
} from '../utils/string.utils';

/**
 * Register common Handlebars helpers that can be shared across all generators
 * These helpers are language-agnostic and work with any generator type
 */
export function registerCommonHandlebarsHelpers(): void {
  // String transformation helpers
  Handlebars.registerHelper('pascal', (str: string) => toPascalCase(str));
  Handlebars.registerHelper('camel', (str: string) => toCamelCase(str));
  Handlebars.registerHelper('kebab', (str: string) => toKebabCase(str));
  Handlebars.registerHelper('snake', (str: string) => toSnakeCase(str));
  Handlebars.registerHelper(
    'serviceName',
    (tag: string) => toPascalCase(tag) + 'Service'
  );
  Handlebars.registerHelper('serviceProp', (tag: string) => toCamelCase(tag));
  Handlebars.registerHelper('fileBase', (tag: string) =>
    toSnakeCase(tag).toLowerCase()
  );

  // Comparison helpers
  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  Handlebars.registerHelper('ne', (a: unknown, b: unknown) => a !== b);
  Handlebars.registerHelper(
    'gt',
    (a: unknown, b: unknown) => (a as number) > (b as number)
  );
  Handlebars.registerHelper(
    'lt',
    (a: unknown, b: unknown) => (a as number) < (b as number)
  );
  Handlebars.registerHelper('sub', (a: number, b: number) => a - b);
  Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);
  Handlebars.registerHelper('len', (arr: unknown) =>
    Array.isArray(arr) ? arr.length : 0
  );
  Handlebars.registerHelper(
    'lte',
    (a: unknown, b: unknown) => (a as number) <= (b as number)
  );
  Handlebars.registerHelper('or', function (this: unknown, ...args: unknown[]) {
    const options = args[args.length - 1] as
      | Handlebars.HelperOptions
      | undefined;
    if (options && 'fn' in options && options.fn) {
      // Block helper
      return args.slice(0, -1).some((a) => a)
        ? options.fn(this)
        : options.inverse?.(this);
    }
    // Regular helper
    return args.slice(0, -1).some((a) => a);
  });
  Handlebars.registerHelper(
    'and',
    function (this: unknown, ...args: unknown[]) {
      const options = args[args.length - 1] as
        | Handlebars.HelperOptions
        | undefined;
      if (options && 'fn' in options && options.fn) {
        // Block helper
        return args.slice(0, -1).every((a) => a)
          ? options.fn(this)
          : options.inverse?.(this);
      }
      // Regular helper
      return args.slice(0, -1).every((a) => a);
    }
  );

  // String manipulation helpers
  Handlebars.registerHelper(
    'replace',
    (str: string, search: string, replace: string) => {
      if (typeof str !== 'string') return str;
      return str.replace(
        new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        replace
      );
    }
  );
  Handlebars.registerHelper(
    'index',
    (arr: readonly unknown[], idx: number) => arr?.[idx]
  );

  // Service/namespace helpers
  Handlebars.registerHelper('getServiceName', (tag: string) => {
    const parts = tag.split('.');
    return parts.length > 1 ? parts[1] : tag;
  });
  Handlebars.registerHelper('groupByNamespace', (services: IRService[]) => {
    const namespaces: Record<string, IRService[]> = {};
    for (const service of services) {
      const parts = service.tag.split('.');
      if (parts.length === 1) {
        if (!namespaces['']) namespaces[''] = [];
        namespaces['']?.push(service);
      } else {
        const namespace = parts[0];
        if (namespace && !namespaces[namespace]) {
          namespaces[namespace] = [];
        }
        if (namespace) {
          namespaces[namespace]?.push(service);
        }
      }
    }
    return namespaces;
  });
  Handlebars.registerHelper('getRootServices', (services: IRService[]) => {
    return services.filter((s) => !s.tag.includes('.'));
  });

  // Dictionary/object helpers for template state management
  Handlebars.registerHelper('dict', () => ({}));
  Handlebars.registerHelper(
    'setVar',
    (name: string, value: unknown, options: Handlebars.HelperOptions) => {
      if (options?.data?.root && typeof options.data.root === 'object') {
        (options.data.root as Record<string, unknown>)[`_${name}`] = value;
      }
      return '';
    }
  );
  Handlebars.registerHelper(
    'getVar',
    (name: string, options: Handlebars.HelperOptions) => {
      if (options?.data?.root && typeof options.data.root === 'object') {
        return (
          (options.data.root as Record<string, unknown>)[`_${name}`] || false
        );
      }
      return false;
    }
  );
  Handlebars.registerHelper(
    'set',
    (obj: Record<string, unknown>, key: string, value: unknown) => {
      if (obj && typeof obj === 'object') {
        obj[key] = value;
      }
      return '';
    }
  );
  Handlebars.registerHelper(
    'hasKey',
    (obj: Record<string, unknown>, key: string) => {
      return obj && typeof obj === 'object' && key in obj;
    }
  );
  Handlebars.registerHelper(
    'lookup',
    (obj: Record<string, unknown>, key: string) => {
      return obj && typeof obj === 'object' ? obj[key] : undefined;
    }
  );

  // Regex helper
  Handlebars.registerHelper('reMatch', (pattern: string, str: string) => {
    try {
      const regex = new RegExp(pattern);
      return regex.test(str);
    } catch {
      return false;
    }
  });
}
