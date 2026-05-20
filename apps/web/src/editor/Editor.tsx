import { EditorContent, useEditor } from "@tiptap/react";
// Side-effect imports: trigger TipTap's module augmentations so the
// editor's chained commands (toggleBold, toggleHeading, etc.) are typed.
// The runtime instances come from @aajia/shared.
import "@tiptap/starter-kit";
import "@tiptap/extension-underline";
import { extensions, type ProseMirrorDoc } from "@aajia/shared";
import { Toolbar } from "./Toolbar";

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
