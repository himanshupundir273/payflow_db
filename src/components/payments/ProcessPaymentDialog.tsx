import React, { useState, useEffect } from 'react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { CheckCircle2 } from 'lucide-react';

interface ProcessPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoiceReceived: 'yes' | 'no', paymentAmount: number, reason: string) => void;
  currentPaymentAmount: number;
}

const ProcessPaymentDialog: React.FC<ProcessPaymentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentPaymentAmount,
}) => {
  const [invoiceReceived, setInvoiceReceived] = useState<'yes' | 'no'>('no');
  const [paymentAmount, setPaymentAmount] = useState(currentPaymentAmount.toString());
  const [reason, setReason] = useState('');

  useEffect(() => {
    setPaymentAmount(currentPaymentAmount.toString());
    setReason('');
  }, [currentPaymentAmount]);

  const handleSubmit = () => {
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount >= 0) {
      onSubmit(invoiceReceived, amount, reason);
    }
  };

  const handleClose = () => {
    setInvoiceReceived('no');
    setPaymentAmount(currentPaymentAmount.toString());
    setReason('');
    onClose();
  };

  const isAmountChanged = parseFloat(paymentAmount) !== currentPaymentAmount;
  const isSubmitDisabled = !paymentAmount || 
    parseFloat(paymentAmount) < 0 || 
    (isAmountChanged && !reason.trim());

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Process Payment">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="flex items-center justify-center w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-primary-50">
              <CheckCircle2 className="h-6 w-6 text-primary-600" />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-gray-900">
              Process Payment Details
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Please review and confirm the payment details before processing.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="paymentAmount"
              className="block text-sm font-medium text-gray-700"
            >
              Payment Amount
            </label>
            <Input
              id="paymentAmount"
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter payment amount"
              fullWidth
            />
          </div>

          {isAmountChanged && (
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700"
              >
                Reason for Amount Change
              </label>
              <Input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for amount change"
                fullWidth
              />
            </div>
          )}

          <div>
            <label
              htmlFor="invoiceReceived"
              className="block text-sm font-medium text-gray-700"
            >
              Invoice Received
            </label>
            <select
              id="invoiceReceived"
              value={invoiceReceived}
              onChange={(e) =>
                setInvoiceReceived(e.target.value as 'yes' | 'no')
              }
              className="block w-full rounded-lg border-gray-200 bg-gray-50 py-3 px-4 text-sm shadow-sm transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:bg-white"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium"
          >
            Process Payment
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ProcessPaymentDialog;
