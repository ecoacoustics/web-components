import { HTMLTemplateResult } from "lit";
import { DirectiveResult } from "lit-html/directive.js";

export interface BootstrapSlide {
  slideTemplate: HTMLTemplateResult | DirectiveResult;
  title: string;
  description?: string;
}
