import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { Tag } from "../../models/tag";
import { DataComponent } from "../../helpers/dataComponent";

/**
 * @description
 * A tag that can be placed inside an oe-annotation component
 *
 * @slot - Content that can be displayed to describe the tag
 */
@customElement("oe-tag")
export class TagComponent extends AbstractComponent(LitElement) implements DataComponent<Tag> {
  @property({ type: String })
  public value = "";

  private get innerElements(): Element[] {
    // if the slotted content is text without a wrapper element
    // e.g. <oe-tag>Cow</oe-tag>
    // it will not be caught by a @queryAssignedElements decorator
    // to fix this, I get all of the text content of the host element and assign
    // it to a new element that only contains that text

    const childNodes = Array.from(this.childNodes);
    return childNodes.map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textElement = document.createElement("span");
        textElement.textContent = node.textContent?.trim() || "";
        return textElement;
      }

      if (!(node instanceof Element)) {
        throw new Error("Unexpected element node type");
      }

      return node;
    });
  }

  public get model(): Readonly<Tag> {
    const elementReferences = this.innerElements;

    return {
      text: this.value,
      reference: null,
      elementReferences,
    };
  }

  public render() {
    return html`<slot class="hide-slot-content"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-tag": TagComponent;
  }
}
