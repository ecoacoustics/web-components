import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
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

  private get innerElements(): Element[] {
    // if the slotted content is text without a wrapper element
    // e.g. <oe-tag>Cow</oe-tag>
    // it will not be caught by the @queryAssignedElements decorator
    // to fix this, I get all of the text content of the host element and assign
    // it to a new "virtual" element that only contains that text

    return Array.from(this.childNodes).map((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textElement = document.createElement("span");
        textElement.textContent = node.textContent?.trim() || "";
        return textElement;
      }

      return node as Element;
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
    return html`<slot class="hide-slot"></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "oe-tag": TagComponent;
  }
}
