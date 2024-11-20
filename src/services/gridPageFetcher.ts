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

export type SubjectAppender = (value: SubjectWrapper[]) => void;

export class GridPageFetcher {
  public constructor(
    pagingCallback: PageFetcher,
    urlTransformer: UrlTransformer,
    subjectQueue: ReadonlyArray<SubjectWrapper>,
    appender: SubjectAppender,
  ) {
    this.pagingCallback = pagingCallback;
    this.urlTransformer = urlTransformer;
    this.subjectQueue = subjectQueue;
    this.appender = appender;
  }

  public totalItems?: number;
  private pagingCallback: PageFetcher;
  private urlTransformer: UrlTransformer;
  private subjectQueue: ReadonlyArray<SubjectWrapper>;
  private appender: SubjectAppender;
  private pagingContext: PageFetcherContext = {};

  // caches the audio for the next n items in the buffer
  private clientCacheLength = 10;
  private serverCacheLength = 50;

  public async populateSubjects(decisionHead: number): Promise<void> {
    const requiredQueueSize = Math.max(this.clientCacheLength, this.serverCacheLength) + decisionHead;

    // continue to fetch items until we have enough items in the queue
    // or the paging function returns no more items
    // (we have reached the end of the dataset)
    while (this.subjectQueue.length < requiredQueueSize) {
      const fetchedPage = await this.fetchNextPage();
      if (fetchedPage.length === 0) {
        break;
      }

      this.appender(fetchedPage);
    }

    // because the queue buffer may have been expanded by the fetchNextPage
    // callback, we should update the cache
    // these async functions are purposely not awaited because we do not
    // want to block the main thread while doing cache operations
    // TODO: we should make sure that only the latest cache operation is run
    this.refreshCache(decisionHead);
  }

  public async refreshCache(decisionHead: number): Promise<void> {
    this.audioCacheClient(decisionHead);
    this.audioCacheServer(decisionHead);
  }

  // during client caching, we do a GET request to the server for the
  // audio file. Therefore, requests that have already been client cached
  // have also already been server cached. We therefore, remove these
  // requests from the calculations
  private async audioCacheClient(decisionHead: number): Promise<void> {
    const models = this.subjectQueue
      .slice(decisionHead, decisionHead + this.clientCacheLength)
      .filter((model) => model.clientCached === AudioCachedState.COLD);

    for (const model of models) {
      model.clientCached = AudioCachedState.REQUESTED;
      fetch(model.url)
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
  private async audioCacheServer(viewHead: number): Promise<void> {
    const models = this.subjectQueue
      .slice(viewHead, viewHead + this.serverCacheLength)
      .filter((model) => model.serverCached === AudioCachedState.COLD);

    for (const model of models) {
      model.serverCached = AudioCachedState.REQUESTED;
      fetch(model.url, { method: "HEAD" })
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
