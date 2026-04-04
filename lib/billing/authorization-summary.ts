export function calcInvoiceShortfall(invoice: { total_amount: number; paid_amount: number }) {
  return Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
}

export function calcAuthorizationShortfall(authorization: {
  authorized_amount?: number | null;
  co_payment_amount?: number | null;
  patient_shortfall_amount?: number | null;
}) {
  if (authorization.patient_shortfall_amount != null) {
    return Number(authorization.patient_shortfall_amount || 0);
  }

  const authorizedAmount = Number(authorization.authorized_amount || 0);
  const coPayment = Number(authorization.co_payment_amount || 0);
  return Math.max(0, authorizedAmount - coPayment);
}

