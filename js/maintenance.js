/**
 * Maintenance mode redirect.
 * If window.NEURAL_MAINTENANCE === true, redirect to /maintenance.html
 */
(function () {
  'use strict';

  if (window.NEURAL_MAINTENANCE === true && window.location.pathname !== '/maintenance.html') {
    window.location.href = '/maintenance.html';
  }
})();
