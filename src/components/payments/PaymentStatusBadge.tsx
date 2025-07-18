import React from 'react';
import Badge from '../ui/Badge';

interface PaymentStatusBadgeProps {
  status: 'accounts_approved' |
   'pending' | 'approved' | 'rejected' | 
   'processed' | 'query_raised' | 'cancelled';
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'approved':
      return <Badge variant="success">Approved</Badge>;
    case 'rejected':
      return <Badge variant="error">Rejected</Badge>;
    case 'cancelled':
      return <Badge variant="error">Cancelled</Badge>;
    case 'processed':
      return <Badge variant="primary">Processed</Badge>;
    case 'query_raised':
      return <Badge className='text-center' variant="warning">Query Raised</Badge>;
    case 'accounts_approved':
      return <Badge variant="success">Accounts Approved</Badge>;
    default:
      return <Badge variant="warning">Unknown</Badge>;
  }
};

export default PaymentStatusBadge;