import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiClient", () => ({
  default: { post: vi.fn() },
  unwrapApiResponse: vi.fn(),
}));

import apiClient, { unwrapApiResponse } from "./apiClient";
import { chatWithJourneyAi } from "./journeyAiApi";

describe("journeyAiApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends current post context and only the latest six history messages", async () => {
    const response = { data: { data: { answer: "ok" } } };
    apiClient.post.mockResolvedValueOnce(response);
    unwrapApiResponse.mockReturnValueOnce({ answer: "ok" });
    const history = Array.from({ length: 8 }, (_, index) => ({ role: "user", content: `m${index}` }));

    await chatWithJourneyAi({ message: "이 글 어때?", currentPostId: 123, history });

    expect(apiClient.post).toHaveBeenCalledWith("/journey-ai/chat", {
      message: "이 글 어때?",
      currentPostId: 123,
      region: null,
      history: history.slice(-6),
    });
    expect(unwrapApiResponse).toHaveBeenCalledWith(response);
  });
});
