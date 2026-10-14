import {
  Boxes,
  CheckCircle2,
  Clock3,
  CloudSun,
  MapPinned,
  Route,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import CommunityFaq from "./CommunityFaq";
import HowItWorks from "./HowItWorks";
import RecommendationDemo from "./RecommendationDemo";
import RiskClassifier from "./RiskClassifier";
import RouteDetails from "./RouteDetails";
import RoutePlanner from "./RoutePlanner";
import WeatherForecast from "./WeatherForecast";

type PageHeroProps = {
  kicker: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  highlights: string[];
};

type DetailCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type DetailGridProps = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  cards: DetailCard[];
};

const featureCards: DetailCard[] = [
  {
    icon: CloudSun,
    title: "Forecast-aware checkpoints",
    description: "Match expected conditions to where the truck should be at each checkpoint—not only the departure city.",
  },
  {
    icon: Route,
    title: "Explainable route ranking",
    description: "Compare Severe miles, High miles, average risk, and travel time in a visible priority order.",
  },
  {
    icon: Boxes,
    title: "Load-aware decisions",
    description: "Apply wind overrides using the entered truck load so the same weather can produce the right warning.",
  },
  {
    icon: MapPinned,
    title: "Checkpoint-level detail",
    description: "Inspect ETA, distance, weather, and risk for every stop along each available route.",
  },
];

const workflowCards: DetailCard[] = [
  {
    icon: MapPinned,
    title: "Start with the real trip",
    description: "Origin, destination, departure time, load weight, and checkpoint spacing establish the trip profile.",
  },
  {
    icon: Route,
    title: "Generate practical alternatives",
    description: "Three truck-friendly routes make the safety and timing tradeoffs visible before a driver commits.",
  },
  {
    icon: CloudSun,
    title: "Meet the weather in time",
    description: "Each route checkpoint is evaluated against the forecast expected at its estimated arrival time.",
  },
  {
    icon: CheckCircle2,
    title: "Choose with confidence",
    description: "The final recommendation follows the required ranking order and keeps every deciding factor inspectable.",
  },
];

const safetyCards: DetailCard[] = [
  {
    icon: ShieldCheck,
    title: "Explicit risk thresholds",
    description: "Low, Moderate, High, Severe, and No Travel classifications are tied to visible weather ranges.",
  },
  {
    icon: Truck,
    title: "Load-specific overrides",
    description: "Heavy-load wind rules are evaluated separately so important safety limits cannot be averaged away.",
  },
  {
    icon: Route,
    title: "Safety-first comparison",
    description: "Routes are ordered by Severe miles and High miles before average risk or travel time is considered.",
  },
  {
    icon: Clock3,
    title: "Timing-aware context",
    description: "Risk is connected to checkpoint arrival time, helping distinguish current conditions from future exposure.",
  },
];

function PageHero({
  kicker,
  title,
  description,
  image,
  imageAlt,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  highlights,
}: PageHeroProps) {
  return (
    <section className="subpage-hero" aria-labelledby="subpage-title">
      <div className="subpage-hero__copy">
        <span className="section-kicker">{kicker}</span>
        <h1 id="subpage-title">{title}</h1>
        <p>{description}</p>
        <div className="subpage-hero__actions">
          <a className="button button--primary" href={primaryHref}>
            {primaryLabel}
          </a>
          <a className="subpage-hero__secondary" href={secondaryHref}>
            {secondaryLabel}
          </a>
        </div>
      </div>

      <div className="subpage-hero__visual">
        <img src={image} alt={imageAlt} />
        <div className="subpage-hero__panel">
          <span>Built into RouteSafe</span>
          {highlights.map((highlight) => (
            <strong key={highlight}>
              <CheckCircle2 size={17} aria-hidden="true" />
              {highlight}
            </strong>
          ))}
        </div>
      </div>
    </section>
  );
}

function DetailGrid({ id, kicker, title, description, cards }: DetailGridProps) {
  return (
    <section className="subpage-details" aria-labelledby={id}>
      <div className="subpage-details__heading">
        <span className="section-kicker">{kicker}</span>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="subpage-details__grid">
        {cards.map(({ icon: Icon, title: cardTitle, description: cardDescription }, index) => (
          <article className="subpage-detail-card" key={cardTitle}>
            <div className="subpage-detail-card__top">
              <span>
                <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <small>{String(index + 1).padStart(2, "0")}</small>
            </div>
            <h3>{cardTitle}</h3>
            <p>{cardDescription}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function FeaturesPage() {
  return (
    <div className="subpage subpage--features">
      <PageHero
        kicker="RouteSafe features"
        title="See the route, weather, and risk picture together."
        description="RouteSafe turns a basic trip request into a transparent planning workspace—so drivers can compare alternatives, inspect changing conditions, and understand every recommendation."
        image="/route details.png"
        imageAlt="Truck travelling through a clear mountain corridor"
        primaryHref="#forecast"
        primaryLabel="Explore the forecast"
        secondaryHref="#route-details"
        secondaryLabel="Inspect route details"
        highlights={["48-hour weather timeline", "Three route comparison", "Checkpoint-level risk"]}
      />
      <DetailGrid
        id="feature-foundations"
        kicker="One connected workspace"
        title="Useful detail without hidden logic"
        description="Every feature helps answer a practical planning question, from when conditions change to why one route ranks above another."
        cards={featureCards}
      />
      <WeatherForecast />
      <RouteDetails />
    </div>
  );
}

export function HowItWorksPage() {
  return (
    <div className="subpage subpage--workflow">
      <PageHero
        kicker="How RouteSafe works"
        title="From trip details to a safer, explainable route."
        description="A clear four-stage workflow connects trip inputs, truck-friendly alternatives, checkpoint weather, and a recommendation the driver can verify."
        image="/why choose.png"
        imageAlt="Truck driving through a mountain road corridor"
        primaryHref="#how-it-works"
        primaryLabel="View the workflow"
        secondaryHref="#route-planner"
        secondaryLabel="Try the route planner"
        highlights={["Trip profile validation", "Forecast sampling", "Priority-based ranking"]}
      />
      <DetailGrid
        id="workflow-foundations"
        kicker="A transparent process"
        title="Four steps, one clear decision"
        description="The experience keeps inputs, calculations, and outputs connected so each route recommendation is easy to follow."
        cards={workflowCards}
      />
      <HowItWorks />
      <RoutePlanner />
    </div>
  );
}

export function SafetyPage() {
  return (
    <div className="subpage subpage--safety">
      <PageHero
        kicker="Safety logic"
        title="Rules drivers can inspect before they trust the route."
        description="RouteSafe keeps weather thresholds, load overrides, and route-ranking priorities visible—turning a recommendation into a decision that can be checked and explained."
        image="/herof.png"
        imageAlt="Freight truck on a mountain highway"
        primaryHref="#safety"
        primaryLabel="Test the risk rules"
        secondaryHref="/features#route-details"
        secondaryLabel="Review route details"
        highlights={["Visible thresholds", "Heavy-load overrides", "Safety-first ranking"]}
      />
      <DetailGrid
        id="safety-foundations"
        kicker="Decision safeguards"
        title="Safety is applied before speed"
        description="The ranking logic prioritizes exposure to serious conditions and uses travel time only after the higher-priority safety measures are tied."
        cards={safetyCards}
      />
      <RiskClassifier />
      <RecommendationDemo />
    </div>
  );
}

export function FaqPage() {
  return (
    <div className="subpage subpage--faq">
      <PageHero
        kicker="RouteSafe help center"
        title="Straight answers for safer route planning."
        description="Explore the planning scenarios RouteSafe is designed around, then review concise answers about data freshness, risk levels, route ranking, loads, and checkpoint timing."
        image="/make the.png"
        imageAlt="Mountain highway prepared for long-haul route planning"
        primaryHref="#faq-list"
        primaryLabel="Browse common questions"
        secondaryHref="#faq"
        secondaryLabel="See driver perspectives"
        highlights={["Product-use scenarios", "Risk rule guidance", "Forecast and route FAQs"]}
      />
      <CommunityFaq />
    </div>
  );
}
