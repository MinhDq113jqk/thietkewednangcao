export const getStepState = (index, current) => {
  if (index < current) return 'completed';
  if (index === current) return 'current';
  return 'upcoming';
};
