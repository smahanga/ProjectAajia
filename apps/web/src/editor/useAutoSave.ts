import { useCallback, useEffect, useRef, useState } from "react";
import type { PatchDocumentRequest, ProseMirrorDoc } from "@aajia/shared";
import { api } from "../lib/api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type Snapshot = {
  title: string;
  content: ProseMirrorDoc;
};

const DEBOUNCE_MS = 800;
const INITIAL_RETRY_MS = 2000;
const MAX_RETRY_MS = 30_000;

// One debounced save loop for both title and content. The loop computes
// a PATCH by diffing the latest desired state against the last-saved state,
// so retries always send the freshest data.
//
// Per editor-patterns/SKILL.md:
// - debounce ~800ms
// - cancel pending debounce on unmount (we accept losing the in-flight 800ms
//   window if the user navigates away mid-debounce; that's documented)
export function useAutoSave(
  docId: string,
  initialTitle: string,
  initialContent: ProseMirrorDoc,
): {
  status: SaveStatus;
  setTitle: (title: string) => void;
  setContent: (content: ProseMirrorDoc) => void;
  flush: () => void;
} {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const latestRef = useRef<Snapshot>({
    title: initialTitle,
    content: initialContent,
  });
  const savedRef = useRef<Snapshot>({
    title: initialTitle,
    content: initialContent,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_MS);

  const doSave = useCallback(async () => {
    const latest = latestRef.current;
    const saved = savedRef.current;

    const patch: PatchDocumentRequest = {};
    if (latest.title !== saved.title) patch.title = latest.title;
    if (latest.content !== saved.content) patch.content = latest.content;

    if (patch.title === undefined && patch.content === undefined) {
      setStatus("saved");
      return;
    }

    setStatus("saving");
    try {
      await api.patchDocument(docId, patch);
      // Advance the saved cursor. Note: latestRef may have moved on during
      // the in-flight request — we record what we just persisted, then
      // check if there's still pending work below.
      savedRef.current = { title: latest.title, content: latest.content };
      retryDelayRef.current = INITIAL_RETRY_MS;

      const current = latestRef.current;
      const stillDirty =
        current.title !== savedRef.current.title ||
        current.content !== savedRef.current.content;

      if (stillDirty) {
        scheduleSave(DEBOUNCE_MS);
      } else {
        setStatus("saved");
      }
    } catch {
      setStatus("error");
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_MS);
      scheduleSave(delay);
    }
    // scheduleSave is referenced before declaration; pulled into useRef-less
    // closure via the function declaration below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  const scheduleSave = useCallback(
    (delay: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        void doSave();
      }, delay);
    },
    [doSave],
  );

  const setTitle = useCallback(
    (title: string) => {
      latestRef.current = { ...latestRef.current, title };
      scheduleSave(DEBOUNCE_MS);
    },
    [scheduleSave],
  );

  const setContent = useCallback(
    (content: ProseMirrorDoc) => {
      latestRef.current = { ...latestRef.current, content };
      scheduleSave(DEBOUNCE_MS);
    },
    [scheduleSave],
  );

  // Fire-and-forget save for the beforeunload path. Cancels the pending
  // debounce timer and sends whatever's dirty with `keepalive: true` so the
  // browser finishes the request after the page unloads. No status update,
  // no retry — we're unloading; no one's watching.
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    const latest = latestRef.current;
    const saved = savedRef.current;
    const patch: PatchDocumentRequest = {};
    if (latest.title !== saved.title) patch.title = latest.title;
    if (latest.content !== saved.content) patch.content = latest.content;
    if (patch.title === undefined && patch.content === undefined) {
      return;
    }
    // Optimistically advance savedRef so a normal save loop that races with
    // unload doesn't re-send the same patch.
    savedRef.current = { title: latest.title, content: latest.content };
    void api.patchDocument(docId, patch, { keepalive: true }).catch(() => {
      // Page is unloading; nothing useful to do here.
    });
  }, [docId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, []);

  return { status, setTitle, setContent, flush };
}
