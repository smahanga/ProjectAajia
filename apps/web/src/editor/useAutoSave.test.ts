import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProseMirrorDoc } from "@aajia/shared";

// Mock the api module BEFORE importing the hook so the hook's import picks
// up the mock.
vi.mock("../lib/api", () => ({
  api: { patchDocument: vi.fn() },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { api } from "../lib/api";
import { useAutoSave } from "./useAutoSave";

const patchMock = api.patchDocument as ReturnType<typeof vi.fn>;

const EMPTY: ProseMirrorDoc = { type: "doc", content: [] };
const DEBOUNCE_MS = 800;
const INITIAL_RETRY_MS = 2000;

function doc(text: string): ProseMirrorDoc {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    patchMock.mockReset();
    patchMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("collapses rapid changes into one save with the latest content", async () => {
    const { result } = renderHook(() => useAutoSave("doc-1", "T", EMPTY));

    act(() => result.current.setContent(doc("a")));
    act(() => result.current.setContent(doc("ab")));
    act(() => result.current.setContent(doc("abc")));

    expect(patchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(patchMock).toHaveBeenCalledWith("doc-1", { content: doc("abc") });
  });

  it("retries with backoff on save failure", async () => {
    patchMock.mockRejectedValueOnce(new Error("boom"));
    patchMock.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAutoSave("doc-1", "T", EMPTY));
    act(() => result.current.setContent(doc("a")));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("error");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INITIAL_RETRY_MS);
    });
    expect(patchMock).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("saved");
  });

  it("sends the latest content when a change arrives during a pending retry", async () => {
    patchMock.mockRejectedValueOnce(new Error("boom"));
    patchMock.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useAutoSave("doc-1", "T", EMPTY));

    // First edit → schedule save → save fails → retry scheduled
    act(() => result.current.setContent(doc("stale")));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    expect(patchMock).toHaveBeenLastCalledWith("doc-1", {
      content: doc("stale"),
    });

    // New edit arrives while a retry is pending. This replaces the retry
    // timer with a fresh debounce window, but `latestRef` is now "fresh".
    act(() => result.current.setContent(doc("fresh")));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });

    expect(patchMock).toHaveBeenCalledTimes(2);
    expect(patchMock).toHaveBeenLastCalledWith("doc-1", {
      content: doc("fresh"),
    });
  });

  it("cancels pending save on unmount", async () => {
    const { result, unmount } = renderHook(() =>
      useAutoSave("doc-1", "T", EMPTY),
    );
    act(() => result.current.setContent(doc("a")));

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 4);
    });
    expect(patchMock).not.toHaveBeenCalled();
  });
});
