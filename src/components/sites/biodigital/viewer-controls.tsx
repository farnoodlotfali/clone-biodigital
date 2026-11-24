import { useState, type Dispatch, type SetStateAction } from "react";
import type { SceneHandle } from "./anatomy-scene";
import { Icon } from "../../ui/icon";
import { ToolButton } from "./tool-button";
import type { Panel } from "./viewer-panel";

export type ViewerMenu = "tools" | "more" | "help" | null;
export type SelectionTool = Parameters<SceneHandle["select"]>[1];

type ViewerControlsProps = {
  drawing: boolean;
  panel: Panel;
  menu: ViewerMenu;
  tool: SelectionTool;
  selected: string | null;
  full: boolean;
  setMenu: Dispatch<SetStateAction<ViewerMenu>>;
  setTool: (tool: SelectionTool) => void;
  onToggleMobileInfo: () => void;
  onTogglePanel: () => void;
  onOpenPanel: (panel: NonNullable<Panel>) => void;
  onStartDrawing: () => void;
  onZoom: (factor: number) => void;
  onReset: () => void;
  onToggleFullscreen: () => void;
  onClearSelection: () => void;
};

export function ViewerControls({
  drawing, panel, menu, tool, selected, full, setMenu, setTool,
  onToggleMobileInfo, onTogglePanel, onOpenPanel, onStartDrawing, onZoom,
  onReset, onToggleFullscreen, onClearSelection,
}: ViewerControlsProps) {
  const [cameraControls, setCameraControls] = useState(false);

  if (drawing) return null;

  return (
    <>
      <div className="bd-mobile-title">
        <button
          onClick={onToggleMobileInfo}
        >
          Female Respiratory System
        </button>
        <ToolButton
          icon="info"
          label="About this model"
          onClick={onToggleMobileInfo}
        />
      </div>
      <nav className="bd-tools" aria-label="Viewer tools">
        <div className="bd-tool-group bd-panel-toggle">
          <ToolButton
            icon={panel ? "collapse" : "expand"}
            label={panel ? "Close Info Panel" : "Open Info Panel"}
            onClick={onTogglePanel}
          />
        </div>
        <div className="bd-tool-group">
          <ToolButton
            icon={
              tool === "Hide"
                ? "hide"
                : tool === "Fade"
                  ? "fade"
                  : "select"
            }
            label="Selection Tools"
            active={menu === "tools"}
            onClick={() =>
              setMenu((v) => (v === "tools" ? null : "tools"))
            }
          />
          <ToolButton
            icon="layers"
            label="Anatomy Layers"
            active={panel === "layers"}
            onClick={() => onOpenPanel("layers")}
          />
          <ToolButton
            icon="search"
            label="Anatomy Search"
            active={panel === "search"}
            onClick={() => onOpenPanel("search")}
          />
          <ToolButton
            icon="draw"
            label="Draw"
            onClick={onStartDrawing}
          />
          <ToolButton
            icon="more"
            label="More Options"
            active={menu === "more"}
            onClick={() =>
              setMenu((v) => (v === "more" ? null : "more"))
            }
          />
        </div>
      </nav>
      {menu === "tools" && (
        <div className="bd-menu bd-selection-menu" role="menu">
          {(["Select", "Hide", "Fade"] as const).map((name, i) => (
            <button
              role="menuitem"
              key={name}
              onClick={() => {
                setTool(name);
                setMenu(null);
              }}
            >
              <Icon name={(["select", "hide", "fade"] as const)[i]} />
              {name}
            </button>
          ))}
        </div>
      )}
      {menu === "more" && (
        <div className="bd-menu bd-more-menu">
          <button onClick={() => setMenu("help")}>
            Help <Icon name="expand" />
          </button>
        </div>
      )}
      {menu === "help" && (
        <div className="bd-help">
          <div>
            <strong>Explore the model</strong>
            <button
              aria-label="Close help"
              onClick={() => setMenu(null)}
            >
              <Icon name="close" />
            </button>
          </div>
          <p>
            Drag to rotate. Scroll or pinch to zoom. Right-drag or use
            two fingers to pan.
          </p>
          <p>
            Select a structure to highlight it. Use Anatomy Layers to
            adjust visibility, or Draw to add annotations.
          </p>
          <a
            href="https://support.biodigital.com/"
            target="_blank"
            rel="noreferrer"
          >
            BioDigital Help Center
          </a>
        </div>
      )}
      <div className="bd-camera">
        <div className="bd-tool-group">
          <button
            className="bd-camera-toggle"
            aria-label="Toggle 3D navigation controls"
            aria-expanded={cameraControls}
            onClick={() => setCameraControls((v) => !v)}
          >
            <Icon name={cameraControls ? "down" : "up"} />
          </button>
          {cameraControls && (
            <>
              <ToolButton
                icon="plus"
                label="Zoom in"
                onClick={() => onZoom(0.82)}
              />
              <ToolButton
                icon="minus"
                label="Zoom out"
                onClick={() => onZoom(1.22)}
              />
            </>
          )}
          <ToolButton
            icon="reset"
            label="Return to Starting Position"
            onClick={onReset}
          />
        </div>
        <div className="bd-tool-group">
          <ToolButton
            icon="fullscreen"
            label={full ? "Exit Fullscreen" : "Enter Fullscreen"}
            onClick={onToggleFullscreen}
          />
        </div>
      </div>


      {selected && (
        <div className="bd-selected">
          <span>{selected}</span>
          <button
            aria-label="Clear selection"
            onClick={onClearSelection}
          >
            <Icon name="close" />
          </button>
        </div>
      )}
    </>
  );
}
