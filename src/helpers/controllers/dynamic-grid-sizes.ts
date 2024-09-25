import { Signal } from "@lit-labs/preact-signals";
import { VerificationGridComponent } from "../../components/verification-grid/verification-grid";
import { Size } from "../../models/rendering";
import { Pixel, UnitInterval } from "../../models/unitConverters";

export interface GridShape {
  rows: number;
  columns: number;
  strength?: number;
}

export class DynamicGridSizeController<Container extends HTMLElement> {
  public constructor(container: Container, targetElement: VerificationGridComponent, isOverlapping: Signal<boolean>) {
    this.targetElement = targetElement;
    this.isOverlapping = isOverlapping;

    const resizeObserver = new ResizeObserver((size: ResizeObserverEntry[]) => {
      // because we know that this resize observer will only ever be used with
      // one element, we can safely assume that the first element in the array
      // is the container element
      const container = size[0];
      this.handleResize(container);
    });
    resizeObserver.observe(container);
    let debounceTimeout: number | undefined;

    this.isOverlapping.subscribe((value: boolean) => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      debounceTimeout = window.setTimeout(() => {
        if (value) {
          this.handleIntersection();
        }
      }, 500);
    });
  }

  private targetElement: VerificationGridComponent;
  private candidateShapes: GridShape[] = [];
  private containerSize: Size = { width: 0, height: 0 };
  // private minimumGridCellSize: Size = { width: 0, height: 0 };
  private minimumGridCellSize: Size = { width: 200, height: 300 };
  private fallbackGridShape: GridShape = { columns: 1, rows: 1, strength: 0 };
  private isOverlapping: Signal<boolean>;
  private target = 0;

  public setTarget(target: number): void {
    this.target = target;
    this.candidateShapes = this.generateSearchTargetBuffer(target);
    this.nextGridShape();
  }

  private handleResize(container: ResizeObserverEntry): void {
    this.containerSize = container.contentRect;
    this.setTarget(this.target);
  }

  private handleIntersection(): void {
    this.nextGridShape();
  }

  /**
   * This function will start a process that picks the most optimal grid size
   * it might not pick a grid size that fits exactly.
   * In this case, the intersection handler will be called to try a different
   * grid size.
   */
  private nextGridShape(): void {
    const nextCandidate = this.nextCandidateShape();
    this.setGridShape(nextCandidate);
  }

  /**
   * @returns
   * The first candidate shape that is viable.
   * Viability means that we have determined that it will fit in the container
   * and that it hasn't overflowed in the past.
   */
  private nextCandidateShape(): GridShape {
    // this.candidateShapes.forEach((shape) => {
    //   console.log(shape);
    // });

    const nextBufferCandidate = this.candidateShapes.shift();
    // console.log(nextBufferCandidate);
    if (nextBufferCandidate) {
      return nextBufferCandidate;
    }

    console.error("ran out of candidates, using 1x1 as fallback");
    return this.fallbackGridShape;
  }

  // because we might overflow above and below the target, we generate possible
  // grid shapes that are within a certain range of the target
  private generateSearchTargetBuffer(target: number, displacementStart = 1, displacementLimit = 2): GridShape[] {
    const candidateTargets = [this.sortByEligibility(this.candidateShapesForTarget(target))];

    for (let displacement = displacementStart; displacement <= displacementLimit; displacement++) {
      const lowerTarget = target - displacement;
      const upperTarget = target + displacement;

      // we push the upper candidates first so that they are preferred if we
      // cannot exactly match the target
      const upperCandidates = this.candidateShapesForTarget(upperTarget);
      candidateTargets.push(this.sortByEligibility(upperCandidates));

      if (lowerTarget > 0) {
        const lowerCandidates = this.candidateShapesForTarget(lowerTarget);
        candidateTargets.push(this.sortByEligibility(lowerCandidates));
      }
    }

    return candidateTargets.flat();
  }

  /**
   * Returns all the possible grid shapes that can be used to create a grid of
   * the target size.
   * This function does not check if the grid shape will fit in the container.
   */
  private candidateShapesForTarget(target: number): GridShape[] {
    const candidateShapes: GridShape[] = [];

    // find all the factors of the target grid size
    for (let i = 1; i <= target; i++) {
      const isFactor = target % i === 0;
      if (isFactor) {
        const columns = i;
        const rows = target / i;

        const willFit = this.willFitShape({ columns, rows });
        if (willFit) {
          candidateShapes.push({ columns, rows });
        }
      }
    }

    return candidateShapes;
  }

  private sortByEligibility(shapes: GridShape[]): GridShape[] {
    const sortCallback = (a: GridShape, b: GridShape): number => {
      const aStrength = this.gridAspectRatioSimilarity(this.containerSize, a);
      const bStrength = this.gridAspectRatioSimilarity(this.containerSize, b);
      a.strength = aStrength;
      b.strength = bStrength;
      return bStrength - aStrength;
    };

    return shapes.sort(sortCallback);
  }

  private setGridShape(shape: GridShape): void {
    this.isOverlapping.value = false;
    this.targetElement.columns = shape.columns;
    this.targetElement.rows = shape.rows;
  }

  /**
   * @description
   * Computes the similarity between the grid aspect ratio and the container
   * aspect ratio
   *
   * @param containerSize - The size of the grid container
   * @param gridShape - The shape of the grid
   *
   * @returns A value between 0 and 1 that represents the similarity between the
   * grid aspect ratio and the container aspect ratio
   */
  private gridAspectRatioSimilarity(containerSize: Size, gridShape: GridShape): UnitInterval {
    const targetAspectRatio = containerSize.width / containerSize.height;
    const candidateSizeAspectRatio = gridShape.columns / gridShape.rows;

    const distance = Math.abs(targetAspectRatio - candidateSizeAspectRatio);
    const maxRatio = Math.max(targetAspectRatio, candidateSizeAspectRatio);
    const similarity = 1 - distance / maxRatio;

    return similarity;
  }

  private willFitShape(gridShape: GridShape): boolean {
    const minimumTileWidth: Pixel = this.minimumGridCellSize.width;
    const minimumTileHeight: Pixel = this.minimumGridCellSize.height;

    const proposedTileSize = this.gridCellSizeForShape(gridShape);

    const meetsMinimumWidth = proposedTileSize.width >= minimumTileWidth;
    const meetsMinimumHeight = proposedTileSize.height >= minimumTileHeight;

    return meetsMinimumHeight && meetsMinimumWidth;
  }

  private gridCellSizeForShape(gridShape: GridShape): Size {
    const usableContainerSize: Size = {
      width: this.containerSize.width,
      height: this.containerSize.height,
    };

    const width = usableContainerSize.width / gridShape.columns;
    const height = usableContainerSize.height / gridShape.rows;

    return { width, height };
  }
}
