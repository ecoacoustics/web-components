import { html, LitElement } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { Tag } from "../../models/tag";

/**
 * @description
 * A tag that can be placed inside an oe-annotation component
 *
 * @slot - Content that can be displayed to describe the tag
 */
@customElement("oe-tag")
export class TagComponent extends AbstractComponent(LitElement) {
  @property({ type: String })
  public value = "";

  @queryAssignedElements()
  private innerElements!: NodeListOf<Element>;

  public get model(): Readonly<Tag> {
    const elementReferences = Array.from(this.innerElements);

    return {
      text: this.value,
      reference: null,
      elementReferences,
    };
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
