import { useRef, useState, type CSSProperties, type PointerEvent } from "react";

export interface ImageSelection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  imageUrl: string;
}

interface ImageSelectorProps {
  imageUrl: string;
  selections: ImageSelection[];
  selectedSelectionId: string | null;
  onSelectionAdd: (selection: ImageSelection) => void;
}

interface Point {
  x: number;
  y: number;
}

interface DraftSelection {
  start: Point;
  current: Point;
}

const minimumDisplaySize = 5;

function ImageSelector({
  imageUrl,
  selections,
  selectedSelectionId,
  onSelectionAdd,
}: ImageSelectorProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [draft, setDraft] = useState<DraftSelection | null>(null);
  const [imageSize, setImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const getImagePoint = (event: PointerEvent<HTMLDivElement>): Point | null => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return null;

    const bounds = image.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const y = Math.min(Math.max(event.clientY - bounds.top, 0), bounds.height);

    return {
      x: (x / bounds.width) * image.naturalWidth,
      y: (y / bounds.height) * image.naturalHeight,
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !imageRef.current?.naturalWidth) return;
    const point = getImagePoint(event);
    if (!point) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft({ start: point, current: point });
    console.log({
      clientX: event.clientX,
      imageLeft: imageRef.current?.getBoundingClientRect().left,
      imageWidth: imageRef.current?.getBoundingClientRect().width,
      naturalWidth: imageRef.current?.naturalWidth,
      point,
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    const point = getImagePoint(event);
    if (point)
      setDraft((current) => (current ? { ...current, current: point } : null));
  };

  const finishSelection = (event: PointerEvent<HTMLDivElement>) => {
    if (!draft) return;

    const point = getImagePoint(event) ?? draft.current;
    const image = imageRef.current;
    const bounds = image?.getBoundingClientRect();
    const width = Math.abs(point.x - draft.start.x);
    const height = Math.abs(point.y - draft.start.y);
    const displayWidth = image?.naturalWidth
      ? (width / image.naturalWidth) * (bounds?.width ?? 0)
      : 0;
    const displayHeight = image?.naturalHeight
      ? (height / image.naturalHeight) * (bounds?.height ?? 0)
      : 0;

    if (
      image &&
      displayWidth >= minimumDisplaySize &&
      displayHeight >= minimumDisplaySize
    ) {
      onSelectionAdd({
        id: crypto.randomUUID(),
        x: Math.round(Math.min(draft.start.x, point.x)),
        y: Math.round(Math.min(draft.start.y, point.y)),
        width: Math.max(1, Math.round(width)),
        height: Math.max(1, Math.round(height)),
        imageUrl,
      });
    }

    setDraft(null);
  };

  const handlePointerCancel = () => setDraft(null);

  const rectangleStyle = (
    x: number,
    y: number,
    width: number,
    height: number,
  ): CSSProperties => {
    if (!imageSize?.width || !imageSize.height) return { display: "none" };

    return {
      left: `${(x / imageSize.width) * 100}%`,
      top: `${(y / imageSize.height) * 100}%`,
      width: `${(width / imageSize.width) * 100}%`,
      height: `${(height / imageSize.height) * 100}%`,
      position: "absolute",
    };
  };

  const draftRectangle = draft
    ? {
        x: Math.min(draft.start.x, draft.current.x),
        y: Math.min(draft.start.y, draft.current.y),
        width: Math.abs(draft.current.x - draft.start.x),
        height: Math.abs(draft.current.y - draft.start.y),
      }
    : null;
  console.log(selections, "selections");
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        width: "fit-content",
        maxWidth: "100%",
        lineHeight: 0,
        touchAction: "none",
        userSelect: "none",
        cursor: "crosshair",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishSelection}
      onPointerCancel={handlePointerCancel}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="待框选的原始图片"
        draggable={false}
        onLoad={(event) =>
          setImageSize({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          })
        }
        onDragStart={(event) => event.preventDefault()}
        style={{
          display: "block",
          width: "auto",
          height: "auto",
          maxWidth: "100%",
          maxHeight: "min(68vh, 760px)",
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, overflow: "hidden" }}
      >
        {/* 已经矩形框 */}
        {selections.map((selection) => (
          <div
            key={selection.id}
            style={{
              ...rectangleStyle(
                selection.x,
                selection.y,
                selection.width,
                selection.height,
              ),
              boxSizing: "border-box",
              border:
                selection.id === selectedSelectionId
                  ? "2px solid #ffb020"
                  : "2px solid #3d8bfd",
              background:
                selection.id === selectedSelectionId
                  ? "rgba(255, 176, 32, 0.16)"
                  : "rgba(61, 139, 253, 0.12)",
              pointerEvents: "none",
            }}
          />
        ))}
        {/* 正在拖拽  */}
        {draftRectangle && (
          <div
            style={{
              ...rectangleStyle(
                draftRectangle.x,
                draftRectangle.y,
                draftRectangle.width,
                draftRectangle.height,
              ),
              boxSizing: "border-box",
              border: "2px dashed #ffffff",
              background: "rgba(255, 255, 255, 0.14)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ImageSelector;
