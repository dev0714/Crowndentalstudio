export type ConsultQuote = {
  amount: number;
  rule: string;
  requiresPaymentMethodConfirmation: boolean;
  hoursLabel: string;
};

function getJohannesburgDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const weekday = lookup.get('weekday') || 'Mon';
  const hour = Number(lookup.get('hour') || '0');
  const minute = Number(lookup.get('minute') || '0');

  return {
    weekday,
    minutesFromMidnight: hour * 60 + minute,
  };
}

function isWeekday(weekday: string) {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);
}

function isSaturday(weekday: string) {
  return weekday === 'Sat';
}

function isSunday(weekday: string) {
  return weekday === 'Sun';
}

export function calculateConsultQuote(dateInput: string | Date): ConsultQuote {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const { weekday, minutesFromMidnight } = getJohannesburgDateParts(date);

  const normalWeekdayOpen = 9 * 60;
  const weekdayClose = 16 * 60;
  const saturdayClose = 12 * 60;
  const sundayMorningEnd = 12 * 60;
  const sundayAfternoonEnd = 16 * 60;

  if (isWeekday(weekday) && minutesFromMidnight >= normalWeekdayOpen && minutesFromMidnight < weekdayClose) {
    return {
      amount: 450,
      rule: 'Normal weekday consult',
      requiresPaymentMethodConfirmation: false,
      hoursLabel: 'Mon-Fri 09:00-16:00',
    };
  }

  if (isSaturday(weekday) && minutesFromMidnight >= normalWeekdayOpen && minutesFromMidnight < saturdayClose) {
    return {
      amount: 450,
      rule: 'Normal Saturday consult',
      requiresPaymentMethodConfirmation: false,
      hoursLabel: 'Sat 09:00-12:00',
    };
  }

  if (isSunday(weekday)) {
    if (minutesFromMidnight >= normalWeekdayOpen && minutesFromMidnight < sundayMorningEnd) {
      return {
        amount: 750,
        rule: 'Sunday priority consult',
        requiresPaymentMethodConfirmation: true,
        hoursLabel: 'Sun 09:00-12:00',
      };
    }

    if (minutesFromMidnight >= sundayMorningEnd && minutesFromMidnight < sundayAfternoonEnd) {
      return {
        amount: 1000,
        rule: 'Sunday extended after-hours consult',
        requiresPaymentMethodConfirmation: true,
        hoursLabel: 'Sun 12:00-16:00',
      };
    }

    return {
      amount: 1500,
      rule: 'Sunday emergency consult',
      requiresPaymentMethodConfirmation: true,
      hoursLabel: 'Sun after 16:00',
    };
  }

  const closeTime = isSaturday(weekday) ? saturdayClose : weekdayClose;
  const minutesAfterClose = minutesFromMidnight - closeTime;

  if (minutesAfterClose >= 0 && minutesAfterClose < 60) {
    return {
      amount: 750,
      rule: 'First hour after closing',
      requiresPaymentMethodConfirmation: true,
      hoursLabel: 'After closing, first hour',
    };
  }

  if (minutesAfterClose >= 60 && minutesAfterClose < 5 * 60) {
    return {
      amount: 1000,
      rule: 'Extended after-hours consult',
      requiresPaymentMethodConfirmation: true,
      hoursLabel: 'After closing, next four hours',
    };
  }

  return {
    amount: 1500,
    rule: 'Emergency consult',
    requiresPaymentMethodConfirmation: true,
    hoursLabel: 'Outside normal hours',
  };
}
