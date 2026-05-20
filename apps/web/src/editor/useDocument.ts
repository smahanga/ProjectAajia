import { useEffect, useState } from "react";
import type { Document } from "@aajia/shared";
import { ApiError, api } from "../lib/api";

export type DocumentState =
  | { kind: "loading" }
  | { kind: "ready"; doc: Document }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export function useDocument(id: string | undefined): DocumentState {
  const [state, setState] = useState<DocumentState>({ kind: "loading" });

  useEffect(() => {
    if (!id) {
      setState({ kind: "error", message: "Missing document id" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    api
      .getDocument(id)
      .then((doc) => {
        if (!cancelled) setState({ kind: "ready", doc });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ kind: "not-found" });
        } else {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
