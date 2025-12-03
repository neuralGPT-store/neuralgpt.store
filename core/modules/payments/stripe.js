function payStripe() {
  fetch('/create-stripe-session')
    .then(res => res.json())
    .then(data => { window.location = data.url; });
}
