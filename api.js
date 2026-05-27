/* Supabase data layer — auth, CRUD, receipt uploads */
(function () {
  const DEFAULT_USER_BUSINESS = {
    name: "Your business",
    owner: "",
    email: "",
    address: "",
    country: "United States",
    currency: "USD ($)",
    terms: "Net 30",
    taxRate: 0.0875,
    fy: "January",
    invoiceFooter: "",
  };

  function sb() {
    return window.SnapSupabase.getClient();
  }

  function isEnabled() {
    return window.SnapSupabase.isConfigured() && !!sb();
  }

  function rowToEntity(row) {
    return row.data;
  }

  async function upsertEntity(table, userId, entity) {
    const { error } = await sb()
      .from(table)
      .upsert({ id: entity.id, user_id: userId, data: entity }, { onConflict: "id" });
    if (error) throw error;
  }

  async function deleteEntity(table, id) {
    const { error } = await sb().from(table).delete().eq("id", id);
    if (error) throw error;
  }

  async function fetchTable(table, userId) {
    const { data, error } = await sb()
      .from(table)
      .select("data")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToEntity);
  }

  function dataUrlToBlob(dataUrl) {
    const [header, body] = dataUrl.split(",");
    const mime = (header.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function uploadReceipt(userId, expenseId, receipt) {
    if (!receipt?.dataUrl || receipt.storagePath) return receipt;

    const ext = (receipt.name && receipt.name.split(".").pop()) || "bin";
    const path = `${userId}/${expenseId}/${Date.now()}.${ext}`;
    const blob = dataUrlToBlob(receipt.dataUrl);

    const { error } = await sb().storage.from("receipts").upload(path, blob, {
      contentType: receipt.type || blob.type,
      upsert: true,
    });
    if (error) throw error;

    return {
      name: receipt.name,
      type: receipt.type,
      size: receipt.size,
      storagePath: path,
    };
  }

  async function getReceiptUrl(storagePath) {
    const { data, error } = await sb()
      .storage.from("receipts")
      .createSignedUrl(storagePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  async function saveExpense(userId, expense) {
    let payload = { ...expense };
    if (payload.receipt) {
      payload = { ...payload, receipt: await uploadReceipt(userId, expense.id, payload.receipt) };
    }
    await upsertEntity("expenses", userId, payload);
    return payload;
  }

  async function saveBill(userId, bill) {
    let payload = { ...bill };
    if (payload.attachment?.dataUrl) {
      payload = {
        ...payload,
        attachment: await uploadReceipt(userId, `bill-${bill.id}`, payload.attachment),
      };
    }
    await upsertEntity("bills", userId, payload);
    return payload;
  }

  async function ensureBusinessProfile(userId, profileResult) {
    if (profileResult.data?.profile) return profileResult.data.profile;
    await sb().from("business_profiles").upsert({
      user_id: userId,
      profile: DEFAULT_USER_BUSINESS,
    });
    return DEFAULT_USER_BUSINESS;
  }

  async function fetchTableSafe(table, userId) {
    try {
      return await fetchTable(table, userId);
    } catch (error) {
      if (table === "bills") {
        console.warn("Bills table not found yet; run updated schema.sql migration.");
        return [];
      }
      throw error;
    }
  }

  async function fetchAllData(userId) {
    const [expenses, bills, clients, invoices, employees, paystubs, profileResult] = await Promise.all([
      fetchTable("expenses", userId),
      fetchTableSafe("bills", userId),
      fetchTable("clients", userId),
      fetchTable("invoices", userId),
      fetchTable("employees", userId),
      fetchTable("paystubs", userId),
      sb().from("business_profiles").select("profile").eq("user_id", userId).maybeSingle(),
    ]);

    const userBusiness = await ensureBusinessProfile(userId, profileResult);

    return {
      expenses,
      bills,
      clients,
      invoices,
      employees,
      paystubs,
      userBusiness,
    };
  }

  async function persistAction(userId, action, state) {
    switch (action.type) {
      case "ADD_EXPENSE":
        await saveExpense(userId, action.expense);
        break;
      case "UPDATE_EXPENSE":
        await saveExpense(userId, action.expense);
        break;
      case "REMOVE_EXPENSE":
        await deleteEntity("expenses", action.id);
        break;
      case "ADD_INVOICE":
      case "UPDATE_INVOICE":
        await upsertEntity("invoices", userId, action.invoice);
        break;
      case "ADD_BILL":
      case "UPDATE_BILL":
        await saveBill(userId, action.bill);
        break;
      case "REMOVE_BILL":
        await deleteEntity("bills", action.id);
        break;
      case "ADD_PAYSTUB":
        await upsertEntity("paystubs", userId, action.stub);
        break;
      case "ADD_EMPLOYEE":
      case "UPDATE_EMPLOYEE":
        await upsertEntity("employees", userId, action.employee);
        break;
      case "REMOVE_EMPLOYEE":
        await deleteEntity("employees", action.id);
        break;
      case "ADD_CLIENT":
      case "UPDATE_CLIENT":
        await upsertEntity("clients", userId, action.client);
        break;
      case "REMOVE_CLIENT":
        await deleteEntity("clients", action.id);
        break;
      case "UPDATE_USER_BUSINESS": {
        const profile = state?.userBusiness || action.profile;
        const { error } = await sb().from("business_profiles").upsert({
          user_id: userId,
          profile,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        break;
      }
      default:
        break;
    }
  }

  function createPersistDispatch(dispatch, getState, userId) {
    return (action) => {
      dispatch(action);
      if (!isEnabled() || !userId) return;
      persistAction(userId, action, getState()).catch((err) => {
        console.error("Snapspend sync failed:", err);
      });
    };
  }

  async function getSession() {
    if (!isEnabled()) return { session: null };
    const { data, error } = await sb().auth.getSession();
    if (error) throw error;
    return data;
  }

  function onAuthStateChange(callback) {
    if (!isEnabled()) return { data: { subscription: { unsubscribe: () => {} } } };
    return sb().auth.onAuthStateChange((_event, session) => callback(session));
  }

  async function signIn(email, password) {
    const { data, error } = await sb().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    const { data, error } = await sb().auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const { error } = await sb().auth.signOut();
    if (error) throw error;
  }

  window.SnapAPI = {
    isEnabled,
    getSession,
    onAuthStateChange,
    signIn,
    signUp,
    signOut,
    fetchAllData,
    saveExpense,
    saveBill,
    getReceiptUrl,
    createPersistDispatch,
  };
})();
