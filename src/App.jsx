import { Route, Routes, useNavigate } from "react-router-dom";
import { LandingGlobe } from "./components/LandingGlobe";
import { TheaterWorkbench } from "./components/TheaterWorkbench";
import { theaterList } from "./data/theaters";

function LandingPage() {
  const navigate = useNavigate();
  return (
    <section className="landing">
      <LandingGlobe />
      <div className="landing__overlay">
        <div>
          <div className="landing__title">LANDFORGE</div>
          <div className="landing__sub">
            The pre-field proving ground for autonomous ground systems. Pick a
            theater to test mobility, sensor confidence, comms, and battery
            margin under realistic land conditions.
          </div>
        </div>
        <div className="landing__pitch">
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
            Pick a theater
          </div>
          <div className="landing__theaters">
            {theaterList.map((t) => (
              <button
                key={t.id}
                className="theater-chip"
                style={{ borderColor: t.accent }}
                onClick={() => navigate(`/mission/${t.id}`)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
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
