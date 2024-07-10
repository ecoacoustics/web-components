import { customElement, property, query, state } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { html, LitElement, nothing, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import { VerificationGridComponent } from "../verification-grid/verification-grid";
import { booleanConverter } from "../../helpers/attributes";
import { DecisionWrapper } from "../../models/verification";
import { Parser } from "@json2csv/plainjs";
import dataSourceStyles from "./css/style.css?inline";
import { DataSourceFetcherContentTypes, DataSourceFetcher } from "../../services/dataSourceFetcher";
import { PageFetcher } from "../../services/gridPageFetcher";
import { DecisionComponent } from "../decision/decision";

/**
 * @description
 * Automatically creates a PageFetcher callback that can be used on a
 * verification grid component
 * 
 * @csspart file-picker - A css target to style the file picker button
 */
@customElement("oe-data-source")
export class DataSourceComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(dataSourceStyles);

  /** A remote JSON or CSV file to use as the data source */
  @property({ type: String })
  public src?: string;

  /** A verification grid component that the derived page fetcher callback will be applied to */
  @property({ type: String })
  public for?: string;

  /** Whether to allow for local file inputs through a system UI dialog */
  @property({ type: Boolean, converter: booleanConverter })
  public local!: boolean;

  /** Randomly sample rows from a local or remote data source */
  @property({ type: Boolean, converter: booleanConverter })
  public random = false;

  @state()
  private canDownload = false;

  @state()
  private fileName?: string;

  @query("input[type=file]")
  private fileInput!: HTMLInputElement;

  public contentType?: DataSourceFetcherContentTypes;
  private verificationGrid?: VerificationGridComponent;
  private decisionHandler = this.handleDecision.bind(this);

  public willUpdate(changedProperties: PropertyValues<this>): void {
    if ((changedProperties.has("for") && !!this.for) || (changedProperties.has("src") && !!this.src)) {
      const verificationElement = document.querySelector<VerificationGridComponent>(`#${this.for}`);

      this.fileName ??= this.src?.split("/").pop();

      if (verificationElement) {
        // remove event listeners from the current verification grid
        if (this.verificationGrid) {
          this.verificationGrid.removeEventListener(DecisionComponent.decisionEventName, this.decisionHandler);
        }

        this.verificationGrid = verificationElement;
        this.verificationGrid.addEventListener(DecisionComponent.decisionEventName, this.decisionHandler);
        this.updateVerificationGrid();
      }
    }
  }

  // TODO: there is a "null" in additional tags (if none)
  public downloadResults(): void {
    if (!this.canDownload || !this.verificationGrid) {
      return;
    }

    const decisions = this.verificationGrid.decisions;

    // since we do not know the input format of the provided csv or json files
    // it is possible for users to input a csv file that already has a column
    // header of "confirmed" or "additional-tags"
    // to prevent column name collision, we prepend all the fields that we add
    // to the original data input with "oe"
    const columnNamespace = "oe-";

    let formattedResults = "";
    const fileFormat = this.contentType ?? "json";

    const results = decisions.map((wrapper: DecisionWrapper) => {
      // the decisions array is a list of flattened DecisionWrapper's
      // so that each decision contains only one classification
      const decision = wrapper.decisions.at(0);
      if (!decision) {
        throw new Error("Decision is not defined");
      }

      const subject = wrapper.subject;
      const tag = decision.tag?.text ?? "";
      const confirmed = decision.confirmed;
      const additionalTags = wrapper.additionalTags.map((model) => model);

      return {
        ...subject,
        [`${columnNamespace}tag`]: tag,
        [`${columnNamespace}confirmed`]: confirmed,
        [`${columnNamespace}additional-tags`]: additionalTags,
      };
    });

    // TODO: "finalFileFormat" is an indication that I've been hacky here
    let finalFileFormat: string = fileFormat;
    if (fileFormat === "json") {
      formattedResults = JSON.stringify(results);
    } else if (fileFormat === "csv") {
      formattedResults = new Parser().parse(results);
    } else if (fileFormat === "tsv") {
      formattedResults = new Parser({ delimiter: "\t" }).parse(results);
      finalFileFormat = "tab-separated-values";
    }

    // media types defined by
    // https://www.iana.org/assignments/media-types/media-types.xhtml
    const topLevelType = fileFormat === "json" ? "application" : "text";
    const mediaType = `${topLevelType}/${finalFileFormat}`;
    const blob = new Blob([formattedResults], { type: mediaType });
    const url = URL.createObjectURL(blob);

    // TODO: we should just be able to use the file download API
    // TODO: probably apply a transformation to arrays in CSVs (use semi-columns as item delimiters)
    const a = document.createElement("a");
    a.href = url;
    a.download = `verified-${this.fileName}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private handleDecision(): void {
    if (!this.verificationGrid) {
      return;
    }
    this.canDownload = this.verificationGrid.decisions.length > 0;
  }

  private handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file || !this.verificationGrid) {
      return;
    }

    this.fileName = file.name;
    this.src = URL.createObjectURL(file);
  }

  private buildCallback(content: any[]): PageFetcher {
    if (!Array.isArray(content)) {
      throw new Error("Response is not an array");
    }

    return async (page: number) => {
      if (!this.verificationGrid) {
        return [];
      }

      const gridSize = this.verificationGrid.gridSize;
      const startIndex = gridSize * page;
      const endIndex = startIndex + gridSize;

      return content.slice(startIndex, endIndex);
    };
  }


  private async updateVerificationGrid(): Promise<void> {
    if (!this.verificationGrid || !this.src) {
      return;
    } else if (!this.for) {
      throw new Error("for attribute must be set on a data source");
    }

    const dataFetcher = new DataSourceFetcher(this.src);
    const data = await dataFetcher.json();
    this.contentType = dataFetcher.contentType;

    if (!Array.isArray(data)) {
      throw new Error("Response is not an array");
    } else if (data.length === 0) {
      return;
    }

    const fetcher = this.buildCallback(data);
    if (!fetcher) {
      return;
    }

    this.verificationGrid.getPage = fetcher;
  }

  private fileInputTemplate(): TemplateResult<1> {
    const handleClick = (event: PointerEvent) => {
      event.preventDefault();
      this.fileInput.click();
    };

    return html`
      <div class="file-picker">
        <button
          class="file-input oe-btn-secondary"
          part="file-picker"
          @click="${handleClick}"
          aria-controls="browser-file-input"
        >
          ${this.fileName ? `File: ${this.fileName}` : "Browse files"}
        </button>
        <input
          id="browser-file-input"
          class="hidden"
          type="file"
          accept=".csv,.json"
          @change="${this.handleFileChange}"
        />

        <button
          data-testid="download-results-button"
          class="oe-btn-secondary"
          @click="${this.downloadResults}"
          ?disabled="${!this.canDownload}"
        >
          Download Results
        </button>
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
