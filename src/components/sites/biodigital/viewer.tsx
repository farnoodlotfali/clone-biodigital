"use client";

import { useEffect, useRef, useState } from "react";
import { AnatomyScene, type SceneHandle } from "./anatomy-scene";
import { DrawingTools } from "./drawing-tools";
import {
  ViewerControls,
  type SelectionTool,
  type ViewerMenu,
} from "./viewer-controls";
import { ViewerPanel, type Panel } from "./viewer-panel";
import "./viewer.css";
import Image from "next/image";

export function BioDigitalViewer() {
  const [panel, setPanel] = useState<Panel>("info");

  const [menu, setMenu] = useState<ViewerMenu>(null);

  const [tool, setTool] = useState<SelectionTool>("Select");

  const [selected, setSelected] = useState<string | null>(null);
  const [skin, setSkin] = useState(82);

  const [respiratory, setRespiratory] = useState(100);

  const [drawing, setDrawing] = useState(false);

  const [full, setFull] = useState(false);

  const scene = useRef<SceneHandle>(null);
  const shell = useRef<HTMLDivElement>(null);
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

  function togglePanel(next: NonNullable<Panel>) {
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

  return (
    <div
      ref={shell}
      className={`bd-app ${drawing ? "is-drawing" : ""} ${full ? "is-fullscreen" : ""}`}
    >
      <main className={`bd-workspace ${panel && !drawing ? "has-panel" : ""}`}>
        <ViewerPanel
          panel={panel}
          drawing={drawing}
          mobileInfo={mobileInfo}
          selected={selected}
          skin={skin}
          respiratory={respiratory}
          onClose={() => {
            setPanel(null);
            setMobileInfo(false);
          }}
          onSkinChange={setSkin}
          onRespiratoryChange={setRespiratory}
          onHideAll={() => {
            setSkin(0);
            setRespiratory(0);
          }}
          onReset={reset}
          onSelectStructure={selectStructure}
        />

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

          <LoadingState loadError={loadError} ready={ready} />
          <ErrorState loadError={loadError} />
          <WaterMarks show={false} />

          <ViewerControls
            drawing={drawing}
            panel={panel}
            menu={menu}
            tool={tool}
            selected={selected}
            full={full}
            setMenu={setMenu}
            setTool={setTool}
            onToggleMobileInfo={() => {
              setPanel("info");
              setMobileInfo((v) => !v);
            }}
            onTogglePanel={() => setPanel((v) => (v ? null : "info"))}
            onOpenPanel={togglePanel}
            onStartDrawing={() => {
              setDrawing(true);
              setMenu(null);
            }}
            onZoom={(factor) => scene.current?.zoom(factor)}
            onReset={reset}
            onToggleFullscreen={toggleFullscreen}
            onClearSelection={() => {
              setSelected(null);
              scene.current?.clearSelection();
            }}
          />

          <DrawingTools active={drawing} onExit={() => setDrawing(false)} />
        </section>
      </main>
    </div>
  );
}

const LoadingState = ({
  loadError,
  ready,
}: {
  ready: boolean;
  loadError: boolean;
}) => {
  return (
    !ready &&
    !loadError && (
      <div className="bd-loading" role="status">
        <span />
        Loading anatomy…
      </div>
    )
  );
};

const ErrorState = ({ loadError }: { loadError: boolean }) => {
  return (
    loadError && (
      <div className="bd-model-error">
        The 3D model could not load.{" "}
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>
    )
  );
};

const WaterMarks = ({ show }: { show: boolean }) => {
  return (
    show && (
      <>
        <Image
          width={260}
          height={64}
          className="bd-watermark"
          src="/sites/biodigital/powered-by.svg"
          alt="BioDigital, a division of Anatomage"
        />
        <a
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
        </a>
      </>
    )
  );
};
