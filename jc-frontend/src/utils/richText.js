import DOMPurify from "dompurify";

const allowedFontStyle = /^\s*font-family\s*:\s*(Arial|Georgia|Trebuchet MS|Courier New)\s*;?\s*$/i;

DOMPurify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style" && !allowedFontStyle.test(data.attrValue)) {
    data.keepAttr = false;
  }
});

export const sanitizeRichText = (html = "") =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h2", "h3", "blockquote", "ul", "ol", "li", "span",
    ],
    ALLOWED_ATTR: ["style"],
  });

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const normalizeEditorContent = (content = "") => {
  if (/<\/?(?:p|h2|h3|ul|ol|li|blockquote|span|strong|em|br)\b/i.test(content)) {
    return sanitizeRichText(content);
  }

  return String(content)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
};

export const richTextToPlainText = (content = "") => {
  if (!content) return "";
  const container = document.createElement("div");
  container.innerHTML = sanitizeRichText(content);
  return (container.textContent || "").replace(/\s+/g, " ").trim();
};
