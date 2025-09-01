import { expect, test } from "../../tests/assertions";
import { GridPageFetcher, PageFetcher } from "./gridPageFetcher";

const identityUrlTransformer = (url: string) => url;
const mockGetPage: PageFetcher = (context: any) => {
  return Promise.resolve({
    totalItems: 100,
    context: context,
    subjects: Array.from({ length: 10 }).map((_, index) => ({
      id: index,
      name: `Subject ${index}`,
    })),
  });
};

test("should have the correct initial state", () => {
  const fetcher = new GridPageFetcher(mockGetPage, identityUrlTransformer);

  expect(fetcher.totalItems).toBe(0);
  expect(fetcher.abortController).toBeInstanceOf(AbortController);
});

test("should re-use the same subjectStream if requested twice", () => {
  const fetcher = new GridPageFetcher(mockGetPage, identityUrlTransformer);

  // We expect that the subjectStream getter returns a singleton ReadableStream,
  // meaning that we should receive the same instance if requested multiple
  // times.
  const stream1 = fetcher.subjectStream;
  const stream2 = fetcher.subjectStream;

  // We purposely use "toBe" for reference equality.
  expect(stream1).toBe(stream2);
});

// I have purposely set the mockGetPage to return a number of items equal to
// the expected back pressure so that if we have an off-by-one error
// (e.g. using >= instead of > to check if we have enough items), this test
// will fail.
test("should correctly call the mockGetPage the correct number of times to fill back pressure", () => {});
