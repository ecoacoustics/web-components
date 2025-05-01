import { Subject } from "../models/subject";
import csv from "csvtojson";

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
  private static readonly unsupportedFormatError = new Error("Unsupported file format");
  private static readonly undeterminedFormatError = new Error("Could not determine file format");

  public get src(): string {
    return this._src;
  }

  public file?: File;
  private _src!: string;

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

  public async updateSrc(newSource: string | File): Promise<typeof this> {
    if (newSource instanceof File) {
      this._src = URL.createObjectURL(newSource);
      this.file = newSource;
      return this;
    }

    this._src = newSource;

    const response = await fetch(newSource);
    if (!response.ok) {
      throw new Error(`Could not fetch data: ${response.statusText} (${response.status})`);
    }

    const responseData: string = await response.text();
    const responseContentType = response.headers.get("Content-Type");

    // if the response content type is undefined, we set the file objects
    // file type to an empty string to reflect the default value in the
    // w3c File constructor spec
    this.file = new File([responseData], this.src ?? "data", { type: responseContentType ?? "" });

    return this;
  }

  public async generateSubjects(): Promise<Subject[]> {
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
    } else if (this.mediaType.startsWith("application/vnd.ms-excel") && this.file.name.endsWith(".csv")) {
      // Windows can sometimes report the file type of a csv as an
      // application/vnd.ms-excel file type.
      // Therefore, if the file type is reported as "excel" and the file
      // extension is .csv, it is safe to assume that Windows is incorrectly
      // reporting the csv file as an excel file and we can really parse it with
      // our csv parser.
      models = await csv({ flatKeys: true }).fromString(content);
    } else if (this.mediaType.startsWith("text/tab-separated-values")) {
      models = await csv({ flatKeys: true, delimiter: "\t" }).fromString(content);
    } else {
      throw UrlSourcedFetcher.unsupportedFormatError;
    }

    // to iterate over the dataset, we require the input file to be an array
    // of subjects
    // if we do not receive an array of subjects, the urlSourcedFetcher will
    // fallback to an empty dataset and log an error in the console
    if (!Array.isArray(models)) {
      console.error("Error passing dataset: Expected an array of subjects. Received", typeof models);
      return [];
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
