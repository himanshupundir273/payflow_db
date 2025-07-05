-- If your function has the original parameters (without urgency_level)
DROP FUNCTION IF EXISTS process_scheduled_payment_transaction(
    uuid, text, uuid, numeric, text, numeric, numeric, text, uuid, 
    text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, 
    uuid, uuid, boolean, integer, timestamp with time zone
);

-- Create function to process scheduled payment in a transaction
CREATE OR REPLACE FUNCTION process_scheduled_payment_transaction(
  p_scheduled_payment_id uuid,
  p_vendor_name text,
  p_vendor_id uuid,
  p_total_outstanding numeric,
  p_advance_details text,
  p_payment_amount numeric,
  p_balance_amount numeric,
  p_item_description text,
  p_requested_by uuid,
  p_company_name text,
  p_company_branch text,
  p_bank_name text,
  p_payment_mode text,
  p_lpr text,
  p_ioa text,
  p_cpp text,
  p_quantity_checked_by uuid,
  p_quality_checked_by uuid,
  p_purchase_owner uuid,
  p_price_check_guaranteed_by uuid,
  p_category_id uuid,
  p_subcategory_id uuid,
  p_urgency_level text,
  p_is_recurring boolean,
  p_execution_count integer,
  p_processed_date timestamp with time zone
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_new_execution_count integer;
  v_result json;
BEGIN
  -- Start transaction
  BEGIN
    -- Insert payment record
    INSERT INTO payments (
      date,
      vendor_name,
      vendor_id,
      total_outstanding,
      advance_details,
      payment_amount,
      balance_amount,
      item_description,
      requested_by,
      approved_by,
      company_name,
      company_branch,
      bank_name,
      payment_mode,
      status,
      query_details,
      accounts_query,
      accounts_verification_status,
      lpr,
      ioa,
      cpp,
      invoice_received,
      starting_amount,
      quantity_checked_by,
      quality_checked_by,
      purchase_owner,
      price_check_guaranteed_by,
      category_id,
      subcategory_id,
      urgency_level,
      amount_change_reason
    ) VALUES (
      p_processed_date,
      p_vendor_name,
      p_vendor_id,
      p_total_outstanding,
      p_advance_details,
      p_payment_amount,
      p_balance_amount,
      p_item_description,
      p_requested_by,
      null,
      p_company_name,
      p_company_branch,
      p_bank_name,
      p_payment_mode,
      'pending',
      null,
      null,
      'pending',
      p_lpr,
      p_ioa,
      p_cpp,
      null,
      null,
      p_quantity_checked_by,
      p_quality_checked_by,
      p_purchase_owner,
      p_price_check_guaranteed_by,
      p_category_id,
      p_subcategory_id,
      p_urgency_level,
      null
    ) RETURNING id INTO v_payment_id;

    -- Insert execution record
    INSERT INTO scheduled_payment_executions (
      scheduled_payment_id,
      payment_id,
      execution_date,
      execution_number
    ) VALUES (
      p_scheduled_payment_id,
      v_payment_id,
      p_processed_date,
      p_execution_count + 1
    );

    -- Update scheduled payment
    UPDATE scheduled_payments SET
      schedule_status = 'processed',
      payment_id = v_payment_id,
      promoted_date = p_processed_date,
      execution_count = p_execution_count + 1,
      last_execution_date = CASE 
        WHEN p_is_recurring THEN p_processed_date 
        ELSE last_execution_date 
      END
    WHERE id = p_scheduled_payment_id;

    -- Return success result
    v_result := json_build_object(
      'success', true,
      'payment_id', v_payment_id,
      'execution_number', p_execution_count + 1,
      'message', 'Scheduled payment processed successfully'
    );

    RETURN v_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback transaction (automatic in PostgreSQL functions)
      v_result := json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_code', SQLSTATE
      );
      
      RETURN v_result;
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_scheduled_payment_transaction TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION process_scheduled_payment_transaction IS 'Processes a scheduled payment by creating a payment record, execution record, and updating the scheduled payment status in a single transaction';