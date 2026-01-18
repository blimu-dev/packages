/**
 * String utility functions for code generation
 */

/**
 * Convert a string to PascalCase
 */
export function toPascalCase(s: string): string {
  s = s.trim();
  if (s === '') {
    return '';
  }

  // Split by non-alphanumeric characters
  const parts = s.split(/[^A-Za-z0-9]+/).filter((p) => p !== '');
  const allParts: string[] = [];

  for (const part of parts) {
    // Further split camelCase/PascalCase words
    const subParts = splitCamelCase(part);
    allParts.push(...subParts);
  }

  return allParts
    .filter((p) => p !== '')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert a string to camelCase
 */
export function toCamelCase(s: string): string {
  const pascal = toPascalCase(s);
  if (pascal === '') {
    return '';
  }
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a string to snake_case
 */
export function toSnakeCase(s: string): string {
  s = s.trim();
  if (s === '') {
    return '';
  }

  // Split by non-alphanumeric characters
  const parts = s.split(/[^A-Za-z0-9]+/).filter((p) => p !== '');
  const allParts: string[] = [];

  for (const part of parts) {
    // Further split camelCase/PascalCase words
    const subParts = splitCamelCase(part);
    allParts.push(...subParts);
  }

  return allParts
    .filter((p) => p !== '')
    .map((p) => p.toLowerCase())
    .join('_');
}

/**
 * Convert a string to kebab-case
 */
export function toKebabCase(s: string): string {
  s = s.trim();
  if (s === '') {
    return '';
  }

  // Split by non-alphanumeric characters
  const parts = s.split(/[^A-Za-z0-9]+/).filter((p) => p !== '');
  const allParts: string[] = [];

  for (const part of parts) {
    // Further split camelCase/PascalCase words
    const subParts = splitCamelCase(part);
    allParts.push(...subParts);
  }

  return allParts
    .filter((p) => p !== '')
    .map((p) => p.toLowerCase())
    .join('-');
}

/**
 * Split a camelCase or PascalCase string into words
 */
function splitCamelCase(s: string): string[] {
  if (s === '') {
    return [];
  }

  const parts: string[] = [];
  let current = '';

  const chars = Array.from(s);
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (!char) {
      continue;
    }
    // Check if this is the start of a new word
    let isNewWord = false;
    if (i > 0 && isUppercase(char)) {
      // Current char is uppercase
      const prevChar = chars[i - 1];
      if (prevChar && !isUppercase(prevChar)) {
        // Previous char was lowercase, so this starts a new word
        isNewWord = true;
      } else if (i < chars.length - 1) {
        const nextChar = chars[i + 1];
        if (nextChar && !isUppercase(nextChar)) {
          // Previous char was uppercase, but next char is lowercase
          // This handles cases like "XMLHttp" -> "XML", "Http"
          isNewWord = true;
        }
      }
    }

    if (isNewWord && current.length > 0) {
      parts.push(current);
      current = '';
    }

    current += char;
  }

  if (current.length > 0) {
    parts.push(current);
  }

  return parts;
}

/**
 * Check if a character is uppercase
 */
function isUppercase(char: string): boolean {
  return char >= 'A' && char <= 'Z';
}
