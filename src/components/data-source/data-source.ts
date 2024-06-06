import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { PageFetcher, VerificationGrid } from "../verification-grid/verification-grid";
import { dataSourceStyles } from "./css/style";
import csv from "csvtojson";
import { booleanConverter } from "../../helpers/attributes";

type SupportedFileTypes = "json" | "csv";
type Char = string;

// TODO: this entire component needs to be refactored
@customElement("oe-data-source")
export class DataSource extends AbstractComponent(LitElement) {
  public static styles = dataSourceStyles;

  @property({ type: String })
  public src: string | undefined;

  @property({ type: String })
  public for: string | undefined;

  @property({ type: Boolean, converter: booleanConverter })
  public local!: boolean;

  private verificationGrid: VerificationGrid | undefined;
  private fileType: SupportedFileTypes = "json";

  public willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("for") && !!this.for) {
      const verificationElement = document.querySelector<VerificationGrid>(`#${this.for}`);

      if (!verificationElement) {
        return;
      }

      this.verificationGrid = verificationElement;
      this.updateVerificationGrid();
    }
  }

  private async getJsonData(): Promise<unknown[]> {
    if (!this.src || !this.for) {
      throw new Error("src and for attribute must be set on a data source");
    }

    const response = await fetch(this.src);

    if (!response.ok) {
      throw new Error("Could not fetch page");
    }

    // TODO: add support for local files maybe through a new file picker component
    // called oe-local-data with a `for` attribute
    const data: string = await response.text();
    const contentType = await response.headers.get("Content-Type");

    if (contentType) {
      this.fileType = contentType.includes("json") ? "json" : "csv";
    } else {
      // to prevent copying the entire file, I just get the first copy the first character
      // and send it to the fileFormat heuristic function
      this.fileType = this.fileFormat(data[0]);
    }

    // TODO: we should be using the headers to inspect the file type
    // if the file type cannot be determined by the header, then we should only
    // use the first byte as a fallback heuristic
    return this.fileType === "json" ? JSON.parse(data) : await csv().fromString(data);
  }

  private buildCallback(content: any[]): PageFetcher | undefined {
    // TODO: Check if this is the correct solution
    if (!Array.isArray(content)) {
      throw new Error("Response is not an array");
    }

    return async (elapsedItems: number) => {
      // TODO: this is a hard coded grid size
      const startIndex = elapsedItems;
      const endIndex = startIndex + 6;

      return content.slice(startIndex, endIndex) ?? [];
    };
  }

  private handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const contents = reader.result as string;
      const fileType = this.fileFormat(contents[0]);

      if (!this.verificationGrid) {
        return;
      }

      if (fileType === "json") {
        const jsonData = JSON.parse(contents);
        const fetcher = this.buildCallback(jsonData);

        if (!fetcher) {
          return;
        }

        this.verificationGrid.getPage = fetcher;
      } else {
        const csvData = await csv().fromString(contents);
        const fetcher = this.buildCallback(csvData);

        if (!fetcher) {
          return;
        }

        this.verificationGrid.getPage = fetcher;
      }
    };

    reader.readAsText(file);
  }

  // if the user does not explicitly specify a file format that their data is in
  // we can use some simple heuristics to determine the file format
  // this should not be a replacement for the user explicitly specifying the file
  // format, but it is better than throwing an error
  // TODO: The contents should probably be a pointer because otherwise we are copying the entire file!
  private fileFormat(contents: Char): SupportedFileTypes {
    const isJson = contents === "{" || contents === "[";
    this.fileType = isJson ? "json" : "csv";
    return this.fileType;
  }

  private async updateVerificationGrid() {
    if (!this.verificationGrid) {
      return;
    }

    const data = await this.getJsonData();
    if (!data) {
      return;
    }

    const fetcher = this.buildCallback(data);
    if (!fetcher) {
      return;
    }

    this.verificationGrid.getPage = fetcher;
  }

  private fileInputTemplate(): TemplateResult<1> {
    return html`<input @change="${this.handleFileChange}" type="file" accept=".csv,.json" />`;
  }

  public render() {
    return this.local ? this.fileInputTemplate() : nothing;
  }
}
