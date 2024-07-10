import csv from "csvtojson";
import { AbstractDataFetcher } from "./dataFetcher";

export type DataSourceFetcherContentTypes = "json" | "csv" | "tsv";

// TODO: this class should use the strategy pattern and perform caching
/**
 * @description
 * Fetches a data source of an unknown type/shape and returns it in a standard format.
 * e.g. can fetch a CSV, TSV, JSON file and always return a JSON object.
 */
export class DataSourceFetcher extends AbstractDataFetcher {
    public constructor(src: string) {
        super(src);
        this.src = src;
    }

    private static readonly unsupportedFormateError = new Error("Unsupported file format");
    private static readonly undeterminedFormatError = new Error("Could not determine file format");

    public readonly src?: string;
    // TODO: this should be readonly
    public contentType?: DataSourceFetcherContentTypes;

    // because json can have an array at the root or an object
    // we support returning an array or a record
    public async json(): Promise<Readonly<Record<string, unknown> | unknown[]>> {
        const response = await this.fetch();
        if (!response.ok) {
            throw new Error(`Could not fetch data: ${response.statusText} (${response.status})`);
        }

        const data: string = await response.text();
        const contentType = response.headers.get("Content-Type");

        switch (contentType) {
            case "application/json": {
                this.contentType = "json";
                return JSON.parse(data);
            }

            case "text/csv": {
                this.contentType = "csv";
                return await csv({ flatKeys: true }).fromString(data);
            }

            case "text/tab-separated-values": {
                this.contentType = "tsv";
                return await csv({ flatKeys: true, delimiter: "\t" }).fromString(data);
            }
        }


        // if we cannot use the Content-Type header, we default to
        // fetching the file format from the file extension
        if (!this.src) {
            throw DataSourceFetcher.undeterminedFormatError;
        }

        const extension = (this.src.split(".").at(-1) ?? "").toLowerCase();
        if (extension === "json") {
            return JSON.parse(data);
        } else if (extension === "csv") {
            return await csv({ flatKeys: true }).fromString(data);
        } else if (extension === "tsv") {
            return await csv({ flatKeys: true, delimiter: "\t" }).fromString(data);
        }

        throw DataSourceFetcher.unsupportedFormateError;
    }
}
