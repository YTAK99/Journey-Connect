import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./apiClient", () => ({
  default: {
    get: vi.fn(),
  },
  unwrapApiResponse: vi.fn(),
}));

import apiClient, { unwrapApiResponse } from "./apiClient";
import { getExplore, getFeed, getFeedItems } from "./postApi";

describe("postApi read contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the feed with a stable cursor contract", async () => {
    const response = { data: { items: [{ id: 1 }] } };
    const unwrapped = { items: [{ id: 1 }] };
    apiClient.get.mockResolvedValueOnce(response);
    unwrapApiResponse.mockReturnValueOnce(unwrapped);

    await expect(getFeed({ cursor: "cursor-1", size: 15 })).resolves.toBe(unwrapped);

    expect(apiClient.get).toHaveBeenCalledWith("/feed", {
      params: {
        cursor: "cursor-1",
        size: 15,
      },
    });
    expect(unwrapApiResponse).toHaveBeenCalledWith(response);
  });

  it("omits an empty feed cursor while preserving the default page size", async () => {
    apiClient.get.mockResolvedValueOnce({ data: {} });
    unwrapApiResponse.mockReturnValueOnce({ items: [] });

    await getFeed();

    expect(apiClient.get).toHaveBeenCalledWith("/feed", {
      params: {
        cursor: undefined,
        size: 20,
      },
    });
  });

  it("forwards explicit explore keyword and region filters", async () => {
    const response = { data: { content: [{ id: 7 }] } };
    apiClient.get.mockResolvedValueOnce(response);
    unwrapApiResponse.mockReturnValueOnce(response.data);

    await expect(getExplore({
      keyword: "cafe",
      region: "SEOUL",
      page: 2,
      size: 30,
    })).resolves.toEqual(response.data);

    expect(apiClient.get).toHaveBeenCalledWith("/explore", {
      params: {
        keyword: "cafe",
        region: "SEOUL",
        page: 2,
        size: 30,
      },
    });
  });
});

describe("getFeedItems", () => {
  it.each([
    [[{ id: 1 }], [{ id: 1 }]],
    [{ items: [{ id: 2 }] }, [{ id: 2 }]],
    [{ content: [{ id: 3 }] }, [{ id: 3 }]],
    [{ data: [{ id: 4 }] }, [{ id: 4 }]],
    [undefined, []],
    [{}, []],
  ])("normalizes supported feed shapes", (input, expected) => {
    expect(getFeedItems(input)).toEqual(expected);
  });
});
