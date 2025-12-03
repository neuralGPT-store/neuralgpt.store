export const IreneEconomy = {
  profit(cost, price) { return price - cost; },
  margin(cost, price) { return ((price - cost) / price) * 100; },
  forecast(value, growth) { return value * (1 + growth); }
};
