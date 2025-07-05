import React from 'react';
import { Field } from 'formik';
import Input from '../ui/Input';
import { convertToIndianWords } from '../../lib/numberToWords';
import { User } from '../../types';

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface PaymentDetailsFormProps {
  values: any;
  errors: any;
  touched: any;
  users: User[];
  companies: Company[];
  branches: Branch[];
  loadingUsers: boolean;
  isLoading: boolean;
  formatNumber: (value: string) => string;
}

const BANK_OPTIONS = ['HDFC Bank', 'ICICI Bank'];

const PaymentDetailsForm: React.FC<PaymentDetailsFormProps> = ({
  values,
  errors,
  touched,
  users,
  companies,
  branches,
  loadingUsers,
  isLoading,
  formatNumber,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Company */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company <span className="text-error-500">*</span>
          </label>
          <Field
            as="select"
            name="companyName"
            className={`block w-full rounded-md border ${
              touched.companyName && errors.companyName
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
            disabled={isLoading}
          >
            <option value="">Select Company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.code}>
                {company.code}
              </option>
            ))}
          </Field>
          {touched.companyName && errors.companyName && (
            <p className="mt-1 text-sm text-error-600">
              {errors.companyName as string}
            </p>
          )}
        </div>

        {/* Company Branch */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Branch <span className="text-error-500">*</span>
          </label>
          <Field
            as="select"
            name="companyBranch"
            className={`block w-full rounded-md border ${
              touched.companyBranch && errors.companyBranch
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
            disabled={isLoading}
          >
            <option value="">Select Branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.code}>
                {branch.code}
              </option>
            ))}
          </Field>
          {touched.companyBranch && errors.companyBranch && (
            <p className="mt-1 text-sm text-error-600">
              {errors.companyBranch as string}
            </p>
          )}
        </div>

        {/* Total Outstanding Amount */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Outstanding Amount
          </label>
          <Field name="totalOutstanding">
            {({ field, form }: any) => (
              <Input
                {...field}
                type="text"
                value={field.value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const formattedValue = formatNumber(e.target.value);
                  form.setFieldValue('totalOutstanding', formattedValue);
                }}
                onBlur={() => {
                  const numericValue = field.value.replace(/,/g, '');
                  if (numericValue && !isNaN(numericValue)) {
                    form.setFieldValue('totalOutstanding', formatNumber(numericValue));
                  }
                }}
                error={form.touched.totalOutstanding && form.errors.totalOutstanding}
                fullWidth
              />
            )}
          </Field>
        </div>

        {/* Bank Name */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name <span className="text-error-500">*</span>
          </label>
          <Field
            as="select"
            name="bankName"
            className={`block w-full rounded-md border ${
              touched.bankName && errors.bankName
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
          >
            <option value="">Select a bank</option>
            {BANK_OPTIONS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </Field>
          {touched.bankName && errors.bankName && (
            <p className="mt-1 text-sm text-error-600">
              {errors.bankName as string}
            </p>
          )}
        </div>

        {/* Payment Mode */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Mode <span className="text-error-500">*</span>
          </label>
          <Field
            as="select"
            name="paymentMode"
            className={`block w-full rounded-md border ${
              touched.paymentMode && errors.paymentMode
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
          >
            <option value="">Select payment mode</option>
            <option value="net_banking">Net Banking</option>
            <option value="upi">UPI</option>
          </Field>
          {touched.paymentMode && errors.paymentMode && (
            <p className="mt-1 text-sm text-error-600">
              {errors.paymentMode as string}
            </p>
          )}
        </div>

        {/* Urgency Level */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Urgency Level <span className="text-error-500">*</span>
          </label>
          <Field
            as="select"
            name="urgencyLevel"
            className={`block w-full rounded-md border ${
              touched.urgencyLevel && errors.urgencyLevel
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
          >
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="high">High</option>
          </Field>
          {touched.urgencyLevel && errors.urgencyLevel && (
            <p className="mt-1 text-sm text-error-600">
              {errors.urgencyLevel as string}
            </p>
          )}
        </div>

        {/* Pay Against */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pay Against <span className="text-error-500">*</span>
          </label>
          <Field
            as="select"
            name="advanceDetails"
            className={`block w-full rounded-md border ${
              touched.advanceDetails && errors.advanceDetails
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
          >
            <option value="tax_invoice">Tax Invoice</option>
            <option value="advance_(bill/PI)">Advance (Bill/PI)</option>
            <option value="advance">Advance</option>
            <option value="others">Others</option>
          </Field>
          {touched.advanceDetails && errors.advanceDetails && (
            <p className="mt-1 text-sm text-error-600">
              {errors.advanceDetails as string}
            </p>
          )}
        </div>

        {/* Payment Amount */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Amount <span className="text-error-500">*</span>
          </label>
          <div className="relative">
            <Field name="paymentAmount">
              {({ field, form }: any) => (
                <Input
                  {...field}
                  type="text"
                  value={field.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const formattedValue = formatNumber(e.target.value);
                    form.setFieldValue('paymentAmount', formattedValue);
                  }}
                  onBlur={() => {
                    const numericValue = field.value.replace(/,/g, '');
                    if (numericValue && !isNaN(numericValue)) {
                      form.setFieldValue('paymentAmount', formatNumber(numericValue));
                    }
                  }}
                  error={form.touched.paymentAmount && form.errors.paymentAmount}
                  fullWidth
                  required
                />
              )}
            </Field>
          </div>
          <p className="mt-1 text-sm text-gray-600 italic">
            {values.paymentAmount
              ? convertToIndianWords(Number(values.paymentAmount.replace(/,/g, '')))
              : ''}
          </p>
        </div>

        {/* Balance Amount */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Balance Amount
          </label>
          <Field
            as={Input}
            type="text"
            value={(() => {
              const totalOutstanding = Number(
                (values.totalOutstanding || '0').replace(/,/g, '')
              );
              const paymentAmount = Number(
                (values.paymentAmount || '0').replace(/,/g, '')
              );
              const balance = totalOutstanding - paymentAmount;
              return balance.toLocaleString('en-IN');
            })()}
            disabled
            fullWidth
          />
        </div>

        {/* Price Check Guaranteed By */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price Check Guaranteed By <span className="text-error-500">*</span>
          </label>
          <Field
            as="select"
            name="priceCheckGuaranteedBy"
            className={`block w-full rounded-md border ${
              touched.priceCheckGuaranteedBy && errors.priceCheckGuaranteedBy
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
            disabled={loadingUsers}
          >
            <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Field>
          {touched.priceCheckGuaranteedBy && errors.priceCheckGuaranteedBy && (
            <p className="mt-1 text-sm text-error-600">
              {errors.priceCheckGuaranteedBy as string}
            </p>
          )}
        </div>

        {/* Quantity Checked By */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity Checked By
          </label>
          <Field
            as="select"
            name="quantityCheckedBy"
            className={`block w-full rounded-md border ${
              touched.quantityCheckedBy && errors.quantityCheckedBy
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
            disabled={loadingUsers}
          >
            <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Field>
        </div>

        {/* Quality Checked By */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quality Checked By
          </label>
          <Field
            as="select"
            name="qualityCheckedBy"
            className={`block w-full rounded-md border ${
              touched.qualityCheckedBy && errors.qualityCheckedBy
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
            disabled={loadingUsers}
          >
            <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Field>
        </div>

        {/* Purchase Owner */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Purchase Owner
          </label>
          <Field
            as="select"
            name="purchaseOwner"
            className={`block w-full rounded-md border ${
              touched.purchaseOwner && errors.purchaseOwner
                ? 'border-error-300'
                : 'border-gray-300'
            } shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 bg-white`}
            disabled={loadingUsers}
          >
            <option value="">{loadingUsers ? 'Loading users...' : 'Select user'}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Field>
        </div>

        {/* Item Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Description <span className="text-error-500">*</span>
          </label>
          <Field
            as={Input}
            name="itemDescription"
            error={touched.itemDescription && errors.itemDescription}
            fullWidth
            required
          />
        </div>

        {/* Optional fields */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            LPR (Last Purchase Rate)
          </label>
          <Field
            as={Input}
            name="lpr"
            type="number"
            min="0"
            step="0.01"
            placeholder="Enter last purchase rate"
            error={touched.lpr && errors.lpr}
            fullWidth
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IOA (Internal Order Accounting)
          </label>
          <Field
            as={Input}
            name="ioa"
            placeholder="Enter internal order accounting"
            error={touched.ioa && errors.ioa}
            fullWidth
          />
        </div>

        <div className="flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CPP (Credit Payment Period)
          </label>
          <Field
            as={Input}
            name="cpp"
            type="number"
            min="0"
            placeholder="Enter credit payment period (days)"
            error={touched.cpp && errors.cpp}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailsForm; 