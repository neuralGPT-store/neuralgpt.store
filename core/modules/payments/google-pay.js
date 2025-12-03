const paymentsClient = new google.payments.api.PaymentsClient({ environment: 'TEST' });

const paymentRequest = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [{
    type: 'CARD',
    parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['VISA','MASTERCARD'] },
    tokenizationSpecification: {
      type: 'PAYMENT_GATEWAY',
      parameters: { gateway: 'stripe', stripe: { publishableKey: 'pk_test_xxxxxxxxx', version: '2020-08-27' } }
    }
  }],
  merchantInfo: { merchantName: 'NeuralGPT.store' },
  transactionInfo: {
    totalPriceStatus: 'FINAL',
    totalPrice: '10.00',
    currencyCode: 'EUR'
  }
};

paymentsClient.isReadyToPay(paymentRequest).then(resp => {
  if (resp.result) {
    const button = paymentsClient.createButton({
      onClick: () => paymentsClient.loadPaymentData(paymentRequest)
    });
    document.getElementById('google-pay-button').appendChild(button);
  }
});
