import type { Editor } from "@tiptap/react";

type Props = { editor: Editor };

export function Toolbar({ editor }: Props) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <Group>
        <Btn
          label="Bold"
          shortcut="⌘B"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <strong>B</strong>
        </Btn>
        <Btn
          label="Italic"
          shortcut="⌘I"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <em>I</em>
        </Btn>
        <Btn
          label="Underline"
          shortcut="⌘U"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <span style={{ textDecoration: "underline" }}>U</span>
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          label="Heading 1"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          active={editor.isActive("heading", { level: 1 })}
        >
          H1
        </Btn>
        <Btn
          label="Heading 2"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive("heading", { level: 2 })}
        >
          H2
        </Btn>
        <Btn
          label="Heading 3"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive("heading", { level: 3 })}
        >
          H3
        </Btn>
      </Group>

      <Divider />

      <Group>
        <Btn
          label="Bulleted list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          •
        </Btn>
        <Btn
          label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          1.
        </Btn>
      </Group>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="toolbar-group">{children}</div>;
}

function Divider() {
  return <div className="toolbar-divider" aria-hidden="true" />;
}

function Btn({
  label,
  shortcut,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`toolbar-btn${active ? " is-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {children}
    </button>
  );
}
