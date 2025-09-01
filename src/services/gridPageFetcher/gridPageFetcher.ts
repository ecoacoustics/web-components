import { AudioCachedState, Subject, SubjectWrapper } from "../../models/subject";
import { SubjectParser, UrlTransformer } from "../subjectParser/subjectParser";

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

  public get totalItems(): number {
    return this._totalItems;
  }

  public get subjectStream() {
    this._subjectStream ??= this.newSubjectStream();
    return this._subjectStream;
  }

  /**
   * Closes the stream of subjects so that no further data can be pulled.
   * This is typically done when the datasource changes and the stream is no
   * longer needed.
   */
  public readonly abortController = new AbortController();

  private pagingCallback: PageFetcher;
  private urlTransformer: UrlTransformer;
  private pagingContext: PageFetcherContext = {};
  private _totalItems = 0;
  private _subjectStream?: ReadableStream<SubjectWrapper>;

  // caches the audio for the next n items in the buffer
  private clientCacheSize = 10;
  private serverCacheSize = 50;

  private newSubjectStream() {
    const queueStrategy = new CountQueuingStrategy({ highWaterMark: 10 });
    const subjectStream = new ReadableStream<SubjectWrapper>(
      {
        pull: async (controller) => {
          const fetchedPage = await this.fetchNextPage();
          if (fetchedPage.length === 0) {
            console.debug("reached end of dataset");
            controller.close();
            return;
          }

          for (const subject of fetchedPage) {
            controller.enqueue(subject);
          }
        },
        cancel: () => {
          this._subjectStream = undefined;
          console.debug("subject stream cancelled");
        },
      },
      queueStrategy,
    );

    // Because each of these stream pipes have their own highWaterMark, the
    // total queue size the the sum of all of the high water marks.
    // E.g. 10 items for the reader source, 10 items for the client cache, and
    //      50 items for the server cache.
    // The total queue size will be 10 + 10 + 50 = 70
    //
    // prettier-ignore
    return subjectStream
      .pipeThrough(this.serverCachePipe())
      .pipeThrough(this.clientCachePipe());
  }

  private clientCachePipe(): TransformStream<SubjectWrapper> {
    const queueStrategy = new CountQueuingStrategy({ highWaterMark: this.clientCacheSize });

    return new TransformStream<SubjectWrapper>(
      {
        transform: (subject, controller) => {
          // Fire and forget the client cache operation
          this.audioCacheClient(subject);
          controller.enqueue(subject);
        },
      },
      queueStrategy,
    );
  }

  private serverCachePipe(): TransformStream<SubjectWrapper> {
    const queueStrategy = new CountQueuingStrategy({ highWaterMark: this.serverCacheSize });

    return new TransformStream<SubjectWrapper>(
      {
        transform: (subject, controller) => {
          // Fire and forget the server cache operation
          this.audioCacheServer(subject);
          controller.enqueue(subject);
        },
      },
      queueStrategy,
    );
  }

  // during client caching, we do a GET request to the server for the
  // audio file. Therefore, requests that have already been client cached
  // have also already been server cached. We therefore, remove these
  // requests from the calculations
  private audioCacheClient(subject: SubjectWrapper): void {
    if (subject.clientCached !== AudioCachedState.COLD) {
      return;
    }

    subject.clientCached = AudioCachedState.REQUESTED;

    fetch(subject.url, { priority: "low", cache: "reload" })
      .then((response: Response) => {
        subject.clientCached = response.ok ? AudioCachedState.SUCCESS : AudioCachedState.FAILED;
      })
      .catch(() => (subject.clientCached = AudioCachedState.FAILED));
  }

  // during server caching, we do a HEAD request to the server for the
  // audio file. We do this because some servers have to split a large
  // audio file using ffmpeg when a file is requested.
  // by doing a HEAD request, we can warm the ffmpeg split file on the server
  private audioCacheServer(subject: SubjectWrapper): void {
    if (subject.serverCached !== AudioCachedState.COLD) {
      return;
    }

    subject.serverCached = AudioCachedState.REQUESTED;
    fetch(subject.url, { method: "HEAD", priority: "low", cache: "no-store" })
      .then((response: Response) => {
        subject.serverCached = response.ok ? AudioCachedState.SUCCESS : AudioCachedState.FAILED;
      })
      .catch(() => (subject.serverCached = AudioCachedState.FAILED));
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

    this._totalItems = totalItems;
    this.pagingContext = context;

    return models;
  }
}
