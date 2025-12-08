export const IreneLogic = {
  evaluate(expression) {
    if (typeof expression !== 'string') return 'Invalid expression';
    // Allow only digits, whitespace and basic arithmetic operators and parentheses
    const safeRe = /^[0-9+\-*/().\s]+$/;
    if (!safeRe.test(expression)) return 'Invalid characters in expression';
    try {
      // Use Function constructor after validation (supports arithmetic)
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expression});`);
      return fn();
    } catch (err) {
      return 'Error in logical expression';
    }
  }
};
