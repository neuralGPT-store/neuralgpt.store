// OpenAI integrations removed to comply with repository policy.
// This module provides a local, deterministic response to keep the UI functioning
// without performing any external paid API calls.

async function askIrene(prompt) {
  return 'Irene is running in offline mode. External LLM integrations are disabled.';
}

module.exports = { askIrene };
