export type PatientFeedbackInput = {
  feedback_type: 'satisfaction' | 'complaint';
  outcome: 'happy' | 'needs_follow_up' | 'complaint_logged' | 'resolved';
};

export function shouldPromptForReview(input: PatientFeedbackInput) {
  return input.feedback_type === 'satisfaction' && input.outcome === 'happy';
}

export function isComplaintFirstOutcome(input: PatientFeedbackInput) {
  return input.feedback_type === 'complaint' || input.outcome === 'needs_follow_up' || input.outcome === 'complaint_logged';
}

export function needsManagerFollowUp(input: PatientFeedbackInput) {
  return input.feedback_type === 'complaint' && input.outcome !== 'resolved';
}
