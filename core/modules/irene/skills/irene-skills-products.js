export const IreneProducts = {
  createProductDraft(name = 'New Product') {
    return {
      title: `${name} — AI Enhanced Listing`,
      description: `Automatically generated product description powered by Irene for ${name}.`,
      benefits: [
        'Optimized for conversion',
        'AI-generated marketing text',
        'SEO-friendly structure'
      ]
    };
  },
  suggestPrice(cost) {
    const n = Number(cost) || 0;
    return (n * 1.7).toFixed(2);
  }
};
