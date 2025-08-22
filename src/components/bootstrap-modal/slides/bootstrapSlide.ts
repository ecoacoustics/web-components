import { HTMLTemplateResult } from "lit";

export interface BootstrapSlide {
  slideTemplate: HTMLTemplateResult;
  title: string;
  description?: string;
}
