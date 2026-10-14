import { useEffect, useState } from "react";
import {
  Boxes,
  Clock3,
  Menu,
  Play,
  ShieldCheck,
  X,
} from "lucide-react";

import RoutePlanner from "./RoutePlanner";
import HowItWorks from "./HowItWorks";
import RecommendationDemo from "./RecommendationDemo";
import RiskClassifier from "./RiskClassifier";
import WeatherForecast from "./WeatherForecast";
import WhyChoose from "./WhyChoose";
import CommunityFaq from "./CommunityFaq";
import { FaqPage, FeaturesPage, HowItWorksPage, SafetyPage } from "./ContentPages";
import FinalCtaFooter from "./FinalCtaFooter";

const navigationItems = [
  { label: "Overview", href: "/" },
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Safety", href: "/safety" },
  { label: "FAQ", href: "/faq" },
];

const pageTitles: Record<string, string> = {
  "/": "RouteSafe — Safer routes, stronger deliveries",
  "/features": "Features | RouteSafe",
  "/how-it-works": "How it works | RouteSafe",
  "/safety": "Safety | RouteSafe",
  "/faq": "FAQ | RouteSafe",
};

const benefits = [
  {
    icon: ShieldCheck,
    title: "Safer routes",
    description: "Reduce weather risk",
  },
  {
    icon: Clock3,
    title: "Smarter planning",
    description: "Save time and fuel",
  },
  {
    icon: Boxes,
    title: "Built for truckers",
    description: "Load-aware decisions",
  },
];

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";

  useEffect(() => {
    document.title = pageTitles[pathname] ?? pageTitles["/"];
  }, [pathname]);

  return (
    <main className="page-shell" id="top">
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href="/" aria-label="RouteSafe home">
            <img
              className="brand__logo"
              src="/logo.png"
              alt="RouteSafe — safer routes, stronger deliveries"
            />
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {navigationItems.map((item) => (
              <a
                className={pathname === item.href ? "is-active" : ""}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                key={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <a className="button button--header" href="/#route-planner">
              Start planning
            </a>
          </div>

          <button
            className={`menu-button${isMenuOpen ? " is-open" : ""}`}
            type="button"
            aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>

          {isMenuOpen && (
            <nav className="mobile-nav" aria-label="Mobile navigation">
              {navigationItems.map((item) => (
                <a
                  className={pathname === item.href ? "is-active" : undefined}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  key={item.href}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <a className="button button--primary" href="/#route-planner" onClick={() => setIsMenuOpen(false)}>
                Start planning
              </a>
            </nav>
          )}
        </div>
      </header>

      {isMenuOpen && (
        <button
          className="mobile-nav-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {pathname === "/features" ? (
        <FeaturesPage />
      ) : pathname === "/how-it-works" ? (
        <HowItWorksPage />
      ) : pathname === "/safety" ? (
        <SafetyPage />
      ) : pathname === "/faq" ? (
        <FaqPage />
      ) : (
        <>
      <section className="hero" id="overview" aria-labelledby="hero-title">
        <div className="hero__background" aria-hidden="true" />
        <div className="hero__veil" aria-hidden="true" />

        <div className="hero__content">
          <div className="eyebrow">
            <span aria-hidden="true" />
            AI-assisted truck routing
          </div>

          <h1 id="hero-title">
            Every mile.
            <br />
            A <span>safer decision.</span>
          </h1>

          <p className="hero__description">
            Plan truck routes with forecast-aware insights, load-aware risk analysis, and optimized travel time. Drive safer, avoid hazards, and deliver with confidence.
          </p>

          <div className="hero__actions">
            <a className="button button--primary" href="#route-planner">
              Plan your route
            </a>
            <a className="button button--demo" href="#route-planner">
              <span className="play-icon" aria-hidden="true">
                <Play size={13} fill="currentColor" />
              </span>
              Watch demo
            </a>
          </div>
        </div>

        <aside className="route-note" aria-label="RouteSafe promise">
          <span>Safer routes.</span>
          <strong>Stronger deliveries.</strong>
          <svg viewBox="0 0 160 48" role="presentation">
            <path d="M8 14c37 14 82 17 140 2" />
            <path d="m130 7 19 9-14 14" />
          </svg>
        </aside>

        <div className="benefit-bar" aria-label="RouteSafe benefits">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article className="benefit" key={title}>
              <span className="benefit__icon" aria-hidden="true">
                <Icon size={27} strokeWidth={1.8} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </article>
          ))}
        </div>
      </section>
      <RoutePlanner />
      <HowItWorks />
      <RiskClassifier />
      <RecommendationDemo />
      <WeatherForecast />
      <WhyChoose />
      <CommunityFaq />
        </>
      )}
      <FinalCtaFooter />
    </main>
  );
}

export default App;
