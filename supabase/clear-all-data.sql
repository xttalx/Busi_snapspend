-- Wipe ALL user data from Supabase (run once to remove old demo records).
-- Does not delete auth users. To remove users: Authentication → Users.

delete from expenses;
delete from clients;
delete from invoices;
delete from employees;
delete from paystubs;
delete from business_profiles;

-- Optional: clear all receipt files
delete from storage.objects where bucket_id = 'receipts';
