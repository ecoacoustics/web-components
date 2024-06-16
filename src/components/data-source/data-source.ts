import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { PageFetcher, VerificationGrid } from "../verification-grid/verification-grid";
import { dataSourceStyles } from "./css/style";
import { booleanConverter } from "../../helpers/attributes";
import csv from "csvtojson";

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

  @state()
  public fileName: string | null = null;

  @query("input[type=file]")
  private fileInput!: HTMLInputElement;

  public fileType: SupportedFileTypes = "json";
  private verificationGrid: VerificationGrid | undefined;

  public willUpdate(changedProperties: PropertyValues<this>): void {
    if ((changedProperties.has("for") && !!this.for) || (changedProperties.has("src") && !!this.src)) {
      const verificationElement = document.querySelector<VerificationGrid>(`#${this.for}`);

      if (!verificationElement) {
        return;
      }

      this.verificationGrid = verificationElement;
      this.updateVerificationGrid();
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

    // TODO: add support for local files maybe through a new file picker component
    // called oe-local-data with a `for` attribute
    const data: string = await response.text();
    const contentType = response.headers.get("Content-Type");

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
    return this.fileType === "json" ? JSON.parse(data) : await csv({ flatKeys: true }).fromString(data);
  }

  private buildCallback(content: any[]): PageFetcher | undefined {
    // TODO: Check if this is the correct solution
    if (!Array.isArray(content)) {
      throw new Error("Response is not an array");
    }

    return async (elapsedItems: number) => {
      // TODO: this is a hard coded grid size
      const startIndex = elapsedItems;
      const endIndex = startIndex + this.verificationGrid!.gridSize;

      return content.slice(startIndex, endIndex) ?? [];
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

    this.fileName = this.src?.split("/").pop() ?? null;
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
        <button @pointerdown="${handleClick}" class="oe-btn-secondary">
          ${this.src ? `File: ${this.fileName ?? this.src}` : "Browse files"}
        </button>
        <input @change="${this.handleFileChange}" type="file" accept=".csv,.json" class="hidden" />
      </div>
    `;
  }

  public render() {
    return this.local ? this.fileInputTemplate() : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-data-source": DataSource;
  }
}
