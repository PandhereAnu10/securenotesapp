import Image from "@tiptap/extension-image";

export const NoteImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      isDrawing: {
        default: false,
        parseHTML: (el) =>
          el instanceof HTMLElement && el.getAttribute("data-drawing") === "true",
        renderHTML: (attrs) =>
          attrs.isDrawing ? { "data-drawing": "true", class: "note-drawing" } : {},
      },
    };
  },
}).configure({
  inline: false,
  allowBase64: true,
  HTMLAttributes: {
    class: "note-embedded-image",
  },
});
