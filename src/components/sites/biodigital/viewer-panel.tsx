import { useState } from "react";
import { Icon } from "../../ui/icon";
import anatomyCatalog from "./anatomy-catalog.json";

export type Panel = "info" | "layers" | "search" | null;

type ViewerPanelProps = {
  panel: Panel;
  drawing: boolean;
  mobileInfo: boolean;
  selected: string | null;
  skin: number;
  respiratory: number;
  onClose: () => void;
  onSkinChange: (value: number) => void;
  onRespiratoryChange: (value: number) => void;
  onHideAll: () => void;
  onReset: () => void;
  onSelectStructure: (name: string) => void;
  hiddenNames: string[];
  onToggleStructure: (name: string) => void;
  onFocusStructure: (name: string) => void;
  onIsolateStructure: (name: string) => void;
};

export function ViewerPanel({
  panel,
  drawing,
  mobileInfo,
  selected,
  skin,
  respiratory,
  onClose,
  onSkinChange,
  onRespiratoryChange,
  onHideAll,
  onReset,
  onSelectStructure,
  hiddenNames,
  onToggleStructure,
  onFocusStructure,
  onIsolateStructure,
}: ViewerPanelProps) {
  const [query, setQuery] = useState("");

  if (drawing || !panel) return null;

  return (
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
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {panel === "info" && (
        <div className="bd-description">
          <p>
            The respiratory system is made of all of the structures that bring
            oxygen into the body and expel carbon dioxide. It contains two
            zones: the conducting zone and the respiratory zone.
          </p>
          <p>
            The conducting zone extends from the nose to the terminal
            bronchioles within the lungs. These structures help filter, warm,
            and moisten air while leading it towards the respiratory zone. The
            respiratory zone, which contains the respiratory bronchioles and
            alveoli, are the sites of oxygen-carbon dioxide gas exchange.
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
                  onClick={() => onSkinChange(value)}
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
              onChange={(e) => onSkinChange(Number(e.target.value))}
            />
            <div className="bd-range-caption">
              <span>OPACITY</span>
              <span>{skin}%</span>
            </div>
          </div>
          <label className="bd-layer-label" htmlFor="respiratory-layers">
            RESPIRATORY SYSTEM
          </label>
          <div className="bd-layer-card bd-system-row">
            <button
              className="bd-respiratory-toggle"
              aria-label={
                respiratory
                  ? "Hide Respiratory System Layer"
                  : "Show Respiratory System Layer"
              }
              onClick={() => onRespiratoryChange(respiratory ? 0 : 4)}
            >
              <Icon name="lungs" />
            </button>
            <input
              id="respiratory-layers"
              aria-label="Respiratory System layer slider"
              type="range"
              min="0"
              max="4"
              step="1"
              list="respiratory-layer-stops"
              value={respiratory}
              onChange={(e) => onRespiratoryChange(Number(e.target.value))}
            />
            <datalist id="respiratory-layer-stops">
              {[0, 1, 2, 3, 4].map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </div>
          <p className="bd-layer-note">
            This model contains the respiratory system and body surface.
          </p>
          <button className="bd-secondary bd-hide-all" onClick={onHideAll}>
            Hide All Anatomy Layers
          </button>
          <button className="bd-text-button" onClick={onReset}>
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
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <Icon name="close" />
              </button>
            )}
          </label>
          <div className="bd-search-label">
            List <span>{anatomyCatalog.length} structures</span>
          </div>
          <div className="bd-results">
            {anatomyCatalog
              .filter(({ name, latin }) =>
                `${name} ${latin}`.toLowerCase().includes(query.toLowerCase()),
              )
              .map(({ id, name, latin }) => (
                <div
                  key={id}
                  className="bd-structure-row"
                  data-structure-id={id}
                >
                  <button
                    className={`bd-structure-select ${selected === name ? "selected" : ""}`}
                    aria-label={`Select ${name}`}
                    onClick={() => onSelectStructure(name)}
                  >
                    <span>
                      {name}
                      {latin && <small>{latin}</small>}
                    </span>
                  </button>
                  <button
                    className="bd-structure-action"
                    aria-label={`${hiddenNames.includes(name) ? "Show" : "Hide"} ${name}`}
                    onClick={() => onToggleStructure(name)}
                  >
                    <Icon name={hiddenNames.includes(name) ? "hide" : "eye"} />
                  </button>
                  <details className="bd-structure-actions">
                    <summary aria-label={`${name} menu`}>
                      <Icon name="more" />
                    </summary>
                    <div>
                      <button
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          onFocusStructure(name);
                        }}
                      >
                        Focus
                      </button>
                      <button
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          onIsolateStructure(name);
                        }}
                      >
                        Isolate
                      </button>
                    </div>
                  </details>
                </div>
              ))}
            {!anatomyCatalog.some(({ name, latin }) =>
              `${name} ${latin}`.toLowerCase().includes(query.toLowerCase()),
            ) && <p className="bd-empty">No structures found.</p>}
          </div>
        </div>
      )}
    </aside>
  );
}
