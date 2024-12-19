import { DecisionComponent } from "decision/decision";
import { SvgSprite } from "../../../helpers/animations/sprites";
import { svg } from "lit";
import { ClassificationComponent } from "../../decision/classification/classification";

// we have a limit parameter so that we can only select a subset of the decision
// buttons to use as a sprite.
// this is useful for the tutorial bootstrap where we don't want to overwhelm
// the user with all of the options at once.
export function decisionButtonSprite(x: number, y: number, decisionButton: DecisionComponent): SvgSprite {
  const isClassification = decisionButton instanceof ClassificationComponent;
  const width = 42 as const;
  const height = 42 as const;

  return svg`
    <svg viewbox="0 0 ${width} ${height}" x="${x}" y="${y}" width="${width}" height="${height}">
      <g class="decision-button">
        ${isClassification ? classificationButtonSprite() : verificationButtonSprite()}
      </g>
    </svg>
  `;
}

function verificationButtonSprite(): SvgSprite {
  return svg`
    <g class="true-decision">
      <rect
        x="1"
        y="1"
        width="18"
        height="30"
        rx="3"
        stroke="var(--oe-primary-color)"
        stroke-width="0.5"
        fill="transparent"
      />

      <g>
        <rect x="5" y="5" rx="1.5" width="10" height="3" fill="green" />
        <text x="4.5" y="16" font-size="6.5">true</text>
      </g>
    </g>

    <g class="false-decision">
      <rect
        x="21"
        y="1"
        width="18"
        height="30"
        rx="3"
        stroke="var(--oe-primary-color)"
        stroke-width="0.5"
        fill="transparent"
      />

      <g>
        <rect x="25" y="5" rx="1.5" width="10" height="3" fill="red" />
        <text x="23.5" y="16" font-size="6.5">false</text>
      </g>
    </g>
  `;
}

function classificationButtonSprite(): SvgSprite {
  return svg`
    <g>
      <path
        d="M 1 1 L 39 1 L 39 13 C 1 13 1 13 1 13 Z"
        fill="var(--oe-background-color)"
        stroke="var(--oe-primary-color)"
        stroke-width="0.5"
      />

      <text x="5" y="10" font-size="6.5" stroke-color="black">Tag Name</text>
    </g>

    <g class="true-decision">
      <path
        d="M 1 13 L 20 13 L 20 39 L 1 39 Z"
        fill="var(--oe-background-color)"
        stroke="var(--oe-primary-color)"
        stroke-width="0.5"
      />

      <g>
        <rect x="5" y="18" rx="1.5" width="11" height="3" fill="red" />
        <text x="5" y="28" font-size="6.5">true</text>
      </g>
    </g>

    <g class="false-decision">
      <path
        d="M 20 13 L 39 13 L 39 39 L 20 39 Z"
        fill="var(--oe-background-color)"
        stroke="var(--oe-primary-color)"
        stroke-width="0.5"
      />

      <g>
        <rect x="25" y="18" rx="1.5" width="11" height="3" fill="maroon" />
        <text x="23.5" y="28" font-size="6.5">false</text>
      </g>
    </g>
  `;
}
