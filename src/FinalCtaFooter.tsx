import { useRef, useState } from "react";
import {
  Check,
  Clock3,
  CloudSun,
  Github,
  Link2,
  MapPinned,
  Play,
  Route,
  ShieldCheck,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";

type Outcome = {
  title: string;
  detail: string;
  icon: LucideIcon;
};

type DemoStep = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const outcomes: Outcome[] = [
  {
    title: "Safer roads",
    detail: "Recommendations minimize Severe miles before considering any lower-priority factor.",
    icon: Route,
  },
  {
    title: "Lower risk",
    detail: "Weather classifications incorporate strict wind thresholds and load-specific overrides.",
    icon: ShieldCheck,
  },
  {
    title: "Smarter timing",
    detail: "Travel time breaks safety ties while checkpoint ETAs align risk with expected arrival.",
    icon: Clock3,
  },
  {
    title: "Built for drivers",
    detail: "Route summaries, map layers, and checkpoint details keep the decision easy to inspect.",
    icon: Truck,
  },
];

const demoSteps: DemoStep[] = [
  {
    title: "Describe the trip",
    description: "Add the origin, destination, departure time, load weight, and checkpoint interval.",
    icon: MapPinned,
  },
  {
    title: "Compare three routes",
    description: "Review travel time alongside Severe miles, High miles, and average route risk.",
    icon: Route,
  },
  {
    title: "Inspect weather timing",
    description: "Open checkpoint details and move through the 0–48 hour corridor forecast.",
    icon: CloudSun,
  },
];

function FinalCtaFooter() {
  const [activeOutcome, setActiveOutcome] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const demoDialog = useRef<HTMLDialogElement>(null);
  const active = outcomes[activeOutcome];
  const activeDemoStep = demoSteps[demoStep];
  const DemoIcon = activeDemoStep.icon;
  const currentYear = new Date().getFullYear();

  const openDemo = () => {
    setDemoStep(0);
    demoDialog.current?.showModal();
  };

  const closeDemo = () => {
    demoDialog.current?.close();
  };

  return (
    <>
      <section className="final-cta" aria-labelledby="final-cta-title">
        <div className="final-cta__background" aria-hidden="true" />
        <div className="final-cta__content">
          <div className="final-cta__copy">
            <span className="final-cta__kicker">Plan with the full picture</span>
            <h2 id="final-cta-title">Make the next route a smarter one.</h2>
            <p>Compare safer alternatives, understand the tradeoffs, and stay ahead of changing weather.</p>
            <div className="final-cta__actions">
              <a className="button button--primary" href="/#route-planner">
                Plan your route
              </a>
              <button className="final-cta__demo" type="button" onClick={openDemo}>
                <span aria-hidden="true">
                  <Play size={14} fill="currentColor" />
                </span>
                Watch demo
              </button>
            </div>
          </div>

          <div className="outcome-panel">
            <div className="outcome-options" role="tablist" aria-label="RouteSafe outcomes">
              {outcomes.map((outcome, index) => {
                const Icon = outcome.icon;
                const isActive = activeOutcome === index;

                return (
                  <button
                    className={isActive ? "is-active" : ""}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="outcome-detail"
                    tabIndex={isActive ? 0 : -1}
                    key={outcome.title}
                    onClick={() => setActiveOutcome(index)}
                  >
                    <Icon size={21} />
                    <span>{outcome.title}</span>
                  </button>
                );
              })}
            </div>
            <p className="outcome-detail" id="outcome-detail" role="tabpanel" aria-live="polite">
              <Check size={16} /> {active.detail}
            </p>
          </div>
        </div>
      </section>

<footer className="site-footer">
        <div className="site-footer__grid">
          <a className="footer-brand" href="/" aria-label="RouteSafe home">
            <img
              className="footer-brand__logo"
              src="/logo.png"
              alt="RouteSafe — safer routes, stronger deliveries"
              loading="lazy"
              decoding="async"
            />
          </a>

          <nav className="footer-links" aria-label="Product links">
            <strong>Product</strong>
            <a href="/">Overview</a>
            <a href="/#route-planner">Route planner</a>
            <a href="/features">Features</a>
          </nav>

          <nav className="footer-links" aria-label="Journey links">
            <strong>Journey</strong>
            <a href="/how-it-works">How it works</a>
            <a href="/features#forecast">48-hour forecast</a>
            <a href="/features#route-details">Route details</a>
          </nav>

          <nav className="footer-links" aria-label="Safety and help links">
            <strong>Safety & help</strong>
            <a href="/safety#safety">Risk rules</a>
            <a href="/faq#faq">Driver perspectives</a>
            <a href="/faq#faq-list">FAQs</a>
          </nav>

          <div className="footer-social">
            <a
              className="footer-github"
              href="https://github.com/ankit052003"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub - Ankit kumar"
            >
              <Github size={20} />
            </a>
            <span className="footer-credit">Developed by Ankit kumar</span>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>Forecast-aware route planning assessment</span>
          <span>© {currentYear} RouteSafe. All rights reserved.</span>
        </div>
      </footer>

      <dialog className="demo-dialog" ref={demoDialog} onClose={() => setDemoStep(0)}>
        <button className="demo-dialog__close" type="button" aria-label="Close demo" onClick={closeDemo}>
          <X size={20} />
        </button>

        <div className="demo-dialog__progress" aria-label={`Demo step ${demoStep + 1} of ${demoSteps.length}`}>
          {demoSteps.map((step, index) => (
            <span className={index <= demoStep ? "is-complete" : ""} key={step.title} />
          ))}
        </div>

        <div className="demo-dialog__icon" aria-hidden="true">
          <DemoIcon size={34} strokeWidth={1.7} />
        </div>
        <span className="demo-dialog__step">Step {demoStep + 1} of {demoSteps.length}</span>
        <h2>{activeDemoStep.title}</h2>
        <p>{activeDemoStep.description}</p>

        <div className="demo-dialog__actions">
          <button
            className="demo-dialog__back"
            type="button"
            disabled={demoStep === 0}
            onClick={() => setDemoStep((currentStep) => currentStep - 1)}
          >
            Back
          </button>
          {demoStep < demoSteps.length - 1 ? (
            <button
              className="demo-dialog__next"
              type="button"
              onClick={() => setDemoStep((currentStep) => currentStep + 1)}
            >
              Next
            </button>
          ) : (
            <a className="demo-dialog__next" href="/#route-planner" onClick={closeDemo}>
              Start planning
            </a>
          )}
        </div>
      </dialog>
    </>
  );
}

export default FinalCtaFooter;
