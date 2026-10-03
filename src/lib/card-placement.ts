export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export type CardPlacement = {
  left: number;
  top: number;
  arrowX: number;
  /** Pixels the map view must pan (Leaflet panBy offset) for the whole card to fit. */
  pan: Point;
  markerVisible: boolean;
};

export type PlacementOptions = {
  /** Gap between the marker point and the bottom of the card. */
  gap: number;
  /** Minimum distance kept between the card and the left, right and bottom edges. */
  margin: number;
  /** Minimum distance kept between the card and the top edge. */
  topInset: number;
  /** Minimum distance the arrow keeps from the card's rounded corners. */
  arrowInset: number;
};

export function placeCard(marker: Point, card: Size, container: Size, options: PlacementOptions): CardPlacement {
  const { gap, margin, topInset, arrowInset } = options;

  const idealLeft = marker.x - card.width / 2;
  const maxLeft = Math.max(margin, container.width - card.width - margin);
  const left = Math.min(Math.max(idealLeft, margin), maxLeft);
  const top = marker.y - gap - card.height;

  const arrowX = Math.min(Math.max(marker.x - left, arrowInset), Math.max(arrowInset, card.width - arrowInset));

  const shiftRight = idealLeft < margin ? margin - idealLeft : 0;
  const shiftLeft = idealLeft > maxLeft ? idealLeft - maxLeft : 0;
  const shiftDown = top < topInset ? topInset - top : 0;

  return {
    left,
    top,
    arrowX,
    pan: { x: shiftLeft - shiftRight, y: shiftDown > 0 ? -shiftDown : 0 },
    markerVisible: marker.x >= 0 && marker.x <= container.width && marker.y >= 0 && marker.y <= container.height,
  };
}
