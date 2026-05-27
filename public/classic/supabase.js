/* Supabase client bootstrap */
(function () {
  function isConfigured() {
    const c = window.SUPABASE_CONFIG;
    if (!c || !c.url || !c.anonKey) return false;
    if (c.url.includes("YOUR_PROJECT_REF")) return false;
    if (c.anonKey.includes("YOUR_SUPABASE_ANON_KEY")) return false;
    return true;
  }

  function getClient() {
    if (!isConfigured()) return null;
    if (!window.supabaseClient) {
      window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey
      );
    }
    return window.supabaseClient;
  }

  window.SnapSupabase = { isConfigured, getClient };
})();
