---
name: editor-patterns
description: Use whenever working on the rich-text editor — TipTap setup, the document schema, auto-save logic, toolbar, content serialization, or any code that touches editor state. Covers the gotchas that bite when building ProseMirror-based editors.
---

# Editor patterns

This skill captures hard-won patterns for the rich-text editor work. Read it before writing or modifying editor code.

## The cardinal rule: JSON in, JSON out

The document is ProseMirror JSON, full stop. Never:
- Store HTML in the database
- Serialize the editor to HTML and parse it back
- Round-trip through `innerHTML`
- Diff documents as strings

Every one of these loses information the editor's schema knows about (marks, nested structure, attributes). Once that information is gone, it's gone. Version history and collaboration become much harder.

Use:
- `editor.getJSON()` to read state for saving
- `editor.commands.setContent(json)` to load state
- For comparisons, deep-compare the JSON or use ProseMirror's `Node.eq()`

## TipTap setup essentials

Minimum extension set for phase 1:
```ts
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

const extensions = [
  StarterKit.configure({
    // StarterKit includes: Document, Paragraph, Text, Bold, Italic, Strike,
    // Heading, BulletList, OrderedList, ListItem, History, etc.
    // We don't need Strike for phase 1 but it's harmless to leave on.
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
];
```

Things StarterKit gives you for free that are easy to miss:
- Undo/redo (within the session)
- Keyboard shortcuts (Cmd/Ctrl+B, +I, etc.)
- Sensible list behavior (Tab to indent, Enter on empty item to exit)

## The auto-save pattern

The shape that works:

```ts
// Inside the editor component
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

const saveDocument = useMemo(
  () => debounce(async (patch: Partial<Document>) => {
    setSaveStatus('saving');
    try {
      await api.patchDocument(docId, patch);
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      // schedule retry
    }
  }, 800),
  [docId]
);

const editor = useEditor({
  extensions,
  content: initialContent,
  onUpdate: ({ editor }) => {
    saveDocument({ content: editor.getJSON() });
  },
});
```

Gotchas:
- **Don't put `editor` in the debounced function's deps.** It triggers re-creation on every keystroke. Read state inside the closure.
- **Cancel the debounce on unmount,** or you'll fire saves after the user has navigated away (and possibly to a different document).
- **Flush pending saves on `beforeunload`** if you want to guard against tab-close mid-debounce. Optional for phase 1, document the trade-off.
- **The title save and content save can share one debounce or be separate.** Separate is simpler — title changes are rare and small.

## Save status indicator

Map states to user-visible text:
- `idle` → empty or "All changes saved" (after the first save)
- `saving` → "Saving…"
- `saved` → "Saved" or "All changes saved", auto-fades after a couple seconds
- `error` → "Couldn't save — retrying" in a warning color, never fully silent

Never block typing on save state. The editor stays interactive always.

## Toolbar wiring

Each toolbar button is two things: a command and a state.

```tsx
<button
  onClick={() => editor.chain().focus().toggleBold().run()}
  disabled={!editor.can().chain().focus().toggleBold().run()}
  aria-pressed={editor.isActive('bold')}
  className={editor.isActive('bold') ? 'is-active' : ''}
>
  Bold
</button>
```

Key bits:
- `.focus()` in the chain — without it, clicking the button blurs the editor and the command silently does nothing
- `editor.can()...` for disabled state (e.g., bold isn't applicable in some contexts)
- `editor.isActive('bold')` for the visual pressed state
- `aria-pressed` for accessibility — these are toggles, not buttons

For headings, the command is `toggleHeading({ level: 1 })` etc. `isActive('heading', { level: 1 })` for state.

## Loading documents

When the route is `/documents/:id`:

1. Fetch the document
2. While loading, show a skeleton — do NOT mount the editor with placeholder content, because the first `setContent` will fight with the user if they're fast
3. Once loaded, mount the editor with `content: doc.content` as the initial value
4. After mount, never call `setContent` again for that document — it nukes the undo history

If you need to refresh content from the server (we don't in phase 1, but later for collaboration), use ProseMirror transactions, not `setContent`.

## Server-side validation of content

The backend should validate that incoming `content` is a plausible ProseMirror document before storing it. Bare minimum:

```ts
const ContentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(z.any()).optional(),
});
```

You can go deeper with full schema validation later. For phase 1, type + structure check is enough to prevent obvious garbage.

## Title editing

The title is a separate `<input>`, not part of the ProseMirror document. Keep it that way for phase 1. Reasons:
- It's a single line of plain text, ProseMirror is overkill
- It needs different behavior (no formatting, Enter submits/blurs, max length)
- Keeping it separate means the title schema can evolve independently

`onBlur` or debounced `onChange` saves the title via `PATCH`.

## Anti-patterns to refuse

If asked to do any of these, push back:

- "Just store the HTML, it's simpler" — no, see cardinal rule
- "Let's use `dangerouslySetInnerHTML` to render the doc for read-only views" — no, use a read-only TipTap instance or ProseMirror's renderer
- "Add a save button" — no, the spec is auto-save
- "Use `useEffect` to save on every render" — no, debounce in `onUpdate`
- "Save on every keystroke immediately" — no, debounce; the server doesn't need 60 writes per second
