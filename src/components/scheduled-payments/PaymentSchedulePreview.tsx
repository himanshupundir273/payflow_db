import React from 'react';
import { Calendar } from 'lucide-react';
import { format, addWeeks, addMonths, addYears } from 'date-fns';

interface FormValues {
  scheduledFor: string;
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  recurrenceEndType: 'after' | 'on' | 'never';
  recurrenceEndAfter: number | '';
  recurrenceEndDate: string;
}

interface PaymentSchedulePreviewProps {
  values: FormValues;
}

// Helper function to get next occurrences
const getNextOccurrences = (values: FormValues): Date[] => {
  if (!values.isRecurring || !values.scheduledFor || !values.recurrencePattern) {
    return [];
  }

  const startDate = new Date(values.scheduledFor);
  const occurrences: Date[] = [startDate];
  let currentDate = startDate;
  const maxPreviewOccurrences = 5;

  for (let i = 1; i < maxPreviewOccurrences; i++) {
    let nextDate: Date;
    
    switch (values.recurrencePattern) {
      case 'weekly':
        nextDate = addWeeks(currentDate, 1);
        break;
      case 'monthly':
        nextDate = addMonths(currentDate, 1);
        break;
      case 'quarterly':
        nextDate = addMonths(currentDate, 3);
        break;
      case 'yearly':
        nextDate = addYears(currentDate, 1);
        break;
      default:
        return occurrences;
    }

    // Check end conditions
    if (values.recurrenceEndType === 'on' && values.recurrenceEndDate) {
      if (nextDate > new Date(values.recurrenceEndDate)) {
        break;
      }
    } else if (values.recurrenceEndType === 'after') {
      if (i >= Number(values.recurrenceEndAfter)) {
        break;
      }
    }

    occurrences.push(nextDate);
    currentDate = nextDate;
  }

  return occurrences;
};

const PaymentSchedulePreview: React.FC<PaymentSchedulePreviewProps> = ({ values }) => {
  const occurrences = getNextOccurrences(values);

  if (!values.recurrencePattern || occurrences.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-500">
          Complete the recurring settings to see the payment schedule
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <Calendar className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Payment Schedule Preview</h4>
          <p className="text-xs text-gray-600">Next 5 scheduled payments</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {occurrences.map((date, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-3 border border-green-200 flex items-center space-x-3"
          >
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-green-600">{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {format(date, 'dd MMM yyyy')}
              </div>
              <div className="text-xs text-gray-500">
                {format(date, 'EEEE')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentSchedulePreview; 