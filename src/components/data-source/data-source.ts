import { Parser } from "@json2csv/plainjs";
import { html, LitElement, nothing, PropertyValues, TemplateResult, unsafeCSS } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { EnumValue } from "../../helpers/types/advancedTypes";
import { booleanConverter } from "../../helpers/attributes";
import { downloadFile } from "../../helpers/files";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { DecisionOptions } from "../../models/decisions/decision";
import { Subject, SubjectWrapper } from "../../models/subject";
import { UrlSourcedFetcher } from "../../services/urlSourcedFetcher";
import { VerificationGridComponent } from "../verification-grid/verification-grid";
import { required } from "../../helpers/decorators";
import dataSourceStyles from "./css/style.css?inline";

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

  public urlSourcedFetcher?: UrlSourcedFetcher;
  private verificationGrid?: VerificationGridComponent;
  private decisionHandler = this.handleDecision.bind(this);

  public willUpdate(changedProperties: PropertyValues<this>): void {
    // TODO: I think these conditions might be faulty for removing attributes
    // e.g. if you remove the "for" or "src" attributes, I don't think these
    // functions will trigger the update to remove the previous functionality
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
    }

    // TODO: remove this hack that was added to fix an issue where if the
    // data source was changed from a local file to a callback-based source
    // the downloaded results would return the previously used local file
    // as the basis for the results
    const isCallbackFromUrlSourcedFetcher = this.verificationGrid?.getPage?.brand === UrlSourcedFetcher.brand;

    if (isCallbackFromUrlSourcedFetcher) {
      await this.downloadUrlSourcedResults();
    } else {
      await this.downloadCallbackSourcedResults();
    }
  }

  private async downloadCallbackSourcedResults(): Promise<void> {
    if (!this.verificationGrid) {
      throw new Error("associated verification grid could not be found");
    }

    const decisions: SubjectWrapper[] = this.verificationGrid.subjectHistory;
    const formattedResults = JSON.stringify(decisions);

    const file = new File([formattedResults], "verification-results.json", { type: "application/json" });
    downloadFile(file);
  }

  private async downloadUrlSourcedResults(): Promise<void> {
    if (!this.urlSourcedFetcher) {
      throw new Error("Data fetcher is not defined");
    } else if (!this.urlSourcedFetcher.file) {
      // all url data fetchers should have a file object
      // if we react this condition, it means that either the url data fetcher
      // hasn't been initialized correctly, or we have called this function
      // with a callback sourced fetcher
      throw new Error("Data fetcher does not have a file.");
    }

    const results = await this.urlSourcedResultRows();
    const fileFormat = this.urlSourcedFetcher.mediaType ?? "";

    const originalFilePath = this.urlSourcedFetcher.file.name;
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
    const fileType = this.urlSourcedFetcher.file?.type ?? "json";
    const file = new File([formattedResults], downloadedFileName, { type: fileType });
    downloadFile(file);
  }

  // TODO: move this into the urlSourcedFetcher class
  private async urlSourcedResultRows(): Promise<ReadonlyArray<Subject>> {
    if (!this.urlSourcedFetcher) {
      throw new Error("Data fetcher is not defined");
    }

    // if there is no verification grid, we want to return the raw data back
    // to the user without any modification
    const subjects = (await this.urlSourcedFetcher.subjects()) ?? [];
    if (!this.verificationGrid) {
      return subjects;
    }

    // TODO: probably apply a transformation to arrays in CSVs (use semi-columns
    // as item delimiters)
    const decisionHistory = this.verificationGrid.subjectHistory;
    const currentPageDecisions = this.verificationGrid.currentPage;
    const allDecisions = [...decisionHistory, ...currentPageDecisions];

    return subjects.map((model) => this.urlSourcedResultRowDecision(model, allDecisions));
  }

  // TODO: move this into the urlSourcedFetcher class
  private urlSourcedResultRowDecision(subject: Subject, subjects: SubjectWrapper[]): Readonly<Subject> {
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
      verificationColumns[`${namespace}tag`] = decision.tag.text;
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

  private async updateVerificationGrid(): Promise<void> {
    if (!this.verificationGrid) {
      throw new Error("could not find verification grid component");
    } else if (!this.src) {
      return;
    }

    this.urlSourcedFetcher = await new UrlSourcedFetcher().updateSrc(this.src);
    if (!this.urlSourcedFetcher.file) {
      throw new Error("Data fetcher does not have a file.");
    }

    this.fileName = this.urlSourcedFetcher.file.name;
    const data = await this.urlSourcedFetcher.subjects();

    if (!Array.isArray(data)) {
      throw new Error("Response is not an array");
    } else if (data.length === 0) {
      return;
    }

    const fetcher = this.urlSourcedFetcher.buildCallback(data);
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
          ${this.fileName ? "Browse files" : "Browse files"}
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
