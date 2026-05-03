import { useMemo, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { LandingGlobe } from "./components/LandingGlobe";
import { TheaterWorkbench } from "./components/TheaterWorkbench";
import { Stars } from "./components/Stars";
import { theaterList } from "./data/theaters";
import landforgeIcon from "./assets/landforge-icon.png";

const CUSTOM_ACCENT = "#66d8ff";
const formatCoord = (n) => `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(2)}°`;

function LandingPage() {
  const navigate = useNavigate();
  const [presetId, setPresetId] = useState("arctic");
  const [custom, setCustom] = useState(null); // { lat, lng } | null
  const [activeKind, setActiveKind] = useState("preset"); // "preset" | "custom"

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

  function handleSelectMarker(id) {
    if (id === "custom") {
      setActiveKind("custom");
    } else {
      setPresetId(id);
      setActiveKind("preset");
    }
  }

  function handleGlobeClick(lat, lng) {
    setCustom({ lat, lng });
    setActiveKind("custom");
  }

  function handleChipClick(id) {
    if (id === "custom") {
      if (activeKind === "custom" && custom) {
        navigate(`/mission/custom?lat=${custom.lat}&lng=${custom.lng}`);
      } else {
        setActiveKind("custom");
      }
      return;
    }
    if (activeKind === "preset" && presetId === id) {
      navigate(`/mission/${id}`);
    } else {
      setPresetId(id);
      setActiveKind("preset");
    }
  }

  return (
    <div className="lf-landing-full">
      <Stars />
      <LandingGlobe
        markers={markers}
        focusLatLng={focusLatLng}
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

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/mission/:theaterId" element={<TheaterWorkbench />} />
    </Routes>
  );
}
