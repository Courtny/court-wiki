import type { ContentType } from "@court-wiki/core";
import { renderMarkdown } from './markdown';
import { renderAsciidoc } from './asciidoc';

export interface RenderResult {
  html: string;
  title?: string | null;
  frontmatter?: Record<string, unknown>;
}

/**
 * Render page content to HTML based on its content type.
 * Dispatches to the appropriate renderer (Markdown, AsciiDoc, or raw HTML).
 */
export async function render(
  content: string,
  format: ContentType
): Promise<RenderResult> {
  switch (format) {
    case "MARKDOWN": {
      const result = await renderMarkdown(content);
      return {
        html: result.html,
        frontmatter: result.frontmatter,
        title:
          (result.frontmatter["title"] as string | undefined) ?? null,
      };
    }

    case "ASCIIDOC": {
      const result = renderAsciidoc(content);
      return {
        html: result.html,
        title: result.title,
        frontmatter: result.attributes,
      };
    }

    case "HTML":
      return { html: content };

    default:
      throw new Error(`Unknown content format: ${format as string}`);
  }
}

export { renderMarkdown } from './markdown';
export { renderAsciidoc } from './asciidoc';
export type { MarkdownRenderResult } from './markdown';
export type { AsciidocRenderResult } from './asciidoc';
