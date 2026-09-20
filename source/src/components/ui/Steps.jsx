import { Check } from 'lucide-react';
import { getStepState } from './steps.helpers';

const stateStyles = {
  completed: {
    indicator: 'border-[#0F766E] bg-[#0F766E] text-white',
    label: 'text-[#315E57]',
  },
  current: {
    indicator: 'border-[#C93F2C] bg-[#C93F2C] text-white shadow-[0_0_0_3px_#FFF1EE]',
    label: 'font-bold text-[#C93F2C]',
  },
  upcoming: {
    indicator: 'border-[#C9D1CD] bg-white text-[#8A9690]',
    label: 'text-[#8A9690]',
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
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${stateStyles[state].indicator}`}
      aria-hidden="true"
    >
      {state === 'completed' ? <Check size={16} strokeWidth={3} /> : index + 1}
    </span>
  );
}

function Separator({ completed }) {
  return (
    <span
      className={`mx-2 h-0.5 min-w-2 flex-1 ${completed ? 'bg-[#0F766E]' : 'bg-[#D5DEDA]'}`}
      aria-hidden="true"
    />
  );
}

function Steps({ items, current = 0, 'aria-label': ariaLabel = 'Tiến trình' }) {
  return (
    <ol className="grid w-full grid-cols-4" aria-label={ariaLabel}>
      {items.map((item, index) => {
        const state = getStepState(index, current);

        return (
          <li
            key={item.label}
            className="min-w-0"
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="sr-only">{stateLabels[state]}. </span>
            <div className="flex items-center">
              <Steps.Indicator index={index} state={state} />
              {index < items.length - 1 && (
                <Steps.Separator completed={index < current} />
              )}
            </div>
            <span className={`mt-2 block pr-2 text-xs leading-5 ${stateStyles[state].label}`}>
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
