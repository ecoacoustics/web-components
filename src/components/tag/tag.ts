import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";
import { Tag } from "../../models/tag";

@customElement("oe-tag")
export class TagComponent extends AbstractComponent(LitElement) {
  public get model(): Readonly<Tag> {
    return { text: this.textContent ?? "" };
  }
}
