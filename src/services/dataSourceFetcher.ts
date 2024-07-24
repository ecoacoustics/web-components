import { Subject } from "../models/subject";
import csv from "csvtojson";

// TODO: this class should use the strategy pattern and perform caching
/**
 * @description
 * Fetches a data source of an unknown type/shape and returns it in a standard format.
 * e.g. can fetch a CSV, TSV, JSON file and always return a JSON object.
 */
export class DataSourceFetcher {
    private static readonly unsupportedFormatError = new Error("Unsupported file format");
    private static readonly undeterminedFormatError = new Error("Could not determine file format");

    public get src(): string {
        return this._src;
    }

    public file?: File;
    private _src!: string;
    private jsonModels?: ReadonlyArray<Subject>;

    /**
     * returns the IANA media type as defined by
     * https://www.iana.org/assignments/media-types/media-types.xhtml
     * 
     * You should always trust this getter over the file objects type because
     * the file object can be incomplete or incorrect
    */
    public get mediaType(): string {
        if (!this.file) {
            throw new Error("File is not defined");
        }

        return this.file.type ?? this.fileExtensionMediaType(this.file.name);
    }

    public async updateSrc(src: string) {
        this._src = src;

        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`Could not fetch data: ${response.statusText} (${response.status})`);
        }

        const responseData: string = await response.text();
        const responseContentType = response.headers.get("Content-Type");

        // if the response content type is undefined, we set the file objects
        // file type to an empty string to reflect the default value in the
        // w3c File constructor spec
        this.file = new File(
            [responseData], this.src ?? "data",
            { type: responseContentType ?? "" }
        );

        // TODO: we can probably do this in async, but I haven't checked for side effects
        this.jsonModels = await this.generateSubjects();

        return this;
    }

    public async subjects(): Promise<ReadonlyArray<Subject> | undefined> {
        return this.jsonModels ??= await this.generateSubjects();
    }

    private async generateSubjects(): Promise<ReadonlyArray<Subject>> {
        if (!this.file) {
            throw new Error("File is not defined");
        }

        const content = await this.file.text();
        let models: Subject[];
        switch (this.mediaType) {
            case "application/json": {
                models = JSON.parse(content);
                break;
            }
            case "text/csv": {
                models = await csv({ flatKeys: true }).fromString(content);
                break;
            }
            case "text/tab-separated-values": {
                models = await csv({ flatKeys: true, delimiter: "\t" }).fromString(content);
                break;
            }
            default: {
                throw DataSourceFetcher.unsupportedFormatError;
            }
        }

        return models;
    }

    /**
     * Attempts to extract the MIME media type using the file extension
     * This should always be used as a last resort for when the browser cannot
     * determine the correct MIME type.
     */
    private fileExtensionMediaType(path: string): string {
        const extension = path.split(".").at(-1)?.toLowerCase();
        if (!extension) {
            throw DataSourceFetcher.undeterminedFormatError;
        }

        const translationTable: Record<string, string> = {
            csv: "text/csv",
            tsv: "text/tab-separated-values",
            json: "application/json",
        };

        if (extension in translationTable) {
            return translationTable[extension];
        }

        throw DataSourceFetcher.unsupportedFormatError;
    }
}
