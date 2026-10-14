import { useState } from "react";
import {
  Minus,
  Plus,
  Quote,
  ShieldCheck,
} from "lucide-react";

type Perspective = {
  image: string;
  imageAlt: string;
  role: string;
  focus: string;
  quote: string;
  response: string;
  href: string;
  linkLabel: string;
};

type Faq = {
  question: string;
  answer: string;
};

const perspectives: Perspective[] = [
  {
    image: "/D8KHefIXEwzrGPSx6keQwui5XMtkF7RcZ6PGyWRRHh4.webp",
    imageAlt: "Illustrative portrait for the long-haul driver scenario",
    role: "Long-haul driver",
    focus: "Safer departure decisions",
    quote: "I need to see whether a safer route is worth the extra travel time before I commit to the road.",
    response: "Route cards compare severe miles, high-risk miles, average risk, and duration in the required priority order.",
    href: "#route-planner",
    linkLabel: "Compare routes",
  },
  {
    image: "/portrait-beautiful-smiling-model-dressed-summer-clothes-trendy-girl-posing-street-funny-positive-woman-having-fun_158538-6295.webp",
    imageAlt: "Illustrative portrait for the fleet manager scenario",
    role: "Fleet manager",
    focus: "Consistent safety rules",
    quote: "The recommendation should be simple to explain to dispatch and consistent across every truck and load.",
    response: "The risk matrix and load overrides make each classification visible and repeatable instead of hiding it in a score.",
    href: "#safety",
    linkLabel: "Review safety rules",
  },
  {
    image: "/random-person.webp",
    imageAlt: "Illustrative portrait for the logistics coordinator scenario",
    role: "Logistics coordinator",
    focus: "Actionable weather timing",
    quote: "A forecast only helps when it reflects where the truck will be when the weather arrives.",
    response: "Checkpoint ETAs pair the route position with its expected conditions, while the slider explores the next 48 hours.",
    href: "#forecast",
    linkLabel: "Explore the forecast",
  },
];

const faqs: Faq[] = [
  {
    question: "How current is the weather data?",
    answer:
      "RouteSafe is designed to request forecast conditions for each checkpoint's estimated arrival time. In production, freshness depends on the configured weather provider and should be shown with its last-updated timestamp.",
  },
  {
    question: "What does No Travel mean?",
    answer:
      "No Travel is the highest advisory risk level. It applies at winds of 55 mph or more for every load, and at 45–54 mph when the load exceeds 30,000 lb. It is a planning warning, not a legal road closure notice.",
  },
  {
    question: "How are routes ranked?",
    answer:
      "Routes are compared in order: fewest Severe miles, fewest High miles, lowest average risk, then shortest travel time. A later criterion is used only when the earlier one is tied.",
  },
  {
    question: "Can I use this for any load weight?",
    answer:
      "Yes. The entered weight is used by the wind rules. Loads over 30,000 lb can trigger No Travel at 45–54 mph, and loads over 40,000 lb trigger Severe risk at 35–44 mph.",
  },
  {
    question: "How often is weather sampled?",
    answer:
      "Choose checkpoints every 10, 25, or 50 miles. Shorter intervals provide more detail and require more forecast lookups; longer intervals provide a faster overview.",
  },
  {
    question: "How far ahead can I inspect conditions?",
    answer:
      "The interactive timeline covers departure through 48 hours ahead. Trips extending beyond that window should clearly identify checkpoints where forecast data is not yet available.",
  },
];

function CommunityFaq() {
  const [activePerspective, setActivePerspective] = useState(0);
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(new Set([0]));
  const active = perspectives[activePerspective];
  const allFaqsOpen = openFaqs.size === faqs.length;

  const selectAdjacentPerspective = (direction: -1 | 1) => {
    setActivePerspective(
      (currentIndex) => (currentIndex + direction + perspectives.length) % perspectives.length,
    );
  };

  const toggleFaq = (index: number) => {
    setOpenFaqs((currentFaqs) => {
      const nextFaqs = new Set(currentFaqs);

      if (nextFaqs.has(index)) {
        nextFaqs.delete(index);
      } else {
        nextFaqs.add(index);
      }

      return nextFaqs;
    });
  };

  const toggleAllFaqs = () => {
    setOpenFaqs(allFaqsOpen ? new Set() : new Set(faqs.map((_, index) => index)));
  };

  return (
    <section className="community-section" id="faq" aria-labelledby="community-title">
      <div className="community-shell">
        <div className="community-heading-row">
          <div className="community-heading">
            <span className="section-kicker">Driver perspectives</span>
            <h2 id="community-title">Designed around real road decisions</h2>
            <p>Explore the needs that shape RouteSafe's route, weather, and risk experience.</p>
          </div>
          <a className="outline-link" href="#faq-list">
            Browse FAQs
          </a>
        </div>

        <div className="perspective-grid" role="tablist" aria-label="Illustrative driver perspectives">
          {perspectives.map((perspective, index) => {
            const isActive = index === activePerspective;

            return (
              <button
                className={`perspective-card ${isActive ? "is-active" : ""}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="perspective-response"
                tabIndex={isActive ? 0 : -1}
                key={perspective.role}
                onClick={() => setActivePerspective(index)}
              >
                <img
                  className="perspective-avatar"
                  src={perspective.image}
                  alt={perspective.imageAlt}
                  loading="lazy"
                  decoding="async"
                />
                <span className="perspective-person">
                  <strong>{perspective.role}</strong>
                  <small>Illustrative scenario</small>
                </span>
                <span className="perspective-focus">
                  <ShieldCheck size={15} /> {perspective.focus}
                </span>
                <Quote className="perspective-quote-icon" size={24} aria-hidden="true" />
                <q>{perspective.quote}</q>
              </button>
            );
          })}
        </div>

        <div className="perspective-response" id="perspective-response" role="tabpanel" aria-live="polite">
          <div className="perspective-response__copy">
            <span>RouteSafe response</span>
            <strong>{active.focus}</strong>
            <p>{active.response}</p>
          </div>
          <a href={active.href}>
            {active.linkLabel}
          </a>
          <div className="perspective-controls" aria-label="Choose another perspective">
            <button type="button" aria-label="Previous perspective" onClick={() => selectAdjacentPerspective(-1)}>
              Previous
            </button>
            <span>
              {activePerspective + 1} / {perspectives.length}
            </span>
            <button type="button" aria-label="Next perspective" onClick={() => selectAdjacentPerspective(1)}>
              Next
            </button>
          </div>
        </div>

        <p className="perspective-disclaimer">
          Illustrative product-use scenarios—not customer testimonials or performance claims.
        </p>

        <div className="faq-divider" />

        <div className="faq-heading-row">
          <div>
            <span className="section-kicker">Frequently asked questions</span>
            <h2>Answers for safer route planning</h2>
            <p>Understand the data, classifications, and recommendation logic behind the experience.</p>
          </div>
          <button className="outline-link" type="button" onClick={toggleAllFaqs}>
            {allFaqsOpen ? "Collapse all" : "Expand all"}
            {allFaqsOpen ? <Minus size={17} /> : <Plus size={17} />}
          </button>
        </div>

        <div className="faq-grid" id="faq-list">
          {faqs.map((faq, index) => {
            const isOpen = openFaqs.has(index);
            const contentId = `faq-answer-${index}`;

            return (
              <article className={`faq-item ${isOpen ? "is-open" : ""}`} key={faq.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => toggleFaq(index)}
                >
                  <span>{faq.question}</span>
                  <span className="faq-item__icon" aria-hidden="true">
                    {isOpen ? <Minus size={19} /> : <Plus size={19} />}
                  </span>
                </button>
                <div className="faq-item__answer" id={contentId} hidden={!isOpen}>
                  <p>{faq.answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default CommunityFaq;
