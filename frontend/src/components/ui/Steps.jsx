import { Check } from 'lucide-react';
import { getStepState } from './steps.helpers';

const stateStyles = {
  completed: {
    indicator: "border-primary bg-primary steps-detail-1",
    label: "text-body",
  },
  current: {
    indicator: "border-danger bg-danger steps-detail-2",
    label: "fw-bold text-danger",
  },
  upcoming: {
    indicator: "text-secondary steps-detail-3",
    label: "text-secondary",
  },
};

const stateLabels = {
  completed: 'Đã hoàn thành',
  current: 'Bước hiện tại',
  upcoming: 'Sắp tới',
};

function Indicator({ index, state }) {
  return (
    <span
      className={`d-flex flex-shrink-0 align-items-center justify-content-center rounded-pill border booking-caption fw-bold steps-detail-4 ${stateStyles[state].indicator}`}
      aria-hidden="true"
    >
      {state === 'completed' ? <Check size={16} strokeWidth={3} /> : index + 1}
    </span>
  );
}

function Separator({ completed }) {
  return (
    <span
      className={`mx-2 flex-grow-1 steps-detail-6 ${completed ? "bg-primary" : "steps-detail-5"}`}
      aria-hidden="true"
    />
  );
}

function Steps({ items, current = 0, 'aria-label': ariaLabel = 'Tiến trình' }) {
  return (
    <ol className="d-grid w-100 list-unstyled m-0 p-0 steps-detail-7" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const state = getStepState(index, current);

        return (
          <li
            key={item.label}
            className="steps-detail-8"
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="visually-hidden">{stateLabels[state]}. </span>
            <div className="d-flex align-items-center">
              <Steps.Indicator index={index} state={state} />
              {index < items.length - 1 && (
                <Steps.Separator completed={index < current} />
              )}
            </div>
            <span className={`mt-2 d-block pe-2 booking-caption steps-detail-9 ${stateStyles[state].label}`}>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

Steps.Indicator = Indicator;
Steps.Separator = Separator;

export default Steps;
