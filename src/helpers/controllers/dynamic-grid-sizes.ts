import { VerificationGridComponent } from "../../components/verification-grid/verification-grid";
import { Size } from "../../models/rendering";
import { Pixel, UnitInterval } from "../../models/unitConverters";

export interface GridShape {
  rows: number;
  columns: number;
}

export class DynamicGridSizeController<Container extends HTMLElement> {
  public constructor(container: Container, targetElement: VerificationGridComponent) {
    this.targetElement = targetElement;

    const resizeObserver = new ResizeObserver((size: ResizeObserverEntry[]) => {
      // because we know that this resize observer will only ever be used with
      // one element, we can safely assume that the first element in the array
      // is the container element
      const container = size[0];
      this.handleResize(container);
    });
    resizeObserver.observe(container);

    // use a mutation observer to check when grid tiles are added to the grid
    const mutationObserver = new MutationObserver((mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        const addedNodes = Array.from(mutation.addedNodes);
        for (const node of addedNodes) {
          const isGridTile = node instanceof HTMLElement;
          if (isGridTile) {
            this.observeTile(node);
          }
        }
      }
    });
    mutationObserver.observe(container, { childList: true });
  }

  private targetElement: VerificationGridComponent;
  private candidateShapes: GridShape[] = [];
  private containerSize: Size = { width: 0, height: 0 };
  private minimumTileSize: Size = { width: 180, height: 300 };
  private target?: number;

  public setTarget(target: number): void {
    const candidates = this.generateSearchTargetBuffer(target);
    this.candidateShapes = this.sortByEligibility(candidates);
    this.target = target;
  }

  public autoShapeGrid(): void {
    if (this.target !== undefined) {
      this.candidateShapes = this.generateSearchTargetBuffer(this.target);

      const startingShape = this.candidateShapes[0];
      this.setGridShape(startingShape);
    }
  }

  private observeTile(element: HTMLElement): void {
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        this.handleIntersection(entries[0]);
      },
      { threshold: 0 },
    );
    observer.observe(element);
  }

  // because we might overflow above and below the target, we generate possible
  // grid shapes that are within a certain range of the target
  private generateSearchTargetBuffer(target: number): GridShape[] {
    const displacementLimit = 2;
    const upperLimit = target + displacementLimit;

    const candidateTargets = [this.sortByEligibility(this.fittingCandidateShapesForTarget(target))];

    for (let displacement = 1; displacement <= upperLimit; displacement++) {
      const lowerTarget = target - displacement;
      const upperTarget = target + displacement;

      if (lowerTarget > 0) {
        const lowerCandidates = this.fittingCandidateShapesForTarget(lowerTarget);
        candidateTargets.push(this.sortByEligibility(lowerCandidates));
      }

      const upperCandidates = this.fittingCandidateShapesForTarget(upperTarget);
      candidateTargets.push(this.sortByEligibility(upperCandidates));
    }

    return candidateTargets.flat();
  }

  private fittingCandidateShapesForTarget(target: number): GridShape[] {
    const candidateShapes = this.candidateShapesForTarget(target);
    return candidateShapes.filter((shape) => {
      const fitsShape = this.willFitShape(shape);
      const meetsThreshold = this.meetsAspectRatioSimilarityThreshold(shape);
      return fitsShape && meetsThreshold;
    });
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
        candidateShapes.push({ columns, rows });
      }
    }

    return candidateShapes;
  }

  private sortByEligibility(shapes: GridShape[]): GridShape[] {
    const sortCallback = (a: GridShape, b: GridShape): number => {
      const aSimilarity = this.gridAspectRatioSimilarity(this.containerSize, a);
      const bSimilarity = this.gridAspectRatioSimilarity(this.containerSize, b);
      return bSimilarity - aSimilarity;
    };

    return shapes.sort(sortCallback);
  }

  private handleResize(container: ResizeObserverEntry): void {
    this.containerSize = container.contentRect;
    this.autoShapeGrid();
  }

  private handleIntersection(entry: IntersectionObserverEntry): void {
    if (entry.intersectionRatio === 1) {
      return;
    }

    this.candidateShapes.shift();
    this.setGridShape(this.candidateShapes[0]);
  }

  private setGridShape(shape: GridShape): void {
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
    const minimumTileWidth: Pixel = this.minimumTileSize.width;
    const minimumTileHeight: Pixel = this.minimumTileSize.height;

    const proposedTileSize = this.tileSizeForShape(gridShape);

    const meetsMinimumWidth = proposedTileSize.width >= minimumTileWidth;
    const meetsMinimumHeight = proposedTileSize.height >= minimumTileHeight;

    return meetsMinimumHeight && meetsMinimumWidth;
  }

  private tileSizeForShape(gridShape: GridShape): Size {
    const usableContainerSize: Size = {
      width: this.containerSize.width,
      height: this.containerSize.height,
    };

    const width = usableContainerSize.width / gridShape.columns;
    const height = usableContainerSize.height / gridShape.rows;

    return { width, height };
  }

  private meetsAspectRatioSimilarityThreshold(gridShape: GridShape): boolean {
    // some numbers e.g. 9 have one factor such as 3x3 which creates a aspect
    // ratio of 1.00
    // using a 3x3 grid for a 16:9 (≈1.78) screen is not ideal because it will
    // create a lot of dead space
    // therefore, we have a threshold that we have to meet. If we do not meet
    // the threshold, we keep increasing the target until we find a grid shape
    // that meets the similarity percentage threshold
    const threshold: UnitInterval = 0.5;

    const similarity = this.gridAspectRatioSimilarity(this.containerSize, gridShape);
    return similarity >= threshold;
  }
}
