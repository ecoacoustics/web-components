import { css } from "lit";

export const mediaControlsStyles = css`
  :host {
    /*
    * We specify the default width and height in the :host
    * So that the user can easily overwrite these values by setting them in the parent element
    */
    display: flex;
    width: 2.8rem;
    height: 2.3rem;
    background-color: white;
    border: solid thin hsl(206.93deg, 100%, 24.9%);
    border-radius: 8px;
    padding: 0.1rem 0.5rem;
  }

  #action-button {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    /*
    * By making the background color transparent, the user can customise
    * This elements background color by setting it in the parent element
    * eg. <oe-media-controls style="background-color: red"></oe-media-controls>
    *     Will change the background color of the action button to red
    */
    background-color: transparent;
    border: none;

    width: 100%;
    height: 100%;
  }
`;
