import { useState } from "react";
import {
  BarChart3,
  CloudSun,
  Map,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  title: string;
  summary: string;
  detailTitle: string;
  detail: string;
  metricLabel: string;
  metric: string;
  href: string;
  icon: LucideIcon;
  tone: string;
};

const features: Feature[] = [
  {
    title: "Real-time insights",
    summary: "Forecast context along your route.",
    detailTitle: "Weather at the right hour",
    detail:
      "Checkpoint conditions are matched to the truck's estimated arrival instead of applying one forecast to the entire trip.",
    metricLabel: "Forecast matching",
    metric: "ETA synced",
    href: "#route-details",
    icon: CloudSun,
    tone: "sky",
  },
  {
    title: "Multiple options",
    summary: "Compare optimized route alternatives.",
    detailTitle: "Compare genuine alternatives",
    detail:
      "Review distance, duration, checkpoint risk, and weather across three distinct route candidates before choosing.",
    metricLabel: "Route comparison",
    metric: "3 options",
    href: "#route-planner",
    icon: Map,
    tone: "mint",
  },
  {
    title: "Load-aware safety",
    summary: "Risk responds to your truck's load.",
    detailTitle: "Risk that responds to load",
    detail:
      "Strict load rules raise wind classifications for heavier trucks without ever downgrading a more dangerous condition.",
    metricLabel: "Load-specific rules",
    metric: "2 overrides",
    href: "#safety",
    icon: ShieldCheck,
    tone: "green",
  },
  {
    title: "48-hour forecast",
    summary: "Plan ahead with an hourly timeline.",
    detailTitle: "See the corridor evolve",
    detail:
      "Scrub or play each forecast hour from departure through +48 hours and see the selected weather state update instantly.",
    metricLabel: "Forecast window",
    metric: "49 views",
    href: "#forecast",
    icon: BarChart3,
    tone: "teal",
  },
];

function WhyChoose() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = features[activeIndex];

  const moveSelection = (direction: -1 | 1) => {
    setActiveIndex((currentIndex) => (currentIndex + direction + features.length) % features.length);
  };

  return (
    <section className="why-section" id="features" aria-labelledby="why-title">
      <div className="why-section__background" aria-hidden="true" />

      <div className="why-shell">
        <div className="why-heading">
          <span className="why-kicker">Why choose RouteSafe?</span>
          <h2 id="why-title">
            Built for <span>safer,</span>
            <br /> smarter deliveries
          </h2>
          <p>Designed for professional drivers and logistics teams.</p>
        </div>

        <aside className="why-handwritten" aria-label="RouteSafe promise">
          <span>Drive today.</span>
          <strong>Deliver tomorrow.</strong>
          <svg viewBox="0 0 220 42" role="presentation">
            <path d="M9 22c55 13 119 11 200-7" />
          </svg>
        </aside>

        <div className="why-cards" role="tablist" aria-label="RouteSafe features">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isActive = activeIndex === index;

            return (
              <button
                className={`why-card ${isActive ? "is-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="why-feature-panel"
                tabIndex={isActive ? 0 : -1}
                key={feature.title}
                onClick={() => setActiveIndex(index)}
              >
                <span className={`why-card__icon why-card__icon--${feature.tone}`} aria-hidden="true">
                  <Icon size={31} strokeWidth={1.8} />
                </span>
                <span className="why-card__copy">
                  <strong>{feature.title}</strong>
                  <small>{feature.summary}</small>
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="why-spotlight"
          id="why-feature-panel"
          role="tabpanel"
          aria-live="polite"
        >
          <div className="why-spotlight__copy">
            <span>Feature {String(activeIndex + 1).padStart(2, "0")}</span>
            <strong>{activeFeature.detailTitle}</strong>
            <p>{activeFeature.detail}</p>
          </div>

          <div className="why-spotlight__metric">
            <span>{activeFeature.metricLabel}</span>
            <strong>{activeFeature.metric}</strong>
          </div>

          <a className="why-spotlight__link" href={activeFeature.href}>
            Explore feature
          </a>

          <div className="why-spotlight__controls" aria-label="Choose another feature">
            <button type="button" aria-label="Previous feature" onClick={() => moveSelection(-1)}>
              Previous
            </button>
            <span>
              {activeIndex + 1} / {features.length}
            </span>
            <button type="button" aria-label="Next feature" onClick={() => moveSelection(1)}>
              Next
            </button>
          </div>
        </div>

        <p className="why-demo-note">Interactive product capability preview.</p>
      </div>
    </section>
  );
}

export default WhyChoose;
