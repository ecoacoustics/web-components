import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { AbstractComponent } from "../../mixins/abstractComponent";

@customElement("oe-tag")
export class TagComponent extends AbstractComponent(LitElement) {}
