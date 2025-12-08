export const IreneVendors = {
  outreach(name = '') {
    return `Hello ${name},\n\nWe believe your products would perform well in our AI-driven marketplace. Please contact us to explore onboarding and featured placement opportunities.\n\nBest regards,\nNeuralGPT Marketplace Team`;
  },
  evaluateProductQuality(desc = '') {
    if (typeof desc !== 'string') return 'Invalid description';
    if (desc.length < 50) return 'Low detail — requires enhancement.';
    return 'Quality acceptable.';
  }
};
