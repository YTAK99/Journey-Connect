import { afterEach, describe, expect, it, vi } from "vitest";
import { revokePlacePreviews } from "./imagePreviews";

describe("revokePlacePreviews", () => {
  afterEach(() => vi.restoreAllMocks());

  it("revokes only local blob previews", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    revokePlacePreviews([
      { images: [{ previewUrl: "blob:first" }, { imageUrl: "/stored.jpg" }] },
      { images: [{ previewUrl: "blob:second" }] },
    ]);

    expect(revoke.mock.calls).toEqual([["blob:first"], ["blob:second"]]);
  });
});
