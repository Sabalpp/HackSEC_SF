import { Link } from "react-router-dom";
import landforgeIcon from "../assets/landforge-icon.png";

const techStack = [
  {
    name: "React 19 + Vite 8",
    role: "Application shell, route-driven UI, fast local iteration, and static production builds.",
    longTerm: "Keeps the operator interface deployable as a browser app, kiosk app, or embedded dashboard without rewriting the product.",
  },
  {
    name: "React Router 7",
    role: "Mission routes, system pages, and direct links into specific theaters or custom coordinates.",
    longTerm: "Supports bookmarked mission states, team review links, and future authenticated workspaces.",
  },
  {
    name: "Three.js + react-globe.gl",
    role: "Full-bleed globe, theater selection, terrain scenes, and vehicle visualization.",
    longTerm: "Becomes the visual layer for GIS overlays, route previews, sensor coverage, and replay of field data.",
  },
  {
    name: "Rust physics engine compiled to WASM",
    role: "Runs deterministic environmental degradation logic in the browser through the generated engine package.",
    longTerm: "Gives LandForge a portable simulation core that can run offline, on edge hardware, or behind an API with the same model behavior.",
  },
  {
    name: "TypeScript simulation contracts",
    role: "Defines mission input, vehicle output, metrics, assessments, and typed integration points.",
    longTerm: "Provides a stable contract for backend storage, telemetry import, automated tests, and external integrations.",
  },
  {
    name: "Structured JavaScript data modules",
    role: "Stores theaters, vehicle baselines, material profiles, replacement paths, and reporting text.",
    longTerm: "Can migrate into a managed data service while keeping the current app logic intact.",
  },
  {
    name: "Client-side PDF reporting",
    role: "Turns simulation history into a downloadable technical report with health trends and component analysis.",
    longTerm: "Forms the first version of audit trails, maintenance packets, procurement justifications, and program reviews.",
  },
  {
    name: "Tailwind CSS 4 entry point + custom CSS",
    role: "Provides the styling pipeline while keeping the high-fidelity operational UI in project-owned CSS.",
    longTerm: "Can grow into a small design system for mission panels, report modules, and admin workflows.",
  },
];

const productFlow = [
  "Pick a theater on the globe or define a custom coordinate.",
  "Load a terrain-backed vehicle scene for the operating environment.",
  "Select the platform, material profile, duration, and environmental conditions.",
  "Run the Rust/WASM degradation model against the selected conditions.",
  "Review subsystem health, active damage terms, replacement paths, and cost exposure.",
  "Export a technical report for maintenance, procurement, or mission planning review.",
];

const currentCapabilities = [
  {
    title: "Mission Planning",
    body: "Operators can compare how UGV and UAS baselines hold up across arctic, desert, humid, and custom environments before committing hardware.",
  },
  {
    title: "Material Trade Studies",
    body: "The app links steel, aluminum, composite, and titanium profiles to weather-driven degradation and replacement cost implications.",
  },
  {
    title: "Terrain Context",
    body: "Three.js terrain scenes make the theater concrete, so environmental assumptions are tied to a visible operating area instead of a spreadsheet row.",
  },
  {
    title: "Technical Reporting",
    body: "Simulation output becomes a PDF report that explains health loss, active equations, component weak points, and upgrade options.",
  },
];

const longTermPlan = [
  {
    horizon: "0-6 Months",
    title: "Turn the prototype into a repeatable planning tool",
    body: "Add saved scenarios, versioned model parameters, cleaner report templates, and regression tests around the physics engine.",
  },
  {
    horizon: "6-18 Months",
    title: "Connect real operational data",
    body: "Import weather, maintenance records, vehicle telemetry, GIS layers, and user-defined mission routes to replace manual assumptions.",
  },
  {
    horizon: "18-36 Months",
    title: "Support fleet readiness decisions",
    body: "Track scenario history by unit and platform, forecast component replacement windows, and compare procurement alternatives before fielding.",
  },
  {
    horizon: "Long Term",
    title: "Operate as a digital test range",
    body: "Use the same simulation core in the browser, on edge devices, and in cloud services so teams can rehearse, audit, and update readiness models continuously.",
  },
];

const futureInfrastructure = [
  "Backend API for accounts, saved missions, report archives, and organization-level access control.",
  "Database for scenarios, theater libraries, vehicle configurations, material coefficients, and simulation runs.",
  "Model governance layer for parameter versioning, validation notes, and review status.",
  "Telemetry and maintenance import pipeline for closing the loop between simulated risk and field performance.",
  "CI checks for React builds, Rust engine tests, WASM packaging, and report generation snapshots.",
  "Offline packaging for disconnected demonstrations and field environments with unreliable networks.",
];

function StackItem({ item }) {
  return (
    <article className="system-brief__stack-item">
      <h3>{item.name}</h3>
      <p>{item.role}</p>
      <span>{item.longTerm}</span>
    </article>
  );
}

function CapabilityItem({ item }) {
  return (
    <article className="system-brief__capability">
      <h3>{item.title}</h3>
      <p>{item.body}</p>
    </article>
  );
}

function RoadmapItem({ item }) {
  return (
    <article className="system-brief__roadmap-item">
      <span>{item.horizon}</span>
      <h3>{item.title}</h3>
      <p>{item.body}</p>
    </article>
  );
}

export function SystemBrief() {
  return (
    <main className="system-brief">
      <div className="system-brief__stars" />
      <header className="system-brief__nav">
        <Link to="/" className="system-brief__brand" aria-label="Back to LandForge globe">
          <img src={landforgeIcon} alt="" />
          <span>
            <strong>LANDFORGE</strong>
            <em>System Brief</em>
          </span>
        </Link>
        <div className="system-brief__nav-actions">
          <Link to="/mission/arctic" className="system-brief__button system-brief__button--secondary">
            Open Mission
          </Link>
          <Link to="/" className="system-brief__button">
            Globe
          </Link>
        </div>
      </header>

      <section className="system-brief__hero">
        <div className="system-brief__hero-copy">
          <p className="system-brief__eyebrow">Technical Stack And Long-Term Use</p>
          <h1>LandForge is a browser-based mission readiness simulator for land autonomy systems.</h1>
          <p>
            The current product combines terrain visualization, vehicle baselines, material profiles,
            a Rust/WASM degradation model, and PDF reporting. Long term, the same foundation can become
            a fleet planning, maintenance forecasting, and procurement decision platform.
          </p>
        </div>
        <div className="system-brief__hero-panel" aria-label="Current build summary">
          <div>
            <span>Frontend</span>
            <strong>React, Vite, Three.js</strong>
          </div>
          <div>
            <span>Simulation</span>
            <strong>Rust physics engine in WASM</strong>
          </div>
          <div>
            <span>Outputs</span>
            <strong>Health trends, component analysis, PDF reports</strong>
          </div>
          <div>
            <span>Next Layer</span>
            <strong>Saved missions, telemetry, model governance</strong>
          </div>
        </div>
      </section>

      <section className="system-brief__section">
        <div className="system-brief__section-head">
          <span>What Exists Now</span>
          <h2>Current product capabilities</h2>
        </div>
        <div className="system-brief__capability-grid">
          {currentCapabilities.map((item) => (
            <CapabilityItem key={item.title} item={item} />
          ))}
        </div>
      </section>

      <section className="system-brief__section">
        <div className="system-brief__section-head">
          <span>How It Works</span>
          <h2>Simulation and reporting flow</h2>
        </div>
        <ol className="system-brief__flow">
          {productFlow.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="system-brief__section">
        <div className="system-brief__section-head">
          <span>Tech Stack</span>
          <h2>What each layer does</h2>
        </div>
        <div className="system-brief__stack-grid">
          {techStack.map((item) => (
            <StackItem key={item.name} item={item} />
          ))}
        </div>
      </section>

      <section className="system-brief__section system-brief__section--split">
        <div>
          <div className="system-brief__section-head">
            <span>Long-Term Use</span>
            <h2>How LandForge grows after the demo</h2>
          </div>
          <div className="system-brief__roadmap">
            {longTermPlan.map((item) => (
              <RoadmapItem key={item.horizon} item={item} />
            ))}
          </div>
        </div>
        <aside className="system-brief__future">
          <span>Infrastructure To Add</span>
          <h2>What is not in the prototype yet</h2>
          <ul>
            {futureInfrastructure.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
