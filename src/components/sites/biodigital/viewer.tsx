"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnatomyScene, type SceneHandle } from "./anatomy-scene";
import { Icon, type IconName } from "./icon";
import "./viewer.css";

const source =
  "https://human.biodigital.com/view?id=production/femaleAdult/female_system_respiratory_20&lang=en";
const signup = "https://human.biodigital.com/signup";
const anatomy = [
  "Aryepiglottic folds",
  "Arytenoid cartilage",
  "Auditory membranes",
  "Auditory tube",
  "Bronchi",
  "Clothes",
  "Corniculate cartilage",
  "Corniculate tubercle",
  "Cricoid cartilage",
  "Cuneiform cartilage",
  "Cuneiform tubercle",
  "Epiglottic cartilage",
  "Epiglottis",
  "Ethmoid sinuses",
  "Eyebrows",
  "Eyelashes",
  "Frontal sinuses",
  "Hair",
  "Larynx",
  "Left lung",
  "Nasal cavity",
  "Pharynx",
  "Right lung",
  "Trachea",
];
type Panel = "info" | "layers" | "search" | null;
type Tool = "Select" | "Hide" | "Fade";
type Stroke = { color: string; width: number; points: [number, number][] };

function ToolButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`bd-tool ${active ? "is-active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
}

export function BioDigitalViewer() {
  const [panel, setPanel] = useState<Panel>("info");
  // const [signupOpen, setSignupOpen] = useState(true);
  const [menu, setMenu] = useState<"tools" | "more" | "help" | null>(null);
  const [tool, setTool] = useState<Tool>("Select");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [skin, setSkin] = useState(82);
  const [respiratory, setRespiratory] = useState(100);
  const [drawing, setDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [penColor, setPenColor] = useState("#df3333");
  const [penWidth, setPenWidth] = useState(3);
  const [cameraControls, setCameraControls] = useState(false);
  const [full, setFull] = useState(false);
  const scene = useRef<SceneHandle>(null);
  const shell = useRef<HTMLDivElement>(null);
  const inStroke = useRef(false);
  const [mobileInfo, setMobileInfo] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenu(null);
        setMobileInfo(false);
        setDrawing(false);
      }
    }
    function fullscreenChange() {
      setFull(Boolean(document.fullscreenElement));
    }
    document.addEventListener("keydown", key);
    document.addEventListener("fullscreenchange", fullscreenChange);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("fullscreenchange", fullscreenChange);
    };
  }, []);

  function togglePanel(next: Panel) {
    setPanel((previous) => (previous === next ? null : next));
    setMenu(null);
    setMobileInfo(true);
  }
  function selectStructure(name: string) {
    setSelected(name);
    scene.current?.select(name, tool);
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.current?.requestFullscreen();
    } catch {
      setFull((v) => !v);
    }
  }
  function reset() {
    scene.current?.reset();
    setSelected(null);
    setSkin(82);
    setRespiratory(100);
  }
  function downloadDrawing() {
    const svg = document.querySelector<SVGSVGElement>(".bd-drawing");
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

  return (
    <div
      ref={shell}
      className={`bd-app ${drawing ? "is-drawing" : ""} ${full ? "is-fullscreen" : ""}`}
    >
      {/* {!drawing && (
        <header className="bd-header">
          <a
            href="https://www.biodigital.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="BioDigital home"
          >
            <Image
              width={169}
              height={24}
              className="bd-logo"
              src="/sites/biodigital/biodigital-logo-white.svg"
              alt="BioDigital"
            />
          </a>
          <a
            className="bd-primary bd-header-signup"
            href={signup}
            target="_blank"
            rel="noreferrer"
          >
            Sign Up For Free
          </a>
        </header>
      )} */}
      <main className={`bd-workspace ${panel && !drawing ? "has-panel" : ""}`}>
        {!drawing && panel && (
          <aside className={`bd-panel ${mobileInfo ? "mobile-open" : ""}`}>
            <div className="bd-panel-heading">
              <h1>
                {panel === "info"
                  ? "Female Respiratory System"
                  : panel === "layers"
                    ? "Anatomy Layers"
                    : "Anatomy Search"}
              </h1>
              <button
                className="bd-panel-close"
                aria-label="Close anatomy column"
                onClick={() => {
                  setPanel(null);
                  setMobileInfo(false);
                }}
              >
                <Icon name="close" />
              </button>
            </div>
            {panel === "info" && (
              <div className="bd-description">
                <p>
                  The respiratory system is made of all of the structures that
                  bring oxygen into the body and expel carbon dioxide. It
                  contains two zones: the conducting zone and the respiratory
                  zone.
                </p>
                <p>
                  The conducting zone extends from the nose to the terminal
                  bronchioles within the lungs. These structures help filter,
                  warm, and moisten air while leading it towards the respiratory
                  zone. The respiratory zone, which contains the respiratory
                  bronchioles and alveoli, are the sites of oxygen-carbon
                  dioxide gas exchange.
                </p>
              </div>
            )}
            {panel === "layers" && (
              <div className="bd-layers">
                <label className="bd-layer-label" htmlFor="skin-opacity">
                  INTEGUMENTARY SYSTEM
                </label>
                <div className="bd-layer-card">
                  <div className="bd-skin-presets">
                    {[0, 20, 40, 60, 80, 100].map((value, index) => (
                      <button
                        key={value}
                        className={Math.abs(skin - value) < 12 ? "chosen" : ""}
                        title={value ? `Skin opacity ${value}%` : "Hide skin"}
                        onClick={() => setSkin(value)}
                      >
                        {index === 0 ? (
                          "Off"
                        ) : (
                          <span style={{ opacity: value / 100 }}>◉</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <input
                    id="skin-opacity"
                    aria-label="Skin opacity"
                    type="range"
                    min="0"
                    max="100"
                    value={skin}
                    onChange={(e) => setSkin(Number(e.target.value))}
                  />
                  <div className="bd-range-caption">
                    <span>OPACITY</span>
                    <span>{skin}%</span>
                  </div>
                </div>
                <label className="bd-layer-label" htmlFor="respiratory-opacity">
                  RESPIRATORY SYSTEM
                </label>
                <div className="bd-layer-card bd-system-row">
                  <span aria-hidden="true">♧</span>
                  <input
                    id="respiratory-opacity"
                    aria-label="Respiratory system opacity"
                    type="range"
                    min="0"
                    max="100"
                    value={respiratory}
                    onChange={(e) => setRespiratory(Number(e.target.value))}
                  />
                </div>
                <p className="bd-layer-note">
                  This model contains the respiratory system and body surface.
                </p>
                <button
                  className="bd-secondary bd-hide-all"
                  onClick={() => {
                    setSkin(0);
                    setRespiratory(0);
                  }}
                >
                  Hide All Anatomy Layers
                </button>
                <button className="bd-text-button" onClick={reset}>
                  Restore Anatomy Layers
                </button>
              </div>
            )}
            {panel === "search" && (
              <div className="bd-anatomy-search">
                <label className="bd-search-field">
                  <Icon name="search" />
                  <input
                    autoFocus
                    placeholder="Search anatomy"
                    aria-label="Search anatomy"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setQuery("")}
                    >
                      <Icon name="close" />
                    </button>
                  )}
                </label>
                <div className="bd-search-label">
                  List <span>Select structures</span>
                </div>
                <div className="bd-results">
                  {anatomy
                    .filter((name) =>
                      name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((name) => (
                      <button
                        key={name}
                        className={selected === name ? "selected" : ""}
                        onClick={() => selectStructure(name)}
                      >
                        <Icon name={selected === name ? "select" : "eye"} />
                        <span>{name}</span>
                      </button>
                    ))}
                  {!anatomy.some((name) =>
                    name.toLowerCase().includes(query.toLowerCase()),
                  ) && <p className="bd-empty">No structures found.</p>}
                </div>
              </div>
            )}
          </aside>
        )}

        <section
          className="bd-stage"
          aria-label="Interactive female respiratory anatomy viewer"
        >
          <AnatomyScene
            ref={scene}
            skin={skin}
            respiratory={respiratory}
            tool={tool}
            drawing={drawing}
            onSelect={setSelected}
            onReady={() => setReady(true)}
            onError={() => setLoadError(true)}
          />
          {!ready && !loadError && (
            <div className="bd-loading" role="status">
              <span />
              Loading anatomy…
            </div>
          )}
          {loadError && (
            <div className="bd-model-error">
              The 3D model could not load.{" "}
              <button onClick={() => window.location.reload()}>
                Try again
              </button>
              <a href={source} target="_blank" rel="noreferrer">
                Open BioDigital viewer
              </a>
            </div>
          )}
          {/* <Image
            width={260}
            height={64}
            className="bd-watermark"
            src="/sites/biodigital/powered-by.svg"
            alt="BioDigital, a division of Anatomage"
          /> */}
          {/* <a
            className="bd-attribution"
            href="https://www.biodigital.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Image
              width={114}
              height={30}
              src="/sites/biodigital/powered-by-color.svg"
              alt="Powered by BioDigital, a division of Anatomage"
            />
          </a> */}

          {!drawing && (
            <>
              <div className="bd-mobile-title">
                <button
                  onClick={() => {
                    setPanel("info");
                    setMobileInfo((v) => !v);
                  }}
                >
                  Female Respiratory System
                </button>
                <ToolButton
                  icon="info"
                  label="About this model"
                  onClick={() => {
                    setPanel("info");
                    setMobileInfo((v) => !v);
                  }}
                />
              </div>
              <nav className="bd-tools" aria-label="Viewer tools">
                <div className="bd-tool-group bd-panel-toggle">
                  <ToolButton
                    icon={panel ? "collapse" : "expand"}
                    label={panel ? "Close Info Panel" : "Open Info Panel"}
                    onClick={() => setPanel((v) => (v ? null : "info"))}
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
                    onClick={() => togglePanel("layers")}
                  />
                  <ToolButton
                    icon="search"
                    label="Anatomy Search"
                    active={panel === "search"}
                    onClick={() => togglePanel("search")}
                  />
                  <ToolButton
                    icon="draw"
                    label="Draw"
                    onClick={() => {
                      setDrawing(true);
                      setMenu(null);
                    }}
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
                        onClick={() => scene.current?.zoom(0.82)}
                      />
                      <ToolButton
                        icon="minus"
                        label="Zoom out"
                        onClick={() => scene.current?.zoom(1.22)}
                      />
                    </>
                  )}
                  <ToolButton
                    icon="reset"
                    label="Return to Starting Position"
                    onClick={reset}
                  />
                </div>
                <div className="bd-tool-group">
                  <ToolButton
                    icon="fullscreen"
                    label={full ? "Exit Fullscreen" : "Enter Fullscreen"}
                    onClick={toggleFullscreen}
                  />
                </div>
              </div>

              
              {selected && (
                <div className="bd-selected">
                  <span>{selected}</span>
                  <button
                    aria-label="Clear selection"
                    onClick={() => {
                      setSelected(null);
                      scene.current?.clearSelection();
                    }}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* برای نقاشی */}
          {drawing && (
            <>
              <svg
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
                  onClick={() => setDrawing(false)}
                >
                  Exit Draw
                </button>
              </div>
            </>
          )}
        </section>
      </main>
      {/* {signupOpen && !drawing && (
        <div className="bd-signup-overlay">
          <div className="bd-dim" />
          <section
            className="bd-signup-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bd-signup-title"
          >
            <button
              className="bd-signup-close"
              aria-label="Close signup message"
              onClick={() => setSignupOpen(false)}
            >
              <Icon name="close" />
            </button>
            <h2 id="bd-signup-title">
              Create a free account to explore 1000+ anatomy, physiology, and
              <br className="bd-desktop-break" /> treatment models in
              interactive 3D.
            </h2>
            <div className="bd-signup-actions">
              <a
                className="bd-primary"
                href={signup}
                target="_blank"
                rel="noreferrer"
              >
                Sign Up For Free
              </a>
              <a
                className="bd-secondary"
                href="https://www.biodigital.com/"
                target="_blank"
                rel="noreferrer"
              >
                Learn More
              </a>
            </div>
            <a
              className="bd-signin"
              href="https://human.biodigital.com/signin"
              target="_blank"
              rel="noreferrer"
            >
              Already have an account? Sign in
            </a>
          </section>
        </div>
      )} */}
    </div>
  );
}
