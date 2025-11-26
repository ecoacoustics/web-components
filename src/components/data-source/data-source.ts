import { Parser } from "@json2csv/plainjs";
import { html, HTMLTemplateResult, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, query, state } from "lit/decorators.js";
import { booleanConverter } from "../../helpers/attributes";
import { downloadFile } from "../../helpers/files";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { UrlSourcedFetcher } from "../../services/urlSourcedFetcher/urlSourcedFetcher";
import { VerificationGridComponent } from "../verification-grid/verification-grid";
import { required } from "../../helpers/decorators";
import { PageFetcher } from "../../services/gridPageFetcher/gridPageFetcher";
import { DownloadableResult } from "../../models/subject";
import { when } from "lit/directives/when.js";
import { customElement } from "../../helpers/customElement";
import dataSourceStyles from "./css/style.css?inline";

/**
 * @description
 * Automatically creates a PageFetcher callback that can be used on a
 * verification grid component
 *
 * @slot - A custom result download button to use instead of the default download button.
 *
 * @csspart file-picker - A css target to style the file picker button
 */
@customElement("oe-data-source")
export class DataSourceComponent extends AbstractComponent(LitElement) {
  public static styles = unsafeCSS(dataSourceStyles);

  // TODO: The polymorphic typing of src (string | File) is a red hearing that
  // something is wrong with the design of this component.
  // I originally added "File" to the typing so that when uploading a local file
  // the src property would have a file object that had the original file name.
  /** A remote JSON or CSV file to use as the data source */
  @property({ reflect: true })
  public src?: string | File;

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

  /**
   * Toggles the viability a "Download Results" button in the user interface.
   * Note if allow-downloads is set to "false", results download can still be
   * invoked by host applications through the "downloadResults" method.
   */
  @property({ attribute: "allow-downloads", type: Boolean, converter: booleanConverter })
  public allowDownloads = true;

  @state()
  private canDownload = false;

  @state()
  private fileName?: string;

  @query("input[type=file]", true)
  private fileInput!: HTMLInputElement;

  public urlSourcedFetcher?: UrlSourcedFetcher;
  private verificationGrid?: VerificationGridComponent;
  private readonly decisionHandler = this.handleDecision.bind(this);

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

    // 1. If the data source is a URL (or file served through a URL), we know
    //    all the contents of the dataset. Therefore, we need to return the
    //    entire dataset with additional columns for decisions
    //
    // 2. If the data source is provided through a callback, we do not know the
    //    entire dataset when downloading. Therefore, we don't need to worry
    //    about joining the decisions with the original dataset, and we can just
    //    flatten the subjects and their decisions
    if (this.isUrlSourced()) {
      await this.downloadUrlSourcedResults();
    } else {
      await this.downloadCallbackSourcedResults();
    }
  }

  private async resultRows(): Promise<Partial<DownloadableResult>[]> {
    if (!this.verificationGrid) {
      throw new Error("could not find verification grid component");
    }

    const seenSubjects = this.verificationGrid.subjects;

    // If the data source is url sourced, we know the entire files content ahead
    // of time, and we assume that the user does too.
    // Therefore, we download all of the subjects, including subjects that the
    // user has not seen.
    if (this.isUrlSourced()) {
      await this.verificationGrid.flushAllSubjects();
      return seenSubjects.map((model) => model.toDownloadable());
    }

    // When downloading callback provided results, we want to download all the
    // subjects that the user has seen, including the current page.
    // Because the verification grids subject array only contains items that the
    // user has seen up to, we simply download the verification grids subject
    // array.
    return seenSubjects.map((model) => model.toDownloadable());
  }

  private async downloadCallbackSourcedResults(): Promise<void> {
    const downloadableResults = await this.resultRows();
    const stringifiedResults = JSON.stringify(downloadableResults);

    const file = new File([stringifiedResults], "verification-results.json", { type: "application/json" });
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

    const downloadableResults = await this.resultRows();

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
      formattedResults = JSON.stringify(downloadableResults);
    } else if (fileFormat.startsWith("text/csv")) {
      formattedResults = new Parser().parse(downloadableResults);
    } else if (fileFormat.startsWith("text/tab-separated-values")) {
      formattedResults = new Parser({ delimiter: "\t" }).parse(downloadableResults);
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

  // TODO: remove this hack that was added to fix an issue where if the
  // data source was changed from a local file to a callback-based source
  // the downloaded results would return the previously used local file
  // as the basis for the results
  private isUrlSourced(): boolean {
    return this.verificationGrid?.getPage?.brand === UrlSourcedFetcher.brand;
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

    this.src = file;
  }

  private async updateVerificationGrid(): Promise<void> {
    if (!this.verificationGrid) {
      throw new Error("could not find verification grid component");
    } else if (!this.src) {
      return;
    }

    this.verificationGrid.transitionDatasetFetching();
    try {
      this.urlSourcedFetcher = await new UrlSourcedFetcher().updateSrc(this.src);
    } catch (error) {
      console.error("Failed to update data source:", error);
      this.verificationGrid.transitionError();
      return;
    }

    if (!this.urlSourcedFetcher.file) {
      throw new Error("Data fetcher does not have a file.");
    }

    this.fileName = this.urlSourcedFetcher.file.name;

    const subjects = await this.urlSourcedFetcher.generateSubjects();

    const localDataFetcher: PageFetcher = async (context: { completed: boolean }) => {
      const items = context.completed ? [] : subjects;

      return {
        subjects: items,
        totalItems: subjects.length,
        context: { completed: true },
      };
    };
    localDataFetcher.brand = UrlSourcedFetcher.brand;

    this.verificationGrid.getPage = localDataFetcher;
  }

  private fileInputTemplate(): HTMLTemplateResult {
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
          accept=".csv,.json,.tsv"
          @change="${(event: Event) => this.handleFileChange(event)}"
        />
      </span>
    `;
  }

  public downloadResultsTemplate(): HTMLTemplateResult {
    return html`
      <button
        data-testid="download-results-button"
        class="oe-btn-primary"
        @click="${this.downloadResults}"
        ?disabled="${!this.canDownload}"
      >
        <slot>Download Results</slot>
      </button>
    `;
  }

  public render() {
    return html`
      <div class="data-source">
        ${when(this.local, () => this.fileInputTemplate())}
        ${when(this.allowDownloads, () => this.downloadResultsTemplate())}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-data-source": DataSourceComponent;
  }
}
