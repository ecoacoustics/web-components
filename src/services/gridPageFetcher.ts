import { SubjectWrapper } from "../models/subject";
import { SubjectParser } from "./verificationParser";

export interface IPageFetcherResponse<T> {
  subjects: SubjectWrapper[];
  context: T;
  totalItems: number;
}

/**
 * A callback that will be applied to every subjects url
 * this can be useful for adding authentication information
 */
export type UrlTransformer = (url: string) => string;

/**
 * A context object that is passed to the page fetcher function after every call
 * this can be used to keep track of state such as the current page, where the
 * page fetcher would increment the page number after every call.
 */
export type PageFetcherContext = Record<string, unknown>;
export type PageFetcher<T extends PageFetcherContext = any> = (context: T) => Promise<IPageFetcherResponse<T>>;

export class GridPageFetcher {
  public constructor(pagingCallback: PageFetcher, urlTransformer: UrlTransformer) {
    this.pagingCallback = pagingCallback;
    this.converter = SubjectParser;
    this.urlTransformer = urlTransformer;
  }

  public totalItems?: number;
  private pagingCallback: PageFetcher;
  private converter: SubjectParser;
  private urlTransformer: UrlTransformer;
  private subjectQueueBuffer: SubjectWrapper[] = [];
  private pagingContext: PageFetcherContext = {};

  // caches the audio for the next n items in the buffer
  private clientCacheLength = 10;
  private serverCacheLength = 50;

  /**
   * Removes the next n requestedItems from the queue
   * If this method is called in a predictable manner, it can perform some
   * caching operations to improve performance
   */
  public async getItems(requestedItems: number): Promise<SubjectWrapper[]> {
    const requiredQueueSize = Math.max(this.clientCacheLength, this.serverCacheLength, requestedItems);

    // continue to fetch items until we have enough items in the queue
    // or the paging function returns no more items
    // (we have reached the end of the dataset)
    while (this.subjectQueueBuffer.length < requiredQueueSize) {
      const nextPage = await this.fetchNextPage();
      if (nextPage.length === 0) {
        break;
      }
    }

    // because the queue buffer may have been expanded by the fetchNextPage
    // callback, we should update the cache
    // these async functions are purposely not awaited because we do not
    // want to block the main thread while doing cache operations
    // TODO: we should make sure that only the latest cache operation is run
    // TODO: there might be a race condition here with changing the cache
    // heads a few lines down
    this.audioCacheClient();
    this.audioCacheServer();

    return this.subjectQueueBuffer.splice(0, requestedItems);
  }

  // during client caching, we do a GET request to the server for the
  // audio file. Therefore, requests that have already been client cached
  // have also already been server cached. We therefore, remove these
  // requests from the calculations
  private async audioCacheClient(): Promise<void> {
    const models = this.subjectQueueBuffer.slice(0, this.clientCacheLength).filter((model) => !model.clientCached);

    for (const model of models) {
      model.clientCached = true;
      fetch(model.url);
    }
  }

  // during server caching, we do a HEAD request to the server for the
  // audio file. We do this because some servers have to split a large
  // audio file using ffmpeg when a file is requested.
  // by doing a HEAD request, we can warm the ffmpeg split file on the server
  private async audioCacheServer(): Promise<void> {
    const models = this.subjectQueueBuffer.slice(0, this.serverCacheLength).filter((model) => !model.serverCached);

    for (const model of models) {
      model.serverCached = true;
      fetch(model.url, { method: "HEAD" });
    }
  }

  // because we must support iterable callbacks, we must behave as if the
  // user supplied callback can only be called once per page
  // therefore, we add all rows that we have fetched (even during caching)
  // to a buffer that we can pull from when requesting results for the same
  // page
  private async fetchNextPage(): Promise<SubjectWrapper[]> {
    const { subjects, context, totalItems } = await this.pagingCallback(this.pagingContext);
    const models = subjects.map(this.converter.parse);

    // TODO: this is a hack that was implemented so that we can use
    models.forEach((model) => {
      model.url = this.urlTransformer(model.url);
    });

    this.totalItems = totalItems;
    this.pagingContext = context;
    this.subjectQueueBuffer.push(...models);

    return models;
  }
}
