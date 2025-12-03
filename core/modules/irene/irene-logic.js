export const IreneLogic = {
  evaluate(expression) {
    try { return eval(expression); }
    catch { return 'Error in logical expression.'; }
  }
};
