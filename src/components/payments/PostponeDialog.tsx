import React, { useState } from 'react';
import Dialog from '../ui/Dialog';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface PostponeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPostpone: (days: number) => void;
  isLoading?: boolean;
}

const PostponeDialog: React.FC<PostponeDialogProps> = ({
  isOpen,
  onClose,
  onPostpone,
  isLoading = false,
}) => {
  const [days, setDays] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const daysNumber = parseInt(days);
    if (daysNumber > 0) {
      onPostpone(daysNumber);
      setDays('');
    }
  };

  const handleClose = () => {
    setDays('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Postpone Payment"
    //   desc="Enter the number of days to postpone this payment"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Days
          </label>
          <Input
            id="days"
            type="number"
            min="1"
            max="365"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Enter number of days"
            required
            fullWidth
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="warning"
            disabled={isLoading || !days || parseInt(days) <= 0}
          >
            {isLoading ? 'Postponing...' : 'Postpone'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default PostponeDialog;
