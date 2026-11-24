import { useRef, useState } from "react";
import { Icon } from "../../ui/icon";
import { ToolButton } from "./tool-button";

type Stroke = { color: string; width: number; points: [number, number][] };

export function DrawingTools({ active, onExit }: { active: boolean; onExit: () => void }) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [penColor, setPenColor] = useState("#df3333");
  const [penWidth, setPenWidth] = useState(3);
  const inStroke = useRef(false);
  const drawingSvg = useRef<SVGSVGElement>(null);

  function downloadDrawing() {
    const svg = drawingSvg.current;
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "respiratory-annotations.svg";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!active) return null;

  return (
    <>
      <svg
        ref={drawingSvg}
        className="bd-drawing"
        xmlns="http://www.w3.org/2000/svg"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          inStroke.current = true;
          const box = e.currentTarget.getBoundingClientRect();
          setStrokes((v) => [
            ...v,
            {
              color: penColor,
              width: penWidth,
              points: [[e.clientX - box.left, e.clientY - box.top]],
            },
          ]);
        }}
        onPointerMove={(e) => {
          if (!inStroke.current) return;
          const box = e.currentTarget.getBoundingClientRect();
          const point: [number, number] = [
            e.clientX - box.left,
            e.clientY - box.top,
          ];
          setStrokes((v) =>
            v.map((stroke, i) =>
              i === v.length - 1
                ? { ...stroke, points: [...stroke.points, point] }
                : stroke,
            ),
          );
        }}
        onPointerUp={() => {
          inStroke.current = false;
        }}
        onPointerCancel={() => {
          inStroke.current = false;
        }}
      >
        {strokes.map((stroke, i) => (
          <polyline
            key={i}
            points={stroke.points.map((p) => p.join(",")).join(" ")}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div className="bd-draw-tools bd-tool-group">
        <label title="Pen color" className="bd-tool">
          <Icon name="brush" />
          <input
            type="color"
            value={penColor}
            aria-label="Pen color"
            onChange={(e) => setPenColor(e.target.value)}
          />
        </label>
        <label className="bd-pen-width">
          Size
          <input
            type="range"
            min="1"
            max="12"
            value={penWidth}
            aria-label="Pen width"
            onChange={(e) => setPenWidth(Number(e.target.value))}
          />
        </label>
        <ToolButton
          icon="undo"
          label="Undo stroke"
          onClick={() => setStrokes((v) => v.slice(0, -1))}
        />
        <ToolButton
          icon="trash"
          label="Clear drawing"
          onClick={() => setStrokes([])}
        />
      </div>
      <div className="bd-draw-actions">
        <ToolButton
          icon="download"
          label="Download annotations"
          onClick={downloadDrawing}
        />
        <button
          className="bd-secondary"
          onClick={onExit}
        >
          Exit Draw
        </button>
      </div>
    </>
  );
}
