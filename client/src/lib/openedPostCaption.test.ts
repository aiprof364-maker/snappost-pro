import { describe, expect, it } from "vitest";
import { captionWhenPostOpens } from "./openedPostCaption";

describe("caption when a saved post opens", () => {
  it("waits for the post row instead of keeping an empty editor", () => {
    expect(captionWhenPostOpens(undefined, null)).toBeNull();
    expect(
      captionWhenPostOpens(
        { id: 4, caption: "Transforming outdoor spaces.\n\nMade with SnapPost" },
        null
      )
    ).toEqual({
      caption: "Transforming outdoor spaces.\n\nMade with SnapPost",
      loadedPostId: 4,
    });
  });

  it("does not wipe an in-progress edit when the same post refreshes", () => {
    expect(
      captionWhenPostOpens(
        { id: 4, caption: "Transforming outdoor spaces." },
        4
      )
    ).toBeNull();
  });

  it("loads the caption when a different post is opened", () => {
    expect(
      captionWhenPostOpens({ id: 5, caption: "Another job done right." }, 4)
    ).toEqual({
      caption: "Another job done right.",
      loadedPostId: 5,
    });
  });
});
