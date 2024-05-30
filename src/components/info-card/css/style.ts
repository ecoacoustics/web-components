import { css } from "lit";

export const infoCardStyle = css`
  .card-container {
    position: relative;
    width: calc(100% - 0.5rem);
    max-width: 345px;
    padding: 0.5rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
    color: var(--oe-info-color);
    background-color: var(--oe-info-background-color);
    border-radius: var(--oe-border-rounding);
    font-size: 0.8rem;

    /* TODO: This is a hack to get around the axes component being incorrectly sized */
    margin-top: 1rem;
  }

  .subject-row {
    display: grid;
    grid-template-columns: 1fr 2fr;
    padding-bottom: 0.5rem;

    .subject-key {
      font-weight: bold;
    }

    .subject-value {
      word-wrap: break-word;
    }
  }

  .static-actions {
    display: flex;
    justify-content: space-between;
    padding-top: 0.5rem;
  }

  .download-link {
    padding-top: 1rem;
  }
`;
