import React from 'react';
import { useParams } from 'react-router-dom';
import PaymentRequestForm from '../components/payments/PaymentRequestForm';

const EditPaymentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return null;
  }
  
  return <PaymentRequestForm editingPaymentId={id} />;
};

export default EditPaymentPage; 