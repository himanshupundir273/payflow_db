import React from 'react';
import { Field } from 'formik';
import { Calendar, Clock, Repeat, AlertCircle, Info } from 'lucide-react';
import { format, addDays } from 'date-fns';
import Input from '../ui/Input';
import Toggle from '../ui/Toggle';

interface FormValues {
  scheduledFor: string;
  isRecurring: boolean;
  recurrencePattern: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | null;
  recurrenceEndType: 'after' | 'on' | 'never';
  recurrenceEndAfter: number | '';
  recurrenceEndDate: string;
}

interface RecurringPaymentConfigProps {
  values: FormValues;
  setFieldValue: (field: string, value: any) => void;
  errors: any;
  touched: any;
}

const RecurringPaymentConfig: React.FC<RecurringPaymentConfigProps> = ({
  values,
  setFieldValue,
  errors,
  touched,
}) => {
  // Helper function to get minimum end date (must be after scheduled_for)
  const getMinEndDate = () => {
    if (!values.scheduledFor) return '';
    const scheduledDate = new Date(values.scheduledFor);
    const minDate = addDays(scheduledDate, 1); // At least 1 day after scheduled date
    return minDate.toISOString().split('T')[0];
  };

  // Helper function to get suggested end date based on pattern
  const getSuggestedEndDate = () => {
    if (!values.scheduledFor || !values.recurrencePattern) return '';
    
    const scheduledDate = new Date(values.scheduledFor);
    let suggestedDate = new Date(scheduledDate);
    
    switch (values.recurrencePattern) {
      case 'weekly':
        suggestedDate.setDate(scheduledDate.getDate() + 28); // 4 weeks later
        break;
      case 'monthly':
        suggestedDate.setMonth(scheduledDate.getMonth() + 6); // 6 months later
        break;
      case 'quarterly':
        suggestedDate.setMonth(scheduledDate.getMonth() + 12); // 1 year later
        break;
      case 'yearly':
        suggestedDate.setFullYear(scheduledDate.getFullYear() + 2); // 2 years later
        break;
    }
    
    return suggestedDate.toISOString().split('T')[0];
  };

  // Auto-set suggested end date when pattern changes
  React.useEffect(() => {
    if (values.recurrenceEndType === 'on' && values.recurrencePattern && !values.recurrenceEndDate) {
      const suggestedDate = getSuggestedEndDate();
      if (suggestedDate) {
        setFieldValue('recurrenceEndDate', suggestedDate);
      }
    }
  }, [values.recurrencePattern, values.recurrenceEndType, setFieldValue]);

  return (
    <div className="space-y-8">
      {/* Section Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">Payment Schedule</h2>
            <p className="mt-1 text-sm text-gray-600">Configure when and how often this payment should be processed.</p>
          </div>
        </div>
      </div>

      {/* Basic Schedule Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Scheduled Date */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <label className="block text-sm font-medium text-gray-700">
                Payment Date <span className="text-red-500">*</span>
              </label>
            </div>
            <Field name="scheduledFor">
              {({ field, form }: any) => (
                <div className="relative">
                  <Input
                    {...field}
                    type="date"
                    onFocus={(e: any) => e.target.showPicker?.()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      form.setFieldValue(field.name, e.target.value);
                      // Clear end date if it's now invalid
                      if (values.recurrenceEndType === 'on' && values.recurrenceEndDate) {
                        const endDate = new Date(values.recurrenceEndDate);
                        const newScheduledDate = new Date(e.target.value);
                        if (endDate <= newScheduledDate) {
                          form.setFieldValue('recurrenceEndDate', '');
                        }
                      }
                    }}
                    error={touched.scheduledFor && errors.scheduledFor}
                    min={new Date().toISOString().split('T')[0]}
                    fullWidth
                    required
                    className="pl-10"
                  />
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              )}
            </Field>
            <p className="text-xs text-gray-500 flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>Select the date when this payment should be inserted</span>
            </p>
          </div>

          {/* Recurring Toggle */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Repeat className="w-4 h-4 text-gray-500" />
              <label className="block text-sm font-medium text-gray-700">
                Recurring Payment
              </label>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <Field name="isRecurring">
                {({ field, form }: any) => (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Enable Recurring Payments</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Automatically create future payments based on a schedule
                      </div>
                    </div>
                    <Toggle
                      checked={field.value}
                      onChange={(checked) => form.setFieldValue('isRecurring', checked)}
                    />
                  </div>
                )}
              </Field>
            </div>
          </div>
        </div>
      </div>

      {/* Recurring Payment Configuration */}
      {values.isRecurring && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-white bg-opacity-60 border-b border-purple-200 px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Repeat className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recurring Configuration</h3>
                <p className="text-sm text-gray-600">Set up automatic payment scheduling</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Frequency Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <Clock className="w-4 h-4" />
                  <span>Repeat Frequency <span className="text-red-500">*</span></span>
                </label>
                <Field
                  as="select"
                  name="recurrencePattern"
                  className={`block w-full rounded-lg border ${
                    touched.recurrencePattern && errors.recurrencePattern
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
                  } shadow-sm sm:text-sm px-4 py-3 bg-white`}
                >
                  <option value="">Choose frequency...</option>
                  <option value="weekly">📅 Every Week</option>
                  <option value="monthly">🗓️ Every Month</option>
                  <option value="quarterly">📆 Every Quarter (3 months)</option>
                  <option value="yearly">🎯 Every Year</option>
                </Field>
                {touched.recurrencePattern && errors.recurrencePattern && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.recurrencePattern as string}</span>
                  </p>
                )}
              </div>

              {/* End Conditions */}
              <div className="space-y-3">
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <AlertCircle className="w-4 h-4" />
                  <span>When should the recurring payments end? <span className="text-red-500">*</span></span>
                </label>
                <Field
                  as="select"
                  name="recurrenceEndType"
                  className={`block w-full rounded-lg border ${
                    touched.recurrenceEndType && errors.recurrenceEndType
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-purple-500 focus:ring-purple-500'
                  } shadow-sm sm:text-sm px-4 py-3 bg-white`}
                >
                  <option value="never">🔄 Continue indefinitely (until manually stopped)</option>
                  <option value="after">🔢 End after a specific number of payments</option>
                  <option value="on">📅 End on a specific date</option>
                </Field>
                {touched.recurrenceEndType && errors.recurrenceEndType && (
                  <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.recurrenceEndType as string}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Conditional Fields Based on End Type Selection */}
            {values.recurrenceEndType === 'after' && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Number of payments
                </label>
                <div className="flex items-center space-x-3">
                  <Field
                    as={Input}
                    name="recurrenceEndAfter"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="5"
                    className="w-24 rounded-lg"
                    error={touched.recurrenceEndAfter && errors.recurrenceEndAfter}
                  />
                  <span className="text-sm text-gray-700 font-medium">payments total</span>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  The recurring payments will automatically stop after the specified number of occurrences.
                </p>
              </div>
            )}

            {values.recurrenceEndType === 'on' && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-start space-x-3 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900">End Date Configuration</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Set the final date when recurring payments should stop
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Date Input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      End date <span className="text-red-500">*</span>
                    </label>
                    <Field name="recurrenceEndDate">
                      {({ field, form }: any) => (
                        <div className="relative">
                          <Input
                            {...field}
                            type="date"
                            min={getMinEndDate()}
                            onFocus={(e: any) => e.target.showPicker?.()}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              form.setFieldValue(field.name, e.target.value);
                            }}
                            error={touched.recurrenceEndDate && errors.recurrenceEndDate}
                            className="rounded-lg w-full"
                            required
                            placeholder="Select end date"
                          />
                          <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </Field>
                  </div>

                  {/* Quick Date Suggestions */}
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-700">Quick suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const suggestions = [];
                        if (values.scheduledFor && values.recurrencePattern) {
                          const startDate = new Date(values.scheduledFor);
                          
                          // 3 months from start
                          const threeMonths = new Date(startDate);
                          threeMonths.setMonth(threeMonths.getMonth() + 3);
                          suggestions.push({
                            label: '3 months',
                            date: threeMonths.toISOString().split('T')[0],
                            description: 'Quarterly payments'
                          });

                          // 6 months from start
                          const sixMonths = new Date(startDate);
                          sixMonths.setMonth(sixMonths.getMonth() + 6);
                          suggestions.push({
                            label: '6 months',
                            date: sixMonths.toISOString().split('T')[0],
                            description: 'Semi-annual payments'
                          });

                          // 1 year from start
                          const oneYear = new Date(startDate);
                          oneYear.setFullYear(oneYear.getFullYear() + 1);
                          suggestions.push({
                            label: '1 year',
                            date: oneYear.toISOString().split('T')[0],
                            description: 'Annual payments'
                          });

                          // 2 years from start
                          const twoYears = new Date(startDate);
                          twoYears.setFullYear(twoYears.getFullYear() + 2);
                          suggestions.push({
                            label: '2 years',
                            date: twoYears.toISOString().split('T')[0],
                            description: 'Long-term payments'
                          });
                        }
                        return suggestions;
                      })().map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setFieldValue('recurrenceEndDate', suggestion.date)}
                          className="px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          <div className="font-medium text-gray-900">{suggestion.label}</div>
                          <div className="text-gray-500">{suggestion.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Validation and Status */}
                  <div className="space-y-2">
                    {values.recurrenceEndDate && values.scheduledFor ? (
                      <div className="space-y-2">
                        {/* Date Validation */}
                        {new Date(values.recurrenceEndDate) <= new Date(values.scheduledFor) ? (
                          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-red-800">Invalid end date</p>
                              <p className="text-red-600">End date must be after the scheduled start date</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-sm">
                              <p className="font-medium text-green-800">Valid end date</p>
                              <p className="text-green-600">
                                Payments will continue until {format(new Date(values.recurrenceEndDate), 'MMMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Payment Count Estimate */}
                        {values.recurrencePattern && new Date(values.recurrenceEndDate) > new Date(values.scheduledFor) && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Estimated payments:</span>
                              <span className="text-sm text-gray-900 font-semibold">
                                {(() => {
                                  const startDate = new Date(values.scheduledFor);
                                  const endDate = new Date(values.recurrenceEndDate);
                                  const diffTime = endDate.getTime() - startDate.getTime();
                                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                  
                                  let estimatedPayments = 1; // Include the first payment
                                  
                                  switch (values.recurrencePattern) {
                                    case 'weekly':
                                      estimatedPayments += Math.floor(diffDays / 7);
                                      break;
                                    case 'monthly':
                                      estimatedPayments += Math.floor(diffDays / 30);
                                      break;
                                    case 'quarterly':
                                      estimatedPayments += Math.floor(diffDays / 90);
                                      break;
                                    case 'yearly':
                                      estimatedPayments += Math.floor(diffDays / 365);
                                      break;
                                  }
                                  
                                  return estimatedPayments;
                                })()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Based on {values.recurrencePattern} frequency from {format(new Date(values.scheduledFor), 'MMM dd, yyyy')} to {format(new Date(values.recurrenceEndDate), 'MMM dd, yyyy')}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-amber-800">Select an end date</p>
                          <p className="text-amber-600">Choose when you want the recurring payments to stop</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Help Text */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> Recurring payments will stop after this date. Any scheduled payment after this date will not be processed. You can always modify or cancel recurring payments manually from the dashboard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {values.recurrenceEndType === 'never' && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">
                    Payments will continue indefinitely
                  </span>
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  You can stop or modify the recurring payments manually at any time from the scheduled payments dashboard.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringPaymentConfig; 