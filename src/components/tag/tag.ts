import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { Tag } from "../../models/tag";

/**
 * @description
 * A tag that can be placed inside an oe-annotation component
 */
@customElement("oe-tag")
export class TagComponent extends AbstractComponent(LitElement) {
  @property({ type: String })
  public value = "";

  public get model(): Readonly<Tag> {
    return { text: this.value };
  }

  public render() {
    return html`<slot class="hide-slot"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-tag": TagComponent;
  }
}
