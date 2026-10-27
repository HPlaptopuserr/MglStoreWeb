import "./editor-steps.css";
export interface EditorStep {
  id: string;
  title: string;
  description: string;
}
export function EditorSteps({
  steps,
  current,
  onChange,
}: {
  steps: EditorStep[];
  current: string;
  onChange: (id: string) => void;
}) {
  const index = steps.findIndex((step) => step.id === current);
  return (
    <div className="editor-workflow">
      <nav aria-label="Бүртгэлийн алхмууд">
        <ol>
          {steps.map((step, i) => (
            <li key={step.id}>
              <button
                type="button"
                aria-current={current === step.id ? "step" : undefined}
                onClick={() => onChange(step.id)}
              >
                <span>{i + 1}</span>
                <strong>{step.title}</strong>
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="editor-step-intro">
        <small>
          АЛХАМ {index + 1} / {steps.length}
        </small>
        <h2>{steps[index]?.title}</h2>
        <p>{steps[index]?.description}</p>
      </div>
    </div>
  );
}
