import { Subject, SubjectWrapper } from "../models/subject";
import { PageFetcher } from "./gridPageFetcher";
import csv from "csvtojson";

type PagingContext = {
  page: number;
};

// TODO: this class should use the strategy pattern and perform caching
/**
 * @description
 * Fetches a remote data source such has a CSV, TSV, JSON file
 * and always return a JSON object.
 *
 * This class can also be used to parse files provided by the local file system
 * picker API by converting the selected file into a data URL.
 */
export class UrlSourcedFetcher {
  public static readonly brand = Symbol("UrlSourcedFetcher");
  private static readonly pageSize = 10 as const;
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
    this.file = new File([responseData], this.src ?? "data", { type: responseContentType ?? "" });

    // TODO: we can probably do this in async, but I haven't checked for side effects
    this.jsonModels = await this.generateSubjects();

    return this;
  }

  public buildCallback(content: SubjectWrapper[]): PageFetcher<PagingContext> {
    if (!Array.isArray(content)) {
      throw new Error("Response is not an array");
    }

    const callback = async (context: PagingContext) => {
      const currentPage = context.page ?? -1;
      const nextPage = currentPage + 1;

      const pageSize = UrlSourcedFetcher.pageSize;
      const startIndex = pageSize * nextPage;
      const endIndex = startIndex + pageSize;

      // we increment the page number on the context object so that when the
      // callback is used again, we will know what page we are up to
      context.page = nextPage;

      const subjects = content.slice(startIndex, endIndex);

      return {
        subjects,
        context,
        totalItems: content.length,
      };
    };

    // TODO: remove this hacky way to set the brand property
    callback.brand = UrlSourcedFetcher.brand;

    return callback;
  }

  public async subjects(): Promise<ReadonlyArray<Subject> | undefined> {
    return (this.jsonModels ??= await this.generateSubjects());
  }

  private async generateSubjects(): Promise<ReadonlyArray<Subject>> {
    if (!this.file) {
      throw new Error("File is not defined");
    }

    const content = await this.file.text();
    let models: Subject[];
    // we use startsWith here because some servers respond with content-types
    // in the format content-type/subtype; charset=encoding
    // e.g. text/csv; charset=UTF-8
    if (this.mediaType.startsWith("application/json")) {
      models = JSON.parse(content);
    } else if (this.mediaType.startsWith("text/csv")) {
      models = await csv({ flatKeys: true }).fromString(content);
    } else if (this.mediaType.startsWith("text/tab-separated-values")) {
      models = await csv({ flatKeys: true, delimiter: "\t" }).fromString(content);
    } else {
      throw UrlSourcedFetcher.unsupportedFormatError;
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
      throw UrlSourcedFetcher.undeterminedFormatError;
    }

    const translationTable: Record<string, string> = {
      csv: "text/csv",
      tsv: "text/tab-separated-values",
      json: "application/json",
    };

    if (extension in translationTable) {
      return translationTable[extension];
    }

    throw UrlSourcedFetcher.unsupportedFormatError;
  }
}
