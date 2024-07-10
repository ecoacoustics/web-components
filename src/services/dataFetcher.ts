export abstract class AbstractDataFetcher {
    public constructor(callback: string | ((...args: any[]) => Promise<Response>)) {
        typeof callback === "string"
            ? this.callback = async () => fetch(callback)
            : this.callback = callback;
    }

    public readonly callback: () => Promise<Response>;

    public abstract json(): Promise<Readonly<Record<string, unknown> | unknown[]>>;

    // you can override this method if you want to do some caching or other
    // processing before returning the response
    public fetch(): Promise<Response> {
        return this.callback();
    }
}
