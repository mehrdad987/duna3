-- Admin Commands for TON Payment Management
-- Run these in Supabase SQL Editor to manage payments

-- 1. VIEW ALL PENDING PAYMENTS
SELECT * FROM get_pending_payments();

-- 2. APPROVE A SPECIFIC PAYMENT (replace X with payment ID)
-- SELECT approve_ton_payment(X);

-- 3. VIEW ALL PAYMENTS (COMPLETED AND PENDING)
SELECT 
    tp.id as payment_id,
    tp.user_id,
    u.telegram_id,
    u.username,
    tp.ton_amount,
    tp.duna_amount,
    tp.transaction_id,
    tp.withdrawal_address,
    tp.status,
    tp.created_at
FROM ton_payments tp
JOIN users u ON tp.user_id = u.id
ORDER BY tp.created_at DESC;

-- 4. VIEW USER BALANCES
SELECT 
    telegram_id,
    username,
    first_name,
    duna_coins,
    ton_balance,
    login_date
FROM users
ORDER BY login_date DESC;

-- 5. MANUALLY APPROVE ALL PENDING PAYMENTS (USE WITH CAUTION!)
-- DO NOT RUN THIS UNLESS YOU WANT TO APPROVE ALL PENDING PAYMENTS
/*
DO $$
DECLARE
    payment_rec RECORD;
BEGIN
    FOR payment_rec IN 
        SELECT id FROM ton_payments WHERE status = 'pending'
    LOOP
        PERFORM approve_ton_payment(payment_rec.id);
        RAISE NOTICE 'Approved payment ID: %', payment_rec.id;
    END LOOP;
END $$;
*/

-- 6. MANUALLY MARK PAYMENT AS FAILED (replace X with payment ID)
-- UPDATE ton_payments SET status = 'failed' WHERE id = X;

-- Example Usage:
-- Step 1: See pending payments
-- SELECT * FROM get_pending_payments();
-- 
-- Step 2: Approve payment with ID 1
-- SELECT approve_ton_payment(1);
--
-- Step 3: Verify user got the coins
-- SELECT telegram_id, username, duna_coins, ton_balance FROM users WHERE telegram_id = 12345;
