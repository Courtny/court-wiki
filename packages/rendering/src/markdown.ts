import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkFrontmatter from "remark-frontmatter";
import remarkEmoji from "remark-emoji";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import type { Plugin } from "unified";
import type { Root as HastRoot } from "hast";
import { visit } from "unist-util-visit";

// ─── Mermaid placeholder plugin ───────────────────────────────────────────────
// Full mermaid rendering requires browser-side execution or a headless renderer
// like @mermaid-js/mermaid-isomorphic. This plugin wraps code blocks with
// lang=mermaid in a <div data-mermaid> for client-side hydration.

const rehypeMermaidPlaceholder: Plugin<[], HastRoot> = () => {
  return (tree) => {
    visit(tree, "element", (node) => {
      if (
        node.tagName === "pre" &&
        Array.isArray(node.children) &&
        node.children.length === 1
      ) {
        const child = node.children[0];
        if (
          child &&
          child.type === "element" &&
          child.tagName === "code" &&
          child.properties?.className
        ) {
          const classes = child.properties.className as string[];
          if (classes.includes("language-mermaid")) {
            const content =
              child.children[0]?.type === "text"
                ? child.children[0].value
                : "";

            // Replace the <pre><code> with a hydration-ready div
            node.tagName = "div";
            node.properties = { "data-mermaid": true };
            node.children = [
              {
                type: "element",
                tagName: "code",
                properties: { style: "display:none" },
                children: [{ type: "text", value: content }],
              },
              {
                type: "element",
                tagName: "div",
                properties: { className: ["mermaid-diagram"] },
                children: [],
              },
            ];
          }
        }
      }
    });
  };
};

// ─── Main render function ─────────────────────────────────────────────────────

export interface MarkdownRenderResult {
  html: string;
  frontmatter: Record<string, unknown>;
}

/**
 * Render a Markdown string to HTML using the full remark/rehype pipeline.
 * Supports GFM, math (KaTeX), syntax highlighting, frontmatter, emoji,
 * and Mermaid diagram placeholders for client-side hydration.
 */
export async function renderMarkdown(
  content: string
): Promise<MarkdownRenderResult> {
  let extractedFrontmatter: Record<string, unknown> = {};

  const file = await unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml", "toml"])
    .use(() => (tree) => {
      // Extract frontmatter data
      visit(tree, ["yaml", "toml"], (node) => {
        if (node.type === "yaml") {
          try {
            // Simple YAML parser — use a proper one like js-yaml in production
            const lines = (node as { value: string }).value.split("\n");
            for (const line of lines) {
              const colonIdx = line.indexOf(":");
              if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).trim();
                const value = line.slice(colonIdx + 1).trim();
                extractedFrontmatter[key] = value.replace(/^["']|["']$/g, "");
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      });
    })
    .use(remarkGfm, {
      singleTilde: false, // disable ~strikethrough~ in favour of ~~double~~
    })
    .use(remarkMath)
    .use(remarkEmoji, { accessible: true })
    .use(remarkRehype, {
      allowDangerousHtml: true,
    })
    .use(rehypeRaw)
    .use(rehypeMermaidPlaceholder)
    .use(rehypeKatex, {
      strict: false,
      trust: false,
    })
    .use(rehypeHighlight, {
      detect: true,
      ignoreMissing: true,
    })
    .use(rehypeStringify, {
      allowDangerousHtml: true,
    })
    .process(content);

  return {
    html: String(file),
    frontmatter: extractedFrontmatter,
  };
}
