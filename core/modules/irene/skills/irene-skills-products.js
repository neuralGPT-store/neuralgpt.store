export const IreneProducts = {
  createProductDraft(name) {
    return {
      title: \\ — AI Enhanced Listing\,
      description: \Automatically generated product description powered by Irene.\,
      benefits: [
        'Optimized for conversion',
        'AI-generated marketing text',
        'SEO-friendly structure'
      ]
    };
  },
  suggestPrice(cost) {
    return (cost * 1.7).toFixed(2);  
  }
};
