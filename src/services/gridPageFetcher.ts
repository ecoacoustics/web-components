import { AudioCachedState, Subject, SubjectWrapper } from "../models/subject";
import { SubjectParser, UrlTransformer } from "./subjectParser";

export interface IPageFetcherResponse<T> {
  subjects: Subject[];
  context: T;
  totalItems: number;
}

/**
 * A context object that is passed to the page fetcher function after every call
 * this can be used to keep track of state such as the current page, where the
 * page fetcher would increment the page number after every call.
 */
export type PageFetcherContext = Record<string, unknown>;

// TODO: remove the brand from the PageFetcher. This was done so that we could
// see if the callback was created by the UrlSourcedFetcher
export type PageFetcher<T extends PageFetcherContext = any> = ((context: T) => Promise<IPageFetcherResponse<T>>) & {
  brand?: symbol;
};

export class GridPageFetcher {
  public constructor(pagingCallback: PageFetcher, urlTransformer: UrlTransformer) {
    this.pagingCallback = pagingCallback;
    this.urlTransformer = urlTransformer;
  }

  public totalItems?: number;
  private pagingCallback: PageFetcher;
  private urlTransformer: UrlTransformer;
  private pagingContext: PageFetcherContext = {};

  // caches the audio for the next n items in the buffer
  private clientCacheLength = 10;
  private serverCacheLength = 50;

  public async nextSubjects(
    viewHead: number,
    pageSize: number,
    currentSubjectSize: number,
  ): Promise<ReadableStream<SubjectWrapper[]>> {
    // It's very unlikely that the number of items required for rendering is
    // less than the number of items required for caching because we cache 50
    // items ahead by default.
    // That being said, I have handled the edge case where the grid size is
    // larger than the number of items we cache ahead.
    const requiredForCaching = viewHead + Math.max(this.clientCacheLength, this.serverCacheLength);
    const requiredForRender = viewHead + pageSize;
    const requiredQueueSize = Math.max(requiredForCaching, requiredForRender);

    const queueSizeDelta = Math.max(requiredQueueSize - currentSubjectSize, 0);

    let fetchedItems = 0;

    // We use a ReadableStream instead of returning a promise directly so that
    // consumers like the verification grid don't have to wait for all of the
    // subjects to be fetched and resolved before they can start rendering.
    //
    // For example, the verification grid can start rendering when we have
    // fetched 8 items, but we don't want to block rendering until we have
    // enough fetched subjects to fill the client cache and server cache.
    const writableStream = new ReadableStream<SubjectWrapper[]>({
      start: async (controller) => {
        // Continue to fetch items until we have enough items in the queue
        // or the paging function returns no more items
        // (we have reached the end of the dataset).
        while (fetchedItems < queueSizeDelta) {
          const fetchedPage = await this.fetchNextPage();
          if (fetchedPage.length === 0) {
            break;
          }

          controller.enqueue(fetchedPage);

          fetchedItems += fetchedPage.length;
        }

        controller.close();
      },
    });

    return writableStream;
  }

  public async refreshCache(subjects: SubjectWrapper[], viewHead: number): Promise<void> {
    // Notice that these cache operations are not awaited, meaning that they are
    // "fire and forget".
    this.audioCacheClient(subjects, viewHead);
    this.audioCacheServer(subjects, viewHead);
  }

  // during client caching, we do a GET request to the server for the
  // audio file. Therefore, requests that have already been client cached
  // have also already been server cached. We therefore, remove these
  // requests from the calculations
  private async audioCacheClient(subjects: SubjectWrapper[], viewHead: number): Promise<void> {
    const models = subjects
      .slice(viewHead, viewHead + this.clientCacheLength)
      .filter((model) => model.clientCached === AudioCachedState.COLD);

    for (const model of models) {
      model.clientCached = AudioCachedState.REQUESTED;
      fetch(model.url, { priority: "low" })
        .then((response: Response) => {
          model.clientCached = response.ok ? AudioCachedState.SUCCESS : AudioCachedState.FAILED;
        })
        .catch(() => (model.clientCached = AudioCachedState.FAILED));
    }
  }

  // during server caching, we do a HEAD request to the server for the
  // audio file. We do this because some servers have to split a large
  // audio file using ffmpeg when a file is requested.
  // by doing a HEAD request, we can warm the ffmpeg split file on the server
  private async audioCacheServer(subjects: SubjectWrapper[], viewHead: number): Promise<void> {
    // We do not need a Math.min(xyz, this.subjectQueue.length) because if the
    // top range of a slice is larger than the length of the array, the slice
    // will simply ignore the out-of-bounds indices and return the maximum
    // amount of items between the start index and the end of the array.
    const models = subjects
      .slice(viewHead, viewHead + this.serverCacheLength)
      .filter((model) => model.serverCached === AudioCachedState.COLD);

    for (const model of models) {
      model.serverCached = AudioCachedState.REQUESTED;
      fetch(model.url, { method: "HEAD", priority: "low" })
        .then((response: Response) => {
          model.serverCached = response.ok ? AudioCachedState.SUCCESS : AudioCachedState.FAILED;
        })
        .catch(() => (model.serverCached = AudioCachedState.FAILED));
    }
  }

  // because we must support iterable callbacks, we must behave as if the
  // user supplied callback can only be called once per page
  // therefore, we add all rows that we have fetched (even during caching)
  // to a buffer that we can pull from when requesting results for the same
  // page
  private async fetchNextPage(): Promise<SubjectWrapper[]> {
    const fetchedPage = await this.pagingCallback(this.pagingContext);
    if (!Array.isArray(fetchedPage?.subjects)) {
      console.error(
        `Verification grid paginator must have the return format: { subjects: Subject[], context?: any, totalItems?: number }`,
      );

      return [];
    }

    const { subjects, context, totalItems } = fetchedPage;
    const models = subjects.map((subject) => SubjectParser.parse(subject, this.urlTransformer));

    this.totalItems = totalItems;
    this.pagingContext = context;

    return models;
  }
}
