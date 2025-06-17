

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."get_current_day_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    now_time TIMESTAMP WITH TIME ZONE;  -- Changed from current_time to avoid reserved keyword
    day_cutoff TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current time in IST
    now_time := CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
    
    -- If current time is before 6 PM, use previous day
    -- This ensures that funds are grouped by business day (6PM to 6PM)
    IF EXTRACT(HOUR FROM now_time) < 18 THEN
        day_cutoff := DATE_TRUNC('day', now_time) - INTERVAL '1 day';
    ELSE
        day_cutoff := DATE_TRUNC('day', now_time);
    END IF;
    
    RETURN TO_CHAR(day_cutoff, 'YYYY-MM-DD');
END;
$$;


ALTER FUNCTION "public"."get_current_day_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_payment_status_changes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO payment_history (payment_id, status, changed_by)
    VALUES (NEW.id, NEW.status, COALESCE(NEW.approved_by, NEW.requested_by));
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_payment_status_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "file_url" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "bill_number" "text" NOT NULL,
    "bill_date" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."bills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."funds" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "added_by" "uuid" NOT NULL,
    "day_id" "text" DEFAULT "public"."get_current_day_id"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."funds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payment_history_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'processed'::"text", 'query_raised'::"text"])))
);


ALTER TABLE "public"."payment_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "serial_number" bigint NOT NULL,
    "date" timestamp with time zone NOT NULL,
    "vendor_name" "text" NOT NULL,
    "total_outstanding" numeric NOT NULL,
    "payment_amount" numeric NOT NULL,
    "balance_amount" numeric NOT NULL,
    "item_description" "text" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "company_name" "text" NOT NULL,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "advance_details" "text",
    "query_details" "text",
    "bank_name" "text",
    "company_branch" "text",
    "lpr" "text",
    "ioa" "text",
    "cpp" "text",
    "invoice_received" "text",
    "accounts_query" "text",
    "payment_mode" "text",
    "starting_amount" numeric,
    CONSTRAINT "payments_payment_amount_check" CHECK (("payment_amount" >= (0)::numeric)),
    CONSTRAINT "payments_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'processed'::"text", 'query_raised'::"text"]))),
    CONSTRAINT "payments_total_outstanding_check" CHECK (("total_outstanding" >= (0)::numeric))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."lpr" IS 'Last Purchase Rate';



COMMENT ON COLUMN "public"."payments"."ioa" IS 'Internal Order Accounting';



COMMENT ON COLUMN "public"."payments"."cpp" IS 'Credit Payment Period';



COMMENT ON COLUMN "public"."payments"."accounts_query" IS 'Queries raised by Accounts';



ALTER TABLE "public"."payments" ALTER COLUMN "serial_number" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."payments_serial_number_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "company" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'admin'::"text", 'accounts'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "account_number" "text" NOT NULL,
    "ifsc_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."funds"
    ADD CONSTRAINT "funds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "unique_vendor_name_account" UNIQUE ("name", "account_number");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_attachments_payment_id" ON "public"."attachments" USING "btree" ("payment_id");



CREATE INDEX "idx_bills_bill_number" ON "public"."bills" USING "btree" ("bill_number");



CREATE INDEX "idx_bills_payment_id" ON "public"."bills" USING "btree" ("payment_id");



CREATE INDEX "idx_funds_day_id" ON "public"."funds" USING "btree" ("day_id");



CREATE OR REPLACE TRIGGER "track_payment_status" AFTER INSERT OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."track_payment_status_changes"();



CREATE OR REPLACE TRIGGER "update_attachments_updated_at" BEFORE UPDATE ON "public"."attachments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_bills_updated_at" BEFORE UPDATE ON "public"."bills" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_funds_updated_at" BEFORE UPDATE ON "public"."funds" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bills"
    ADD CONSTRAINT "bills_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."funds"
    ADD CONSTRAINT "funds_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payment_history"
    ADD CONSTRAINT "payment_history_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id");



CREATE POLICY "Accounts can process approved payments" ON "public"."payments" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'accounts'::"text")))) AND ("status" = 'approved'::"text")));



CREATE POLICY "Admins and Accounts can manage vendors" ON "public"."vendors" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE ((("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")) OR ("users"."role" = 'accounts'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE ((("users"."id" = "auth"."uid"()) AND ("users"."role" = 'admin'::"text")) OR ("users"."role" = 'accounts'::"text")))));



CREATE POLICY "Admins and accounts can delete bills" ON "public"."bills" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Admins and accounts can insert bills" ON "public"."bills" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Admins and accounts can update bills" ON "public"."bills" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Admins and accounts can view all bills" ON "public"."bills" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Admins can approve/reject payments" ON "public"."payments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Admins can insert payments" ON "public"."payments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Admins can update all payments" ON "public"."payments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Admins can view all payments" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))))));



CREATE POLICY "Allow accounts users to delete funds" ON "public"."funds" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'accounts'::"text")))));



CREATE POLICY "Allow accounts users to insert funds" ON "public"."funds" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'accounts'::"text")))));



CREATE POLICY "Allow accounts users to update funds" ON "public"."funds" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'accounts'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = 'accounts'::"text")))));



CREATE POLICY "Allow authenticated users to delete attachments" ON "public"."attachments" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert attachments" ON "public"."attachments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update attachments" ON "public"."attachments" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to view attachments" ON "public"."attachments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow viewing funds for authenticated users" ON "public"."funds" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "System can insert payment history" ON "public"."payment_history" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can create payments" ON "public"."payments" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'user'::"text"));



CREATE POLICY "Users can delete bills for their payments" ON "public"."bills" FOR DELETE USING (("payment_id" IN ( SELECT "payments"."id"
   FROM "public"."payments"
  WHERE ("payments"."requested_by" = "auth"."uid"()))));



CREATE POLICY "Users can insert bills for their payments" ON "public"."bills" FOR INSERT WITH CHECK (("payment_id" IN ( SELECT "payments"."id"
   FROM "public"."payments"
  WHERE ("payments"."requested_by" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own payments" ON "public"."payments" FOR INSERT WITH CHECK (("requested_by" = "auth"."uid"()));



CREATE POLICY "Users can update bills for their payments" ON "public"."bills" FOR UPDATE USING (("payment_id" IN ( SELECT "payments"."id"
   FROM "public"."payments"
  WHERE ("payments"."requested_by" = "auth"."uid"()))));



CREATE POLICY "Users can update their own payments" ON "public"."payments" FOR UPDATE USING (("requested_by" = "auth"."uid"()));


CREATE POLICY "Enable insert for admin and accounts users"
ON "public"."users"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM users users_1
    WHERE users_1.id = auth.uid()
    AND users_1.role IN ('admin', 'accounts')
  )
); 

CREATE POLICY "Users can view all payment history" ON "public"."payment_history" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view all payments" ON "public"."payments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view all users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view all vendors" ON "public"."vendors" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view bills for their payments" ON "public"."bills" FOR SELECT USING (("payment_id" IN ( SELECT "payments"."id"
   FROM "public"."payments"
  WHERE ("payments"."requested_by" = "auth"."uid"()))));



CREATE POLICY "Users can view payment history for their payments" ON "public"."payment_history" FOR SELECT TO "authenticated" USING ((("payment_id" IN ( SELECT "payments"."id"
   FROM "public"."payments"
  WHERE ("payments"."requested_by" = "auth"."uid"()))) OR (( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'accounts'::"text"]))));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT USING (("requested_by" = "auth"."uid"()));



ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bills" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."funds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."get_current_day_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_day_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_day_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_payment_status_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_payment_status_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_payment_status_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."bills" TO "anon";
GRANT ALL ON TABLE "public"."bills" TO "authenticated";
GRANT ALL ON TABLE "public"."bills" TO "service_role";



GRANT ALL ON TABLE "public"."funds" TO "anon";
GRANT ALL ON TABLE "public"."funds" TO "authenticated";
GRANT ALL ON TABLE "public"."funds" TO "service_role";



GRANT ALL ON TABLE "public"."payment_history" TO "anon";
GRANT ALL ON TABLE "public"."payment_history" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_history" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payments_serial_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payments_serial_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payments_serial_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























GRANT SELECT ON public.users TO authenticated;
GRANT INSERT ON public.users TO authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to view all users
CREATE POLICY "Anyone can view users"
ON public.users
FOR SELECT
TO public
USING (true);

-- Policy to allow only admin and accounts users to modify users
CREATE POLICY "Only admin and accounts can modify users"
ON public.users
FOR ALL
TO authenticated
USING (
  CASE 
    -- Allow if the user is modifying their own row (for initial creation)
    WHEN auth.uid() = id THEN true
    -- Otherwise check for admin/accounts role
    ELSE (auth.jwt() ->> 'role')::text IN ('admin', 'accounts')
  END
)
WITH CHECK (
  CASE 
    -- Allow if the user is modifying their own row (for initial creation)
    WHEN auth.uid() = id THEN true
    -- Otherwise check for admin/accounts role
    ELSE (auth.jwt() ->> 'role')::text IN ('admin', 'accounts')
  END
);



ALTER TABLE payments
ADD COLUMN quantity_checked_by UUID REFERENCES users(id),
ADD COLUMN quality_checked_by UUID REFERENCES users(id),
ADD COLUMN purchase_owner UUID REFERENCES users(id),
ADD COLUMN price_check_guaranteed_by UUID REFERENCES users(id);

-- Add indexes for better query performance
CREATE INDEX idx_payments_quantity_checked_by ON payments(quantity_checked_by);
CREATE INDEX idx_payments_quality_checked_by ON payments(quality_checked_by);
CREATE INDEX idx_payments_purchase_owner ON payments(purchase_owner);
CREATE INDEX idx_payments_price_check_guaranteed_by ON payments(price_check_guaranteed_by);

-- Add comments to document the purpose of each column
COMMENT ON COLUMN payments.quantity_checked_by IS 'User who verified the quantity of items';
COMMENT ON COLUMN payments.quality_checked_by IS 'User who verified the quality of items';
COMMENT ON COLUMN payments.purchase_owner IS 'User who owns the purchase process';
COMMENT ON COLUMN payments.price_check_guaranteed_by IS 'User who guaranteed the price check (required)';

RESET ALL;
