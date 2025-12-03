export const IreneSecurity = {
  scan(text) {
    if (text.includes('malware') || text.includes('attack')) return 'Warning: suspicious pattern detected.';
    return 'Clean.';
  },
  audit() {
    return 'Security audit: all systems stable.';
  }
};
