import { Parser } from "@json2csv/plainjs";
import { html, LitElement, nothing, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { EnumValue } from "../../helpers/types/advancedTypes";
import { booleanConverter } from "../../helpers/attributes";
import { downloadFile } from "../../helpers/files";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { DecisionOptions } from "../../models/decisions/decision";
import { Subject, SubjectWrapper } from "../../models/subject";
import { DataSourceFetcher } from "../../services/dataSourceFetcher";
import { PageFetcher } from "../../services/gridPageFetcher";
import { VerificationGridComponent } from "../verification-grid/verification-grid";
import { required } from "../../helpers/decorators";
import dataSourceStyles from "./css/style.css?inline";

type PagingContext = {
  page: number;
};

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

  // since we do not know the input format of the provided csv or json files
  // it is possible for users to input a csv file that already has a column name
  // to prevent column name collision, we prepend all the fields that we add
  // to the original data input with "oe"
  public static readonly columnNamespace = "oe_" as const;
  public static readonly pageSize = 10 as const;

  /** A remote JSON or CSV file to use as the data source */
  @property({ type: String })
  public src?: string;

  /**
   * A verification grid component that the derived page fetcher callback will
   * be applied to
   */
  @required()
  @property({ type: String })
  public for!: string;

  /** Whether to allow for local file inputs through a system UI dialog */
  @property({ type: Boolean, converter: booleanConverter })
  public local = false;

  /** Randomly sample rows from a local or remote data source */
  @property({ type: Boolean, converter: booleanConverter })
  public random = false;

  @state()
  private canDownload = false;

  @state()
  private fileName?: string;

  @query("input[type=file]")
  private fileInput!: HTMLInputElement;

  public dataFetcher?: DataSourceFetcher;
  private verificationGrid?: VerificationGridComponent;
  private decisionHandler = this.handleDecision.bind(this);

  public willUpdate(changedProperties: PropertyValues<this>): void {
    if ((changedProperties.has("for") && !!this.for) || (changedProperties.has("src") && !!this.src)) {
      const verificationElement = document.getElementById(this.for);

      if (verificationElement && verificationElement instanceof VerificationGridComponent) {
        // remove event listeners from the current verification grid
        if (this.verificationGrid) {
          this.verificationGrid.removeEventListener(
            VerificationGridComponent.decisionMadeEventName,
            this.decisionHandler,
          );
        }

        this.verificationGrid = verificationElement;
        this.verificationGrid.addEventListener(VerificationGridComponent.decisionMadeEventName, this.decisionHandler);
        this.updateVerificationGrid();
      }
    }
  }

  public async downloadResults(): Promise<void> {
    if (!this.canDownload) {
      return;
    } else if (!this.dataFetcher?.file) {
      throw new Error("File is not defined");
    }

    const results = await this.resultRows();
    const fileFormat = this.dataFetcher.mediaType ?? "";

    const originalFilePath = this.dataFetcher.file.name;
    const extensionIndex = originalFilePath.lastIndexOf(".");
    const basename = originalFilePath.slice(0, extensionIndex).split("/").at(-1);
    const extension = originalFilePath.slice(extensionIndex);

    const downloadedFileName = `${basename}_verified${extension}`;

    let formattedResults = "";
    // we use startsWith here because some servers respond with content-types
    // in the format content-type/subtype; charset=encoding
    // e.g. text/csv; charset=UTF-8
    if (fileFormat.startsWith("application/json")) {
      formattedResults = JSON.stringify(results);
    } else if (fileFormat.startsWith("text/csv")) {
      formattedResults = new Parser().parse(results);
    } else if (fileFormat.startsWith("text/tab-separated-values")) {
      formattedResults = new Parser({ delimiter: "\t" }).parse(results);
    } else {
      // we should never reach this condition because we checked that the file
      // format was supported when we loaded the data source
      // however, we still throw an error here so that we will see the error
      // in the dev console if we incorrectly reach this condition
      throw new Error("Unsupported file format");
    }

    // I am using a downloadFile helper because the showSaveFilePicker API
    // is not stable in FireFox
    // TODO: Inline the functionality once Firefox ESR supports the
    // showSaveFilePicker API https://caniuse.com/?search=showSaveFilePicker
    const file = new File([formattedResults], downloadedFileName, { type: this.dataFetcher.file.type });
    downloadFile(file);
  }

  public async resultRows(): Promise<ReadonlyArray<Subject>> {
    if (!this.dataFetcher) {
      throw new Error("Data fetcher is not defined");
    }

    // if there is no verification grid, we want to return the raw data back
    // to the user without any modification
    const subjects = (await this.dataFetcher.subjects()) ?? [];
    if (!this.verificationGrid) {
      return subjects;
    }

    // TODO: probably apply a transformation to arrays in CSVs (use semi-columns
    // as item delimiters)
    const decisionHistory = this.verificationGrid.subjectHistory;
    const currentPageDecisions = this.verificationGrid.currentPage;
    const allDecisions = [...decisionHistory, ...currentPageDecisions];

    return subjects.map((model) => this.rowDecision(model, allDecisions));
  }

  private rowDecision(subject: Subject, subjects: SubjectWrapper[]): Readonly<Subject> {
    // because we compare subjects by reference when downloading the results,
    // we cannot copy the original subject model by value anywhere
    const decision = subjects.find((decision) => decision.subject && subject && decision.subject === subject);

    if (!decision) {
      // if we hit this condition, it means that the user has not yet made a
      // decision about the subject. In this case, we should return the
      // original subject model with empty fields
      return subject;
    }

    const namespace = DataSourceComponent.columnNamespace;
    const verification = decision.verification;
    const classifications = decision.classifications;

    const classificationColumns: Record<string, EnumValue<DecisionOptions>> = {};
    const verificationColumns: Record<string, EnumValue<DecisionOptions>> = {};

    if (classifications) {
      for (const classification of classifications) {
        const column = `${namespace}${classification.tag.text}`;
        const value = classification.confirmed;
        classificationColumns[column] = value;
      }
    }

    if (verification) {
      verificationColumns[`${namespace}tag`] = decision.tag;
      verificationColumns[`${namespace}confirmed`] = verification.confirmed;
    }

    return {
      ...subject,
      ...verificationColumns,
      ...classificationColumns,
    };
  }

  private handleDecision(): void {
    this.canDownload = true;
  }

  private handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file || !this.verificationGrid) {
      return;
    }

    this.src = URL.createObjectURL(file);
  }

  private buildCallback(content: SubjectWrapper[]): PageFetcher<PagingContext> {
    if (!Array.isArray(content)) {
      throw new Error("Response is not an array");
    }

    return async (context: PagingContext) => {
      if (!this.verificationGrid) {
        return {
          subjects: [],
          context,
          totalItems: content.length,
        };
      }

      const currentPage = context.page ?? -1;
      const nextPage = currentPage + 1;

      const pageSize = DataSourceComponent.pageSize;
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
  }

  private async updateVerificationGrid(): Promise<void> {
    if (!this.verificationGrid || !this.src) {
      return;
    } else if (!this.for) {
      throw new Error("for attribute must be set on a data source");
    }

    this.dataFetcher = await new DataSourceFetcher().updateSrc(this.src);
    if (!this.dataFetcher.file) {
      throw new Error("Data fetcher does not have a file.");
    }

    this.fileName = this.dataFetcher.file.name;
    const data = await this.dataFetcher.subjects();

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
      <span>
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
      </span>
    `;
  }

  public render() {
    const fileInputTemplate = this.local ? this.fileInputTemplate() : nothing;

    return html`
      <div class="data-source">
        ${fileInputTemplate}

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
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-data-source": DataSourceComponent;
  }
}
