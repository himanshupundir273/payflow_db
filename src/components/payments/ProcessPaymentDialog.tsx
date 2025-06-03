import React, { useState, useEffect } from 'react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { CheckCircle2 } from 'lucide-react';

interface ProcessPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (invoiceReceived: 'yes' | 'no', paymentAmount: number) => void;
  currentPaymentAmount?: number;
}

const ProcessPaymentDialog: React.FC<ProcessPaymentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentPaymentAmount = 0,
}) => {
  const [invoiceReceived, setInvoiceReceived] = useState<'yes' | 'no'>('no');
  const [paymentAmount, setPaymentAmount] = useState(
    currentPaymentAmount.toString()
  );

  // Update payment amount when currentPaymentAmount prop changes
  useEffect(() => {
    if (currentPaymentAmount > 0) {
      setPaymentAmount(currentPaymentAmount.toString());
    }
  }, [currentPaymentAmount]);

  const handleSubmit = () => {
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount >= 0) {
      onSubmit(invoiceReceived, amount);
      setInvoiceReceived('no');
      setPaymentAmount(currentPaymentAmount.toString());
      onClose();
    }
  };

  const handleClose = () => {
    setInvoiceReceived('no');
    setPaymentAmount(currentPaymentAmount.toString());
    onClose();
  };

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
              Please confirm the payment amount and whether the invoice has been
              received before processing.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
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

          <div className="space-y-2">
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
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
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
            disabled={!paymentAmount || parseFloat(paymentAmount) < 0}
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
