import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { Eye } from 'lucide-react';

interface PaymentExecution {
  id: string;
  payment_id: string;
  execution_date: string;
  execution_number: number;
  payment_amount: number;
  status: string;
}

const ScheduledPaymentExecutionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<PaymentExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExecutions = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('scheduled_payment_executions')
        .select('*')
        .eq('scheduled_payment_id', id)
        .order('execution_number', { ascending: true });
      if (error) {
        setError(error.message);
      } else {
        setExecutions(data || []);
      }
      setIsLoading(false);
    };
    if (id) fetchExecutions();
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">Back</Button>
      <Card className="shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Payment Executions</h2>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">{error}</div>
        ) : executions.length === 0 ? (
          <div className="text-center py-8">No executions found for this scheduled payment.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Execution #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Execution Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {executions.map(exec => (
                  <tr key={exec.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exec.execution_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {(() => { const d = new Date(exec.execution_date); return `${d.getDate().toString().padStart(2, '0')} ${(d.getMonth()+1).toString().padStart(2, '0')} ${d.getFullYear()}` })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Button
                        variant="outline"
                        className="inline-flex items-center px-3 py-2 rounded-lg text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 shadow-sm hover:shadow-md"
                        onClick={() => navigate(`/payments/${exec.payment_id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ScheduledPaymentExecutionsPage; 