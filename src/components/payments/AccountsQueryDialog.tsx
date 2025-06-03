import React, { useState } from 'react';
import Button from '../ui/Button';
import { X, MessageSquare } from 'lucide-react';

interface AccountsQueryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void;
}

const AccountsQueryDialog: React.FC<AccountsQueryDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(query.trim());
      setQuery('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-medium text-gray-900">
              Raise Accounts Query
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label
              htmlFor="accountsQuery"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Query Details
            </label>
            <textarea
              id="accountsQuery"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your query details for this approved payment..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              rows={4}
              required
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              This query will be sent to the payment requester for
              clarification.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="warning"
              isLoading={isSubmitting}
              disabled={!query.trim() || isSubmitting}
              icon={<MessageSquare className="h-4 w-4" />}
            >
              Send Query
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountsQueryDialog;
