import sanitizeHtml from "sanitize-html";

// The update text comes from a rich text editor as HTML. Only formatting is kept:
// scripts, event handlers, iframes and inline styles (except text alignment) are removed,
// so a published update can never run code in other users' browsers.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "a", "hr", "code", "pre"],
  allowedAttributes: { a: ["href", "target", "rel"], "*": ["style"] },
  allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
  allowedSchemes: ["http", "https", "mailto"],
  // Links always open in a new tab without access to this page
  transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
};

export const sanitizeUpdateHtml = (html: string) => sanitizeHtml(html, OPTIONS);

// True when the HTML has no visible text (e.g. "<p></p>")
export const isBlankHtml = (html: string) => !sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim();
