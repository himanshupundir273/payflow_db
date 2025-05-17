import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import { AlertCircle } from 'lucide-react';

interface QueryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void;
}

const QueryDialog: React.FC<QueryDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = () => {
    if (query.trim()) {
      onSubmit(query.trim());
      setQuery('');
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Raise Query"
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-shrink-0 mx-auto sm:mx-0">
            <div className="flex items-center justify-center w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-warning-50">
              <AlertCircle className="h-6 w-6 text-warning-600" />
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-gray-900">Query Details</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please provide detailed information about your query. This will help the requester understand and address your concerns effectively.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="query" className="block text-sm font-medium text-gray-700">
            Query Description
          </label>
          <textarea
            id="query"
            rows={4}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query details here..."
            className="block w-full rounded-lg border-gray-200 bg-gray-50 py-3 px-4 text-sm shadow-sm transition-colors focus:border-warning-500 focus:ring-1 focus:ring-warning-500 focus:bg-white min-h-[120px]"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium"
          >
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleSubmit}
            disabled={!query.trim()}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium"
          >
            Submit Query
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default QueryDialog; 