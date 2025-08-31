import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current timestamp
    const now = new Date().toISOString()

    // Find all postponed payments where postpone_date has passed
    const { data: postponedPayments, error: fetchError } = await supabase
      .from('payments')
      .select('id, postpone_date')
      .eq('status', 'postponed')
      .lte('postpone_date', now)

    if (fetchError) {
      console.error('Error fetching postponed payments:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch postponed payments' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!postponedPayments || postponedPayments.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No postponed payments to reactivate', count: 0 }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Reactivate all postponed payments
    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: 'pending',
        postpone_date: null,
        updated_at: now
      })
      .in('id', postponedPayments.map(p => p.id))

    if (updateError) {
      console.error('Error reactivating postponed payments:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to reactivate postponed payments' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully reactivated ${postponedPayments.length} postponed payments`)

    return new Response(
      JSON.stringify({ 
        message: 'Successfully reactivated postponed payments',
        count: postponedPayments.length,
        reactivatedIds: postponedPayments.map(p => p.id)
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
