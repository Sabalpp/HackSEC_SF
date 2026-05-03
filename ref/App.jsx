import { useCallback, useEffect, useMemo, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { LandingGlobe } from "./components/LandingGlobe";
import { TheaterWorkbench } from "./components/TheaterWorkbench";
import { preloadDefaultTankScene } from "./components/ThompsonPassVehicleScene";
import { Stars } from "./components/Stars";
import { theaterList } from "./data/theaters";
import landforgeIcon from "./assets/landforge-icon.png";

const CUSTOM_ACCENT = "#66d8ff";
const TRANSITION_ZOOM_MS = 900;
const POST_ZOOM_HOLD_MS = 0;
const TRANSITION_NAV_MS = TRANSITION_ZOOM_MS + POST_ZOOM_HOLD_MS;
const formatCoord = (n) => `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(2)}°`;

function LandingPage({ routeTransition, onBeginRouteTransition }) {
  const [presetId, setPresetId] = useState("arctic");
  const [custom, setCustom] = useState(null); // { lat, lng } | null
  const [activeKind, setActiveKind] = useState("preset"); // "preset" | "custom"
  const [showSimulate, setShowSimulate] = useState(false);

  useEffect(() => {
    preloadDefaultTankScene();
  }, []);

  const markers = useMemo(() => {
    const list = theaterList.map((t) => ({
      id: t.id,
      kind: "preset",
      lat: t.lat,
      lng: t.lng,
      label: t.shortLabel,
      accent: t.accent,
      selected: activeKind === "preset" && t.id === presetId,
    }));
    if (custom) {
      list.push({
        id: "custom",
        kind: "custom",
        lat: custom.lat,
        lng: custom.lng,
        label: `${formatCoord(custom.lat)}, ${formatCoord(custom.lng)}`,
        accent: CUSTOM_ACCENT,
        selected: activeKind === "custom",
      });
    }
    return list;
  }, [presetId, custom, activeKind]);

  const focusLatLng = useMemo(() => {
    if (activeKind === "custom" && custom) return { lat: custom.lat, lng: custom.lng };
    const t = theaterList.find((tt) => tt.id === presetId);
    return t ? { lat: t.lat, lng: t.lng } : null;
  }, [activeKind, custom, presetId]);

  const selectedAccent =
    activeKind === "custom"
      ? CUSTOM_ACCENT
      : theaterList.find((t) => t.id === presetId)?.accent ?? CUSTOM_ACCENT;

  function selectedMission() {
    if (activeKind === "custom" && custom) {
      return {
        id: "custom",
        path: `/mission/custom?lat=${custom.lat}&lng=${custom.lng}`,
        target: { lat: custom.lat, lng: custom.lng },
      };
    }
    const theater = theaterList.find((t) => t.id === presetId);
    return {
      id: presetId,
      path: `/mission/${presetId}`,
      target: theater ? { lat: theater.lat, lng: theater.lng } : focusLatLng,
    };
  }

  function handleSelectMarker(id) {
    if (id === "custom") {
      setActiveKind("custom");
    } else {
      setPresetId(id);
      setActiveKind("preset");
    }
    setShowSimulate(true);
  }

  function handleGlobeClick(lat, lng) {
    setCustom({ lat, lng });
    setActiveKind("custom");
    setShowSimulate(true);
  }

  function handleChipClick(id) {
    if (id === "custom") {
      setActiveKind("custom");
      setShowSimulate(true);
      return;
    }
    setPresetId(id);
    setActiveKind("preset");
    setShowSimulate(true);
  }

  function handleSimulateClick() {
    if (routeTransition) return;
    const mission = selectedMission();
    if (!mission.target) return;
    onBeginRouteTransition({
      path: mission.path,
      target: mission.target,
    });
  }

  return (
    <div className={`lf-landing-full${routeTransition ? " is-transitioning" : ""}`}>
      <Stars />
      <LandingGlobe
        markers={markers}
        focusLatLng={focusLatLng}
        transitionTarget={routeTransition?.target}
        transitionDuration={TRANSITION_ZOOM_MS}
        onSelectMarker={handleSelectMarker}
        onGlobeClick={handleGlobeClick}
      />

      <div className="lf-overlay">
        <header className="lf-overlay__top">
          <img src={landforgeIcon} alt="LandForge" className="lf-overlay__mark" />
          <div className="lf-overlay__brand">
            <div className="lf-overlay__eyebrow">Land Autonomy Systems</div>
            <div className="lf-overlay__title">LANDFORGE</div>
          </div>
        </header>

        <div className="lf-picker">
          {theaterList.map((t) => {
            const isActive = activeKind === "preset" && t.id === presetId;
            return (
              <button
                key={t.id}
                className="lf-picker__chip"
                data-active={isActive}
                style={{ "--lf-row-accent": t.accent }}
                onClick={() => handleChipClick(t.id)}
              >
                <span className="lf-picker__dot" />
                <span className="lf-picker__label">{t.label}</span>
              </button>
            );
          })}
          {custom && (
            <button
              className="lf-picker__chip"
              data-active={activeKind === "custom"}
              style={{ "--lf-row-accent": CUSTOM_ACCENT }}
              onClick={() => handleChipClick("custom")}
            >
              <span className="lf-picker__dot" />
              <span className="lf-picker__label">
                Custom · {formatCoord(custom.lat)}, {formatCoord(custom.lng)}
              </span>
            </button>
          )}
        </div>

        {showSimulate && (
          <button
            type="button"
            className="lf-simulate-button"
            style={{ "--lf-simulate-accent": selectedAccent }}
            disabled={Boolean(routeTransition)}
            onClick={handleSimulateClick}
          >
            Simulate
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [routeTransition, setRouteTransition] = useState(null);
  const isLandingRoute = location.pathname === "/";

  const beginRouteTransition = useCallback((next) => {
    preloadDefaultTankScene();
    setRouteTransition((current) => {
      if (current) return current;
      return {
        id: Date.now(),
        path: next.path,
        target: next.target,
      };
    });
  }, []);

  useEffect(() => {
    if (!routeTransition) return undefined;

    const navigateTimer = window.setTimeout(() => {
      navigate(routeTransition.path);
      setRouteTransition(null);
    }, TRANSITION_NAV_MS);

    return () => {
      window.clearTimeout(navigateTimer);
    };
  }, [navigate, routeTransition?.id, routeTransition?.path]);

  return (
    <div className="app-shell">
      <div
        className="app-route-layer"
        data-active={isLandingRoute}
        aria-hidden={!isLandingRoute}
      >
        <LandingPage
          routeTransition={routeTransition}
          onBeginRouteTransition={beginRouteTransition}
        />
      </div>
      <div
        className="app-route-layer app-route-layer--mission"
        data-active={!isLandingRoute}
        aria-hidden={isLandingRoute}
      >
        {!isLandingRoute && (
          <Routes>
            <Route path="/mission/:theaterId" element={<TheaterWorkbench />} />
          </Routes>
        )}
      </div>
    </div>
  );
}
