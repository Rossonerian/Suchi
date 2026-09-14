export function joinCodeAction(hasPlaintextCode) {
  return hasPlaintextCode
    ? { label: 'Rotate code', method: 'rotate' }
    : { label: 'Generate / replace join code', method: 'rotate' };
}
