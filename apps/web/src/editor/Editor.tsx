import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import type { ProseMirrorDoc } from "@aajia/shared";
import { Toolbar } from "./Toolbar";

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
];

type Props = {
  initialContent: ProseMirrorDoc;
  onChange?: (content: ProseMirrorDoc) => void;
};

export function Editor({ initialContent, onChange }: Props) {
  // Per editor-patterns/SKILL.md: set initial content once on mount; never
  // call setContent again for this document (it would nuke undo history).
  const editor = useEditor({
    extensions,
    content: initialContent,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as ProseMirrorDoc);
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="editor">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="editor-surface" />
    </div>
  );
}
