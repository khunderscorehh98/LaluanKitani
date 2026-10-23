// Report labels and their fixed routing effects. Expiry times and the
// confirmation threshold are starting guesses from the product brainstorm, to tune.
//
// Routing effects:
//   hard_avoid        never routed through (only once confirmed)
//   strong_soft_avoid much less preferred; alternative suggested
//   soft_avoid        less preferred; slower ETA
//   warning           shown to drivers, no routing change
//   none              not yet confirmed, so no routing change
export const REPORT_LABELS = {
  careful: { routing: 'warning',           expiresAfterMinutes: 120,  needsConfirmation: false },
  jammed:  { routing: 'soft_avoid',        expiresAfterMinutes: 60,   needsConfirmation: false },
  danger:  { routing: 'strong_soft_avoid', expiresAfterMinutes: 180,  needsConfirmation: false },
  flooded: { routing: 'hard_avoid',        expiresAfterMinutes: null, needsConfirmation: true },
  closed:  { routing: 'hard_avoid',        expiresAfterMinutes: null, needsConfirmation: true },
};

export const LABELS = Object.keys(REPORT_LABELS);

// Closed and Flooded change routing only after this many independent "still there" votes.
export const CONFIRMATIONS_REQUIRED = 2;

export function isConfirmed(label, stillThereCount) {
  return !REPORT_LABELS[label].needsConfirmation || stillThereCount >= CONFIRMATIONS_REQUIRED;
}

export function routingEffect(label, stillThereCount) {
  return isConfirmed(label, stillThereCount) ? REPORT_LABELS[label].routing : 'none';
}
