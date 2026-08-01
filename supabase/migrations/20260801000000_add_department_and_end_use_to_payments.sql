-- Add department and end_use fields to payments table
ALTER TABLE public.payments
ADD COLUMN department text,
ADD COLUMN end_use text;

COMMENT ON COLUMN public.payments.department IS 'Department that requested the payment';
COMMENT ON COLUMN public.payments.end_use IS 'End use / purpose of the payment';
