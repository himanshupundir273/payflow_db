import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({
      error: "Method not allowed. Use GET."
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  // 🔒 Authorization header check
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    );

    const utcNow = new Date();
    const today = new Date(utcNow.getFullYear(), utcNow.getMonth(), utcNow.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const { data: recurringPayments, error: fetchError } = await supabase
      .from("scheduled_payments")
      .select("*")
      .eq("is_recurring", true)
      .eq("schedule_status", "processed")
      .not("recurrence_pattern", "is", null)
      .gte("next_execution", today.toISOString())
      .lt("next_execution", tomorrow.toISOString());

    if (fetchError) {
      console.error("❌ Error fetching recurring payments:", fetchError.message);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: corsHeaders
      });
    }

    if (!recurringPayments || recurringPayments.length === 0) {
      return new Response(JSON.stringify({
        message: "No recurring payments to process.",
        processed: 0,
        timestamp: utcNow.toISOString(),
        failures: [],
        successful_ids: []
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    let processed = 0;
    const failures = [];
    const successfulIds = [];

    for (const sp of recurringPayments) {
      try {
        if (sp.recurrence_end_type === 'after' && sp.execution_count >= sp.recurrence_end_after) {
          console.log(`⏭️ Skipped ID ${sp.id} - reached max executions`);
          continue;
        }

        if (sp.recurrence_end_type === 'on' && sp.recurrence_end_date && new Date(sp.recurrence_end_date) <= utcNow) {
          console.log(`⏭️ Skipped ID ${sp.id} - past end date`);
          continue;
        }

        const { data: transactionResult, error: transactionError } = await supabase.rpc(
          'process_recurring_payment_transaction',
          {
            p_scheduled_payment_id: sp.id,
            p_vendor_name: sp.vendor_name,
            p_vendor_id: sp.vendor_id,
            p_total_outstanding: sp.total_outstanding,
            p_advance_details: sp.advance_details || 'others',
            p_payment_amount: sp.payment_amount,
            p_balance_amount: sp.balance_amount,
            p_item_description: sp.item_description,
            p_requested_by: sp.requested_by,
            p_company_name: sp.company_name,
            p_company_branch: sp.company_branch || '',
            p_bank_name: sp.bank_name || '',
            p_payment_mode: sp.payment_mode || 'net_banking',
            p_lpr: sp.lpr,
            p_ioa: sp.ioa,
            p_cpp: sp.cpp,
            p_quantity_checked_by: sp.quantity_checked_by,
            p_quality_checked_by: sp.quality_checked_by,
            p_purchase_owner: sp.purchase_owner,
            p_price_check_guaranteed_by: sp.price_check_guaranteed_by,
            p_category_id: sp.category_id,
            p_subcategory_id: sp.subcategory_id,
            p_execution_count: sp.execution_count || 0,
            p_processed_date: utcNow.toISOString()
          }
        );

        if (transactionError) {
          console.error(`❌ Transaction error for ID ${sp.id}:`, transactionError.message);
          failures.push({ id: sp.id, reason: `Transaction failed: ${transactionError.message}` });
          continue;
        }

        if (transactionResult && transactionResult.success) {
          processed++;
          successfulIds.push(sp.id);
          console.log(`✅ Successfully processed ID ${sp.id}`);
        } else {
          console.error(`❌ Transaction failed for ID ${sp.id}`);
          failures.push({ id: sp.id, reason: "Transaction returned failure" });
        }

      } catch (err) {
        console.error(`❌ Unexpected error for ID ${sp.id}:`, err);
        failures.push({ id: sp.id, reason: err instanceof Error ? err.message : "Unexpected error" });
      }
    }

    return new Response(JSON.stringify({
      message: "Recurring payments processing completed.",
      processed,
      successful_ids: successfulIds,
      failures,
      total_attempted: recurringPayments.length,
      timestamp: utcNow.toISOString()
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    console.error("🔥 Unexpected top-level error:", err);
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : "Unexpected error"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
