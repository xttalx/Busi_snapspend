-- Wipe ALL user data from Supabase (run once to remove old demo records).
-- Does not delete auth users. To remove users: Authentication → Users.

delete from expenses;
delete from clients;
delete from invoices;
delete from employees;
delete from paystubs;
delete from business_profiles;

-- Receipt files cannot be deleted via SQL (Supabase blocks direct storage table writes).
-- To clear receipts instead:
--   Dashboard → Storage → receipts → select all → Delete
-- Or leave them — orphaned files do not show in the app after rows above are deleted.
