import { THEME } from "@excalidraw/common";

import type { CodeBlockLanguage, ExcalidrawCodeBlockElement } from "./types";

export const CODE_BLOCK_LANGUAGES = [
  "plaintext",
  "javascript",
  "typescript",
  "json",
  "html",
  "css",
  "python",
  "bash",
] as const;

export const DEFAULT_CODE_BLOCK_TITLE = "Code";
export const DEFAULT_CODE_BLOCK_LANGUAGE: CodeBlockLanguage = "javascript";
export const DEFAULT_CODE_BLOCK_CODE = 'console.log("Hello, world!");';
export const CODE_BLOCK_DEFAULT_WIDTH = 420;
export const CODE_BLOCK_DEFAULT_HEIGHT = 260;
export const CODE_BLOCK_PADDING = 16;
export const CODE_BLOCK_HEADER_HEIGHT = 42;
export const CODE_BLOCK_FONT_SIZE = 14;
export const CODE_BLOCK_LINE_HEIGHT = 20;
export const CODE_BLOCK_MAX_RENDERED_LINE_LENGTH = 2000;

export type CodeTokenType =
  | "plain"
  | "comment"
  | "keyword"
  | "string"
  | "number"
  | "literal";

export type CodeToken = {
  text: string;
  type: CodeTokenType;
};

const KEYWORDS: Partial<Record<CodeBlockLanguage, ReadonlySet<string>>> = {
  javascript: new Set([
    "async",
    "await",
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "finally",
    "for",
    "from",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "let",
    "new",
    "of",
    "return",
    "static",
    "switch",
    "throw",
    "try",
    "typeof",
    "var",
    "while",
    "yield",
  ]),
  typescript: new Set([
    "abstract",
    "any",
    "as",
    "async",
    "await",
    "boolean",
    "class",
    "const",
    "declare",
    "else",
    "enum",
    "export",
    "extends",
    "for",
    "from",
    "function",
    "if",
    "implements",
    "import",
    "in",
    "infer",
    "interface",
    "keyof",
    "let",
    "namespace",
    "new",
    "number",
    "of",
    "private",
    "protected",
    "public",
    "readonly",
    "return",
    "satisfies",
    "static",
    "string",
    "switch",
    "type",
    "typeof",
    "unknown",
    "var",
    "void",
    "while",
  ]),
  python: new Set([
    "and",
    "as",
    "assert",
    "async",
    "await",
    "break",
    "class",
    "continue",
    "def",
    "del",
    "elif",
    "else",
    "except",
    "finally",
    "for",
    "from",
    "global",
    "if",
    "import",
    "in",
    "is",
    "lambda",
    "nonlocal",
    "not",
    "or",
    "pass",
    "raise",
    "return",
    "try",
    "while",
    "with",
    "yield",
  ]),
  bash: new Set([
    "case",
    "do",
    "done",
    "elif",
    "else",
    "esac",
    "export",
    "fi",
    "for",
    "function",
    "if",
    "in",
    "local",
    "readonly",
    "select",
    "then",
    "until",
    "while",
  ]),
  css: new Set(["@import", "@media", "@supports", "from", "to", "important"]),
};

const LITERALS = new Set([
  "false",
  "null",
  "true",
  "undefined",
  "NaN",
  "Infinity",
  "None",
  "False",
  "True",
]);

export const isCodeBlockLanguage = (
  value: unknown,
): value is CodeBlockLanguage =>
  typeof value === "string" &&
  (CODE_BLOCK_LANGUAGES as readonly string[]).includes(value);

const pushToken = (tokens: CodeToken[], text: string, type: CodeTokenType) => {
  if (!text) {
    return;
  }
  const previous = tokens[tokens.length - 1];
  if (previous?.type === type) {
    previous.text += text;
  } else {
    tokens.push({ text, type });
  }
};

export const tokenizeCodeLine = (
  line: string,
  language: CodeBlockLanguage,
): CodeToken[] => {
  if (language === "plaintext") {
    return [{ text: line, type: "plain" }];
  }

  const tokens: CodeToken[] = [];
  const keywords = KEYWORDS[language];
  let index = 0;

  while (index < line.length) {
    const rest = line.slice(index);
    const commentPrefix =
      language === "python" || language === "bash" ? "#" : "//";
    if (
      rest.startsWith(commentPrefix) ||
      rest.startsWith("/*") ||
      rest.startsWith("<!--")
    ) {
      pushToken(tokens, rest, "comment");
      break;
    }

    const char = line[index];
    if (char === '"' || char === "'" || char === "`") {
      let end = index + 1;
      while (end < line.length) {
        if (line[end] === "\\") {
          end += 2;
          continue;
        }
        end++;
        if (line[end - 1] === char) {
          break;
        }
      }
      pushToken(tokens, line.slice(index, end), "string");
      index = end;
      continue;
    }

    const number = rest.match(/^(?:0x[\da-f]+|\d+(?:\.\d+)?)/i)?.[0];
    if (number) {
      pushToken(tokens, number, "number");
      index += number.length;
      continue;
    }

    const identifier = rest.match(/^[@$a-z_][\w$-]*/i)?.[0];
    if (identifier) {
      const type = LITERALS.has(identifier)
        ? "literal"
        : keywords?.has(identifier)
        ? "keyword"
        : "plain";
      pushToken(tokens, identifier, type);
      index += identifier.length;
      continue;
    }

    pushToken(tokens, char, "plain");
    index++;
  }

  return tokens;
};

export const getCodeBlockPalette = (
  theme: typeof THEME[keyof typeof THEME],
) => {
  const dark = theme === THEME.DARK;
  return {
    title: dark ? "#f8f9fa" : "#212529",
    muted: dark ? "#adb5bd" : "#6c757d",
    plain: dark ? "#f1f3f5" : "#212529",
    comment: dark ? "#8b949e" : "#6a737d",
    keyword: dark ? "#ff7b72" : "#d73a49",
    string: dark ? "#a5d6ff" : "#032f62",
    number: dark ? "#79c0ff" : "#005cc5",
    literal: dark ? "#d2a8ff" : "#6f42c1",
    divider: dark ? "#495057" : "#dee2e6",
  } as const;
};

export const getCodeBlockLines = (
  element: Pick<ExcalidrawCodeBlockElement, "code" | "language">,
  maxLines?: number,
) => {
  const normalized = element.code.replace(/\r\n?/g, "\n");
  if (maxLines !== undefined && maxLines <= 0) {
    return [];
  }
  const lines =
    maxLines === undefined
      ? normalized.split("\n")
      : normalized.split("\n", maxLines);
  return lines.map((line) =>
    line.slice(0, CODE_BLOCK_MAX_RENDERED_LINE_LENGTH),
  );
};
