import React from 'react';
import Badge from '../ui/Badge';

interface PaymentStatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'query_raised';
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'approved':
      return <Badge variant="success">Approved</Badge>;
    case 'rejected':
      return <Badge variant="error">Rejected</Badge>;
    case 'processed':
      return <Badge variant="primary">Processed</Badge>;
    case 'query_raised':
      return <Badge variant="warning">Query Raised</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export default PaymentStatusBadge;