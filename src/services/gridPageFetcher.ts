import { DecisionWrapper } from "../models/verification";
import { VerificationParser } from "./verificationParser";

export type PageFetcher = (elapsedItems: number) => Promise<DecisionWrapper[]>;

// TODO: this should become a part of the abstract data fetcher
export class GridPageFetcher {
    public constructor(pagingCallback: PageFetcher) {
        this.pagingCallback = pagingCallback;
        this.converter = VerificationParser;
    }

    public page = 0;
    public pagedItems = 0;
    private pagingCallback: PageFetcher;
    private converter: VerificationParser;
    private clientCacheHead = 0;
    private serverCacheHead = 0;
    private queueBuffer: DecisionWrapper[] = [];

    // by default we want to cache the next page of results in the browser cache
    // while we want to cache the next ten pages of results in the server cache
    private clientCacheLength = 1;
    private serverCacheLength = 10;

    /** Gets items from an offset */
    public async getItems(offset: number, pageSize: number): Promise<DecisionWrapper[]> {
        const requiredPage = Math.floor(offset / pageSize);
        const pageItems = await this.pagingCallback(requiredPage);
        return pageItems.map(this.converter.parse);
    }

    public async currentPage(): Promise<DecisionWrapper[]> {
        const currentPage = await this.pagingCallback(this.page);
        return currentPage.map(this.converter.parse);
    }

    /**
     * Removes the next n requestedItems from the queue
     * If this method is called in a predictable manner, it can perform some
     * caching operations to improve performance
     */
    public async popNextItems(requestedItems: number): Promise<DecisionWrapper[]> {
        this.pagedItems += requestedItems;

        const countSatisfiedByQueue = Math.min(requestedItems, this.queueBuffer.length);
        const queueItems = this.queueBuffer.splice(0, countSatisfiedByQueue);

        // attempt to pull all items from the queue buffer, however, if we can't
        // we take as many as we can from the buffer, fetch the next page
        // take as many as we have to fill up the current page, then add the
        // remaining items to the queue buffer
        const unsatisfiedCount = requestedItems - countSatisfiedByQueue;
        if (unsatisfiedCount === 0) {
            return queueItems.map(this.converter.parse);
        }

        const nextPage = await this.nextPage();
        const satisfactionQuota = nextPage.splice(0, unsatisfiedCount);

        // because we used splice on the next page, any remaining items were
        // not added to the current requested page. Therefore, we add them to
        // the queueBuffer so that we can use them if the user requests less
        // than a full page in subsequent requests
        this.queueBuffer = nextPage;

        const currentPage = [...queueItems, ...satisfactionQuota];
        return currentPage.map(this.converter.parse);
    }

    private async nextPage(): Promise<DecisionWrapper[]> {
        this.page++;

        // the next page must be fetched by the pagingCallback
        const fetchedPage = await this.pagingCallback(this.page);

        // these are async functions, however, since they are not critical to
        // user interaction, I do not await them so that they execute
        // in the event loop when there is free time
        this.cacheClient(this.page);
        this.cacheServer(this.page);

        return fetchedPage;
    }

    private async cacheClient(pageHead: number): Promise<void> {
        const currentHead = this.clientCacheHead;
        const cacheTarget = pageHead + this.clientCacheLength;

        if (cacheTarget > currentHead) {
            await this.cacheRange(currentHead, cacheTarget, "GET");
            this.clientCacheHead = cacheTarget;
        }
    }

    private async cacheServer(pageHead: number): Promise<void> {
        const currentHead = this.serverCacheHead;
        const cacheTarget = pageHead + this.serverCacheLength;

        if (cacheTarget > currentHead) {
            await this.cacheRange(currentHead, cacheTarget, "HEAD");
            this.serverCacheHead = cacheTarget;
        }
    }

    private async cacheRange(start: number, end: number, method: "GET" | "HEAD") {
        for (let head = start; head < end; head++) {
            const models: DecisionWrapper[] = await this.pagingCallback(head);
            const verificationModels = models.map(this.converter.parse);

            for (const model of verificationModels) {
                fetch(model.url, { method });
            }
        }
    }
}
