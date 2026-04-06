import Asciidoctor from "asciidoctor";

const asciidoctor = Asciidoctor();

export interface AsciidocRenderResult {
  html: string;
  title: string | null;
  attributes: Record<string, string>;
}

/**
 * Render an AsciiDoc string to HTML using the asciidoctor.js library.
 * Safe mode is set to "safe" to allow most features while preventing
 * file system access.
 */
export function renderAsciidoc(content: string): AsciidocRenderResult {
  const doc = asciidoctor.load(content, {
    safe: "safe",
    attributes: {
      "source-highlighter": "highlight.js",
      "icons": "font",
      "idprefix": "",
      "idseparator": "-",
      "sectlinks": true,
      "sectanchors": true,
      "experimental": true,
    },
    header_footer: false,
  });

  const html = doc.convert();
  const title = doc.getDocumentTitle({ partition: false }) as string | undefined;

  const rawAttributes = doc.getAttributes() as Record<string, unknown>;
  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(rawAttributes)) {
    if (typeof value === "string") {
      attributes[key] = value;
    } else if (value !== null && value !== undefined) {
      attributes[key] = String(value);
    }
  }

  return {
    html: typeof html === "string" ? html : "",
    title: title ?? null,
    attributes,
  };
}
