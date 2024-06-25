import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import { PageFetcher, VerificationGridComponent } from "../verification-grid/verification-grid";
import dataSourceStyles from "./css/style.css?inline";
import { booleanConverter } from "../../helpers/attributes";
import csv from "csvtojson";

type SupportedFileTypes = "json" | "csv" | "tsv";
type Char = string;

// TODO: this entire component needs to be refactored
@customElement("oe-data-source")
export class DataSourceComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(dataSourceStyles);

  @property({ type: String })
  public src?: string;

  @property({ type: String })
  public for?: string;

  @property({ type: Boolean, converter: booleanConverter })
  public local!: boolean;

  @property({ type: Boolean, converter: booleanConverter })
  public random = false;

  @state()
  public fileName: string | null = null;

  @query("input[type=file]")
  private fileInput!: HTMLInputElement;

  public fileType: SupportedFileTypes = "json";
  private verificationGrid?: VerificationGridComponent;

  public willUpdate(changedProperties: PropertyValues<this>): void {
    if ((changedProperties.has("for") && !!this.for) || (changedProperties.has("src") && !!this.src)) {
      const verificationElement = document.querySelector<VerificationGridComponent>(`#${this.for}`);

      if (verificationElement) {
        this.verificationGrid = verificationElement;
        this.updateVerificationGrid();
      }
    }

    if (this.random && !this.local) {
      console.warn("Random sorting is only supported for local data sources");
    }
  }

  private async getJsonData(): Promise<unknown[]> {
    if (!this.for) {
      throw new Error("for attribute must be set on a data source");
    }

    // it is possible to have no src attribute if the file is expected to be
    // provided locally through the src attribute
    if (!this.src) {
      return [];
    }

    const response = await fetch(this.src);

    if (!response.ok) {
      throw new Error("Could not fetch page");
    }

    const data: string = await response.text();
    const contentType = response.headers.get("Content-Type");

    if (contentType) {
      this.fileType = contentType.includes("json") ? "json" : "csv";
    } else {
      // to prevent copying the entire file, I just get the first copy the first character
      // and send it to the fileFormat heuristic function
      this.fileType = this.fileFormat(data[0]);
    }

    return this.fileType === "json" ? JSON.parse(data) : await csv({ flatKeys: true }).fromString(data);
  }

  private buildCallback(content: any[]): PageFetcher {
    if (!Array.isArray(content)) {
      throw new Error("Response is not an array");
    }

    return async (elapsedItems: number) => {
      if (!this.verificationGrid) {
        return [];
      }

      const startIndex = elapsedItems;
      const endIndex = startIndex + this.verificationGrid.gridSize;

      return content.slice(startIndex, endIndex);
    };
  }

  private handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);

    if (!file) {
      return;
    }

    if (!this.verificationGrid) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const contents = reader.result as string;
      const blob = new Blob([contents], { type: file.type });
      const url = URL.createObjectURL(blob);
      this.fileName = file.name;
      this.src = url;
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

    // to check if the input file is a csv or tsv file, we can count the number
    // of commas and tabs in the first line of the file
    // if the number of commas is greater than the number of tabs, then it is a
    // csv file, otherwise it is a tsv file
    const commaCount = contents.split(",").length;
    const tabCount = contents.split("\t").length;

    if (isJson) {
      this.fileType = "json";
      return "json";
    } else if (commaCount > tabCount) {
      this.fileType = "csv";
      return "csv";
    } else if (tabCount > commaCount) {
      this.fileType = "tsv";
      return "tsv";
    }

    console.warn("Could not determine file format, defaulting to JSON.");
    this.fileType = "json";
    return "json";
  }

  private async updateVerificationGrid(): Promise<void> {
    if (!this.verificationGrid) {
      return;
    }

    const data = await this.getJsonData();
    if (data.length === 0) {
      return;
    }

    const fetcher = this.buildCallback(data);
    if (!fetcher) {
      return;
    }

    if (!this.fileName) {
      this.fileName = this.src?.split("/").pop() ?? null;
    }

    this.verificationGrid.getPage = fetcher;
    this.verificationGrid.dataSource = this;
  }

  private fileInputTemplate(): TemplateResult<1> {
    const handleClick = (event: PointerEvent) => {
      event.preventDefault();
      this.fileInput.click();
    };

    return html`
      <div class="file-picker">
        <button class="file-input oe-btn-secondary" @pointerdown="${handleClick}">
          ${this.src ? `File: ${this.fileName ?? this.src}` : "Browse files"}
        </button>
        <input class="browser-file-input hidden" @change="${this.handleFileChange}" type="file" accept=".csv,.json" />
      </div>
    `;
  }

  public render() {
    return this.local ? this.fileInputTemplate() : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-data-source": DataSourceComponent;
  }
}
