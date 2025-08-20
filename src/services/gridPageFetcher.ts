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

  public async nextSubjects(decisionHead: number): Promise<ReadableStream<SubjectWrapper[]>> {
    const requiredQueueSize = Math.max(this.clientCacheLength, this.serverCacheLength) + decisionHead;

    let fetchedItems = 0;

    // We use a writableStream instead of returning a promise directly so that
    // consumers like the verification grid don't have to wait for all of the
    // subjects to be fetched and resolved before they can start consuming.
    //
    // For example, the verification grid can start rendering when we have
    // fetched 8 items, but we don't want to block rendering until we have
    // enough fetched subjects to fill the client cache and server cache.
    //
    // Using a stream also allows the verification grids subjects to be
    // pre-fetched in the background while the first page of items is being
    // rendered.
    const writableStream = new ReadableStream<SubjectWrapper[]>({
      start: async (controller) => {
        // continue to fetch items until we have enough items in the queue
        // or the paging function returns no more items
        // (we have reached the end of the dataset)
        while (fetchedItems < requiredQueueSize) {
          const fetchedPage = await this.fetchNextPage();
          if (fetchedPage.length === 0) {
            break;
          }

          controller.enqueue(fetchedPage);

          fetchedItems += fetchedPage.length;
        }

        // because the queue buffer may have been expanded by the fetchNextPage
        // callback, we should update the cache
        // these async functions are purposely not awaited because we do not
        // want to block the main thread while doing cache operations
        // TODO: we should make sure that only the latest cache operation is run
        // this.refreshCache(decisionHead);

        controller.close();
      },
    });

    return writableStream;
  }

  public async refreshCache(subjects: SubjectWrapper[], decisionHead: number): Promise<void> {
    this.audioCacheClient(subjects, decisionHead);
    this.audioCacheServer(subjects, decisionHead);
  }

  // during client caching, we do a GET request to the server for the
  // audio file. Therefore, requests that have already been client cached
  // have also already been server cached. We therefore, remove these
  // requests from the calculations
  private async audioCacheClient(subjects: SubjectWrapper[], decisionHead: number): Promise<void> {
    const models = subjects
      .slice(decisionHead, decisionHead + this.clientCacheLength)
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
    const { subjects, context, totalItems } = await this.pagingCallback(this.pagingContext);
    const models = subjects.map((subject) => SubjectParser.parse(subject, this.urlTransformer));

    this.totalItems = totalItems;
    this.pagingContext = context;

    return models;
  }
}
