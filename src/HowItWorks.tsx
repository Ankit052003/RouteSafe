import { useState } from "react";
import {
  BadgeCheck,
  ClipboardList,
  CloudSun,
  Map,
  type LucideIcon,
} from "lucide-react";

type WorkflowStep = {
  title: string;
  description: string;
  detail: string;
  output: string;
  icon: LucideIcon;
};

const workflowSteps: ReadonlyArray<WorkflowStep> = [
  {
    title: "Enter trip details",
    description: "Add origin, destination, departure time, load weight, and checkpoint interval.",
    detail: "Your inputs establish when and where the truck will encounter weather along the trip.",
    output: "Validated trip profile",
    icon: ClipboardList,
  },
  {
    title: "Generate alternatives",
    description: "Request three distinct truck-friendly routes from the routing provider.",
    detail: "Each route includes its geometry, total distance, travel time, and timing information.",
    output: "3 route alternatives",
    icon: Map,
  },
  {
    title: "Evaluate weather",
    description: "Sample weather at each checkpoint using its estimated arrival time.",
    detail: "Wind, rain, and snowfall are classified at the hour the truck is expected to arrive.",
    output: "ETA-synced risk profile",
    icon: CloudSun,
  },
  {
    title: "Compare and choose",
    description: "Rank eligible routes by severe miles, high miles, average risk, and time.",
    detail: "The recommendation explains the first criterion that separated the safest options.",
    output: "Explainable recommendation",
    icon: BadgeCheck,
  },
];

function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const selectedStep = workflowSteps[activeStep];
  const progress = `${(activeStep / (workflowSteps.length - 1)) * 100}%`;

  return (
    <section className="workflow-section" id="how-it-works" aria-labelledby="workflow-title">
      <div className="workflow-banner">
        <div className="workflow-banner__content">
          <span className="light-kicker">How RouteSafe works</span>
          <h2 id="workflow-title">
            <span>From trip details</span>
            <span>to a safer destination</span>
          </h2>
        </div>
      </div>

      <div className="workflow-content">
        <div className="workflow-progress" aria-hidden="true">
          <span style={{ width: progress }} />
        </div>
        <div className="workflow-steps" role="tablist" aria-label="Route analysis workflow">
          {workflowSteps.map(({ title, description, icon: Icon }, index) => (
            <button
              aria-selected={activeStep === index}
              className={activeStep === index ? "workflow-step is-active" : "workflow-step"}
              key={title}
              onClick={() => setActiveStep(index)}
              role="tab"
              type="button"
            >
              <span className="workflow-step__number">{String(index + 1).padStart(2, "0")}</span>
              <span className="workflow-step__icon"><Icon size={27} /></span>
              <span className="workflow-step__copy">
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="workflow-detail" role="tabpanel" aria-live="polite">
          <span className="workflow-detail__index">{String(activeStep + 1).padStart(2, "0")}</span>
          <span>
            <small>Current stage</small>
            <strong>{selectedStep.title}</strong>
            <p>{selectedStep.detail}</p>
          </span>
          <span className="workflow-output">
            <small>Stage output</small>
            <strong>{selectedStep.output}</strong>
          </span>
          <button
            className="workflow-next"
            onClick={() => setActiveStep((current) => (current + 1) % workflowSteps.length)}
            type="button"
          >
            {activeStep === workflowSteps.length - 1 ? "Start over" : "Next step"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
