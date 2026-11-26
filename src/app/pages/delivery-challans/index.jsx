// Import Dependencies
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  DocumentCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  BuildingOffice2Icon,
  XMarkIcon,
  BanknotesIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { toast } from "sonner";
import clsx from "clsx";
import dayjs from "dayjs";

// UI Imports
import {
  Button,
  Card,
  Table,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  Spinner,
} from "components/ui";
import { Page } from "components/shared/Page";
import axios from "utils/axios";
import {
  generateDeliveryChallanPrintHtml,
  printDeliveryChallanIframe,
} from "./deliveryChallanPrintHtml";

// ----------------------------------------------------------------------

const INITIAL_ITEM = {
  srNo: 1,
  particulars: "Embroidery Job Work",
  qty: "",
  rate: "",
  amount: 0,
};

const INITIAL_FORM = {
  firmName: "Swastik Art",
  challanNo: "",
  pChallanNo: "",
  date: dayjs().format("YYYY-MM-DD"),
  merchantId: "",
  merchantName: "",
  merchantAddress: "",
  merchantCity: "Surat",
  merchantMobile: "",
  items: [
    {
      srNo: 1,
      particulars: "Embroidery Job Work",
      qty: 100,
      rate: 50,
      amount: 5000,
    },
  ],
  status: "Delivered",
  notes: "",
};

export default function DeliveryChallansPage() {
  // Data States
  const [challans, setChallans] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter States
  const [selectedFirm, setSelectedFirm] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [merchantFilter, setMerchantFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintChallan, setActivePrintChallan] = useState(null);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Fetch Merchants
  const fetchMerchants = useCallback(async () => {
    try {
      const res = await axios.get("/merchants");
      const list =
        res.data?.merchants ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);
      setMerchants(list);
    } catch (e) {
      console.warn("Error fetching merchants:", e);
    }
  }, []);

  // 2. Fetch Delivery Challans
  const fetchChallans = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);

      const params = {};
      if (selectedFirm !== "All") params.firm = selectedFirm;
      if (statusFilter !== "All") params.status = statusFilter;
      if (merchantFilter !== "All") params.merchantId = merchantFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (search && search.trim()) params.search = search.trim();

      try {
        const res = await axios.get("/delivery-challans", { params });
        if (res.data?.success) {
          setChallans(res.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching delivery challans:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedFirm, statusFilter, merchantFilter, startDate, endDate, search]
  );

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  // Overall Stats
  const stats = useMemo(() => {
    const totalCount = challans.length;
    const totalQty = challans.reduce((s, c) => s + (Number(c.totalQty) || 0), 0);
    const netAmount = challans.reduce((s, c) => s + (Number(c.netAmount) || 0), 0);
    const pendingBill = challans.filter((c) => c.status === "Pending Bill" || c.status === "Delivered").length;
    return { totalCount, totalQty, netAmount, pendingBill };
  }, [challans]);

  // Auto Next Challan No
  const fetchNextChallanNo = async (firm) => {
    try {
      const res = await axios.get("/delivery-challans/next-no", { params: { firm } });
      if (res.data?.success && res.data.nextChallanNo) {
        setFormData((prev) => ({ ...prev, challanNo: res.data.nextChallanNo }));
      }
    } catch (e) {
      console.warn("Could not fetch next challan no:", e);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    const defaultFirm = selectedFirm !== "All" ? selectedFirm : "Swastik Art";
    setFormData({
      ...INITIAL_FORM,
      firmName: defaultFirm,
      date: dayjs().format("YYYY-MM-DD"),
    });
    fetchNextChallanNo(defaultFirm);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c) => {
    setIsEditing(true);
    setEditingId(c._id);
    setFormData({
      firmName: c.firmName || "Swastik Art",
      challanNo: c.challanNo || "",
      pChallanNo: c.pChallanNo || "",
      date: c.date ? dayjs(c.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      merchantId: c.merchant || "",
      merchantName: c.merchantName || "",
      merchantAddress: c.merchantAddress || "",
      merchantCity: c.merchantCity || "Surat",
      merchantMobile: c.merchantMobile || "",
      items: c.items && c.items.length > 0 ? c.items : [INITIAL_ITEM],
      status: c.status || "Delivered",
      notes: c.notes || "",
    });
    setIsModalOpen(true);
  };

  // Handle Merchant Select
  const handleSelectMerchant = (mId) => {
    const found = merchants.find((m) => m._id === mId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        merchantId: mId,
        merchantName: found.name,
        merchantAddress: found.address || "",
        merchantCity: found.city || "Surat",
        merchantMobile: found.mobileNumber || found.mobile || "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, merchantId: mId }));
    }
  };

  // Handle Item Changes
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const current = { ...newItems[index], [field]: value };

    if (field === "qty" || field === "rate") {
      const q = field === "qty" ? Number(value) || 0 : Number(current.qty) || 0;
      const r = field === "rate" ? Number(value) || 0 : Number(current.rate) || 0;
      current.amount = q * r;
    }
    newItems[index] = current;
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          srNo: prev.items.length + 1,
          particulars: "Embroidery Job Work",
          qty: "",
          rate: "",
          amount: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    const filtered = formData.items.filter((_, i) => i !== index);
    const reindexed = filtered.map((it, i) => ({ ...it, srNo: i + 1 }));
    setFormData({ ...formData, items: reindexed });
  };

  // Form Totals Calculation
  const formTotals = useMemo(() => {
    const qty = (formData.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const amt = (formData.items || []).reduce((s, it) => s + (Number(it.amount) || 0), 0);
    return { qty, amt };
  }, [formData.items]);

  // Handle Save (Create / Update)
  const handleSaveChallan = async (e) => {
    e.preventDefault();
    if (!formData.merchantName || !formData.merchantName.trim()) {
      toast.error("કૃપા કરીને વેપારીનું નામ પસંદ કરો અથવા લખો!");
      return;
    }
    if (!formData.challanNo || !String(formData.challanNo).trim()) {
      toast.error("ચલાણ નંબર જરૂરી છે!");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await axios.put(`/delivery-challans/${editingId}`, formData);
        toast.success(`ચલાણ #${formData.challanNo} સફળતાપૂર્વક અપડેટ થયું!`);
      } else {
        await axios.post("/delivery-challans", formData);
        toast.success(`ચલાણ #${formData.challanNo} સફળતાપૂર્વક બની ગયું!`);
      }
      setIsModalOpen(false);
      fetchChallans(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "સેવ કરવામાં ભૂલ આવી");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleOpenDelete = (c) => {
    setChallanToDelete(c);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!challanToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`/delivery-challans/${challanToDelete._id}`);
      toast.success(`ચલાણ #${challanToDelete.challanNo} ડિલીટ થઈ ગયું!`);
      setIsDeleteModalOpen(false);
      setChallanToDelete(null);
      fetchChallans(true);
    } catch (err) {
      toast.error(err.message || "ડિલીટ કરવામાં ભૂલ આવી");
    } finally {
      setDeleting(false);
    }
  };

  // Handle Print
  const handleOpenPrint = (c) => {
    setActivePrintChallan(c);
    setIsPrintModalOpen(true);
  };

  const handlePrintNow = () => {
    if (!activePrintChallan) return;
    const html = generateDeliveryChallanPrintHtml(activePrintChallan);
    printDeliveryChallanIframe(html);
  };

  return (
    <Page title="ચલાણ મેનેજમેન્ટ (Delivery Challans)">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6 pb-12">
        {/* =================================================================== */}
        {/* HERO HEADER */}
        {/* =================================================================== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:bg-red-500/20">
                <DocumentCheckIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                  ચલાણ મેનેજમેન્ટ
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* <Link to="/dashboards/bills">
              <Button variant="outlined" color="primary" className="h-10 text-xs sm:text-sm">
                <BanknotesIcon className="h-4 w-4 mr-1.5" />
                બિલિંગ મોડ્યુલ (Bills)
              </Button>
            </Link> */}

            <Button
              variant="outlined"
              color="neutral"
              className="h-10 text-xs sm:text-sm"
              onClick={() => fetchChallans(true)}
              disabled={isRefreshing}
            >
              <ArrowPathIcon
                className={clsx("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")}
              />
              રીફ્રેશ
            </Button>

            <Button
              variant="filled"
              color="primary"
              className="h-10 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm"
              onClick={handleOpenCreate}
            >
              <PlusIcon className="h-4 w-4" />
              નવું ચલાણ બનાવો (Create Challan)
            </Button>

          </div>
        </div>

        {/* =================================================================== */}
        {/* STATS OVERVIEW CARDS */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="p-4 rounded-2xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                કુલ ચલાણ (CHALLANS)
              </span>
              <span className="p-2 rounded-xl bg-red-50 dark:bg-dark-600 text-red-600">
                <DocumentCheckIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalCount}
            </div>
            <span className="text-[11px] text-gray-400">કુલ સ્લિપ સંખ્યા</span>
          </Card>

          <Card className="p-4 rounded-2xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                કુલ જથ્થો (QTY / PCS)
              </span>
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-dark-600 text-blue-600">
                <DocumentDuplicateIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {stats.totalQty.toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-gray-400">મીટર / પીસ</span>
          </Card>

          <Card className="p-4 rounded-2xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                કુલ નેટ રકમ (NET AMOUNT)
              </span>
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-dark-600 text-emerald-600">
                <BanknotesIcon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-600 font-mono">
              ₹ {stats.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-gray-400">ચલાણ મુજબ રકમ</span>
          </Card>

          <Card className="p-4 rounded-2xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                બાકી બિલિંગ (PENDING BILL)
              </span>
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-dark-600 text-amber-600">
                <BuildingOffice2Icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 font-mono">
              {stats.pendingBill}
            </div>
            <span className="text-[11px] text-gray-400">બિલ બનાવવાનું બાકી</span>
          </Card>
        </div>

        {/* =================================================================== */}
        {/* FIRM SWITCHER & FILTERS */}
        {/* =================================================================== */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-semibold text-gray-400 mr-1">પેઢી:</span>
          <button
            type="button"
            onClick={() => setSelectedFirm("All")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              selectedFirm === "All"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-gray-300"
            )}
          >
            તમામ ફર્મ્સ (All)
          </button>
          <button
            type="button"
            onClick={() => setSelectedFirm("Swastik Art")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              selectedFirm === "Swastik Art"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-red-400" />
            Swastik Art
          </button>
          <button
            type="button"
            onClick={() => setSelectedFirm("Astha Fashion")}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
              selectedFirm === "Astha Fashion"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Astha Fashion
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-gray-100 dark:bg-dark-600 px-3.5 py-2 text-xs font-semibold text-gray-900 dark:text-white self-start">
            <DocumentCheckIcon className="h-4 w-4 text-red-500" />
            <span>ચલાણ લિસ્ટ ({challans.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-200 px-2.5 focus:outline-none"
            >
              <option value="All">તમામ સ્ટેટસ (All Status)</option>
              <option value="Delivered">Delivered (ડિલિવર્ડ)</option>
              <option value="Pending Bill">Pending Bill (બિલ બાકી)</option>
              <option value="Billed">Billed (બિલ બની ગયેલ)</option>
              <option value="Returned">Returned (પરત)</option>
            </select>

            {/* Merchant Filter */}
            <select
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
              className="h-9 text-xs rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-200 px-2.5 focus:outline-none max-w-[160px]"
            >
              <option value="All">તમામ વેપારી (All Merchants)</option>
              {merchants.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="વેપારી, ચલાણ નં, P.Ch.No..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-7 h-9 text-xs w-full bg-white dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-dark-700 px-2 py-1 rounded-xl border border-gray-200 dark:border-dark-600 text-xs">
              <span className="text-gray-400">તારીખ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-gray-900 dark:text-white focus:outline-none text-xs"
              />
              <span className="text-gray-400">થી</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-gray-900 dark:text-white focus:outline-none text-xs"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-gray-400 hover:text-red-500 ml-1"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TABLE */}
        {/* =================================================================== */}
        {loading && challans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner className="h-10 w-10 text-red-500" />
            <p className="mt-3 text-sm text-gray-500">ચલાણ ડેટા લોડ થઈ રહ્યો છે...</p>
          </div>
        ) : challans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark-600 p-12 text-center bg-white/50 dark:bg-dark-700/50">
            <DocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              કોઈ ડિલિવરી ચલાણ મળ્યું નથી
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              નવું ચલાણ બનાવવા માટે ઉપર આપેલ બટન પર ક્લિક કરો.
            </p>
            <Button variant="solid" color="error" className="mt-4 text-xs" onClick={handleOpenCreate}>
              + નવું ચલાણ બનાવો
            </Button>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-600 shadow-xs">
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <THead className="bg-gray-50 dark:bg-dark-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Tr>
                    <Th className="py-3 px-3 w-12 text-center">#</Th>
                    <Th className="py-3 px-4">ચલાણ નં (Ch.No)</Th>
                    <Th className="py-3 px-4">તારીખ</Th>
                    <Th className="py-3 px-4">પેઢી (Firm)</Th>
                    <Th className="py-3 px-4">વેપારી (M/s Party)</Th>
                    <Th className="py-3 px-4 text-center">P.Ch.No.</Th>
                    <Th className="py-3 px-4 text-center">જથ્થો (Qty)</Th>
                    <Th className="py-3 px-4 text-right">નેટ રકમ (Net)</Th>
                    <Th className="py-3 px-4 text-center">સ્ટેટસ</Th>
                    <Th className="py-3 px-4 text-center">એક્શન</Th>
                  </Tr>
                </THead>
                <TBody className="divide-y divide-gray-150 dark:divide-dark-600 text-xs">
                  {challans.map((c, idx) => (
                    <Tr key={c._id} className="hover:bg-gray-50/70 dark:hover:bg-dark-600/40">
                      <Td className="py-3 px-3 text-center text-gray-400 font-mono">{idx + 1}</Td>
                      <Td className="py-3 px-4 font-extrabold text-red-600 text-sm font-mono">
                        #{c.challanNo}
                      </Td>
                      <Td className="py-3 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {c.date ? dayjs(c.date).format("DD/MM/YYYY") : "-"}
                      </Td>
                      <Td className="py-3 px-4">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded-md text-[11px] font-bold",
                            c.firmName === "Swastik Art"
                              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          )}
                        >
                          {c.firmName}
                        </span>
                      </Td>
                      <Td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white">{c.merchantName}</div>
                        <div className="text-[11px] text-gray-400">{c.merchantCity || "Surat"}</div>
                      </Td>
                      <Td className="py-3 px-4 text-center font-mono font-semibold text-gray-600 dark:text-gray-300">
                        {c.pChallanNo || "-"}
                      </Td>
                      <Td className="py-3 px-4 text-center font-mono font-bold text-gray-900 dark:text-white">
                        {c.totalQty}
                      </Td>
                      <Td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                        ₹ {(c.netAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </Td>
                      <Td className="py-3 px-4 text-center">
                        <span
                          className={clsx(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold",
                            c.status === "Delivered" && "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                            c.status === "Pending Bill" && "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                            c.status === "Billed" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                            c.status === "Returned" && "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          )}
                        >
                          {c.status}
                        </span>
                      </Td>
                      <Td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Button */}
                          <Button
                            variant="soft"
                            color="primary"
                            className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1.5"
                            onClick={() => handleOpenPrint(c)}
                            title="ચલાણ પ્રિન્ટ (Print Slip)"
                          >
                            <PrinterIcon className="h-4 w-4" />
                            <span>પ્રિન્ટ</span>
                          </Button>

                          {/* Edit */}
                          <Button
                            variant="flat"
                            color="neutral"
                            isIcon
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                            onClick={() => handleOpenEdit(c)}
                            title="એડિટ (Edit)"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </Button>

                          {/* Delete */}
                          <Button
                            variant="flat"
                            color="neutral"
                            isIcon
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                            onClick={() => handleOpenDelete(c)}
                            title="ડિલીટ (Delete)"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          </Card>
        )}

        {/* =================================================================== */}
        {/* CREATE / EDIT DELIVERY CHALLAN MODAL */}
        {/* =================================================================== */}
        <Transition appear show={isModalOpen} as="div">
          <Dialog as="div" className="relative z-50" onClose={() => !submitting && setIsModalOpen(false)}>
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
                <TransitionChild
                  as="div"
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                  className="w-full max-w-3xl"
                >
                  <DialogPanel className="w-full transform rounded-2xl bg-white dark:bg-dark-700 p-5 sm:p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-dark-600">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-150 dark:border-dark-600">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 rounded-lg bg-red-500/10 text-red-600 flex items-center justify-center">
                          <DocumentCheckIcon className="h-5 w-5" />
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {isEditing ? `ડિલિવરી ચલાણ #${formData.challanNo} એડિટ કરો` : "નવું ડિલિવરી ચલાણ (New Delivery Challan)"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveChallan} className="mt-4 space-y-4">
                      {/* Row 1: Firm, Challan No, Date, P.Ch.No */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            પેઢી (Firm)
                          </label>
                          <select
                            value={formData.firmName}
                            onChange={(e) => {
                              const firm = e.target.value;
                              setFormData({ ...formData, firmName: firm });
                              if (!isEditing) fetchNextChallanNo(firm);
                            }}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none"
                          >
                            <option value="Swastik Art">Swastik Art</option>
                            <option value="Astha Fashion">Astha Fashion</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            ચલાણ નં (Ch.No.) *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.challanNo}
                            onChange={(e) => setFormData({ ...formData, challanNo: e.target.value })}
                            className="w-full h-9 text-xs font-bold text-red-600 rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 px-3 focus:outline-none"
                            placeholder="789"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            તારીખ (Date) *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            P.Ch.No. (Party Challan)
                          </label>
                          <input
                            type="text"
                            value={formData.pChallanNo}
                            onChange={(e) => setFormData({ ...formData, pChallanNo: e.target.value })}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none"
                            placeholder="પાર્ટી ચલાણ નં"
                          />
                        </div>
                      </div>

                      {/* Row 2: Merchant Selection, Address, City */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            વેપારી / પાર્ટી (M/s) *
                          </label>
                          <select
                            value={formData.merchantId}
                            onChange={(e) => handleSelectMerchant(e.target.value)}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none mb-1.5"
                          >
                            <option value="">-- લિસ્ટમાંથી વેપારી પસંદ કરો ({merchants.length}) --</option>
                            {merchants.map((m) => (
                              <option key={m._id} value={m._id}>
                                {m.name} {m.mobileNumber ? `(${m.mobileNumber})` : m.address ? `(${m.address})` : ""}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={formData.merchantName}
                            onChange={(e) => setFormData({ ...formData, merchantName: e.target.value })}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none"
                            placeholder="વેપારીનું નામ (M/s. Name) *"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            સરનામું (Address)
                          </label>
                          <textarea
                            rows={3}
                            value={formData.merchantAddress}
                            onChange={(e) => setFormData({ ...formData, merchantAddress: e.target.value })}
                            className="w-full text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 py-1.5 focus:outline-none resize-none"
                            placeholder="દુકાન નં, માર્કેટ, રોડ..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            શહેર (City) & મોબાઈલ
                          </label>
                          <input
                            type="text"
                            value={formData.merchantCity}
                            onChange={(e) => setFormData({ ...formData, merchantCity: e.target.value })}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none mb-1.5"
                            placeholder="શહેર (City e.g. Surat)"
                          />
                          <input
                            type="text"
                            value={formData.merchantMobile}
                            onChange={(e) => setFormData({ ...formData, merchantMobile: e.target.value })}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none"
                            placeholder="મોબાઈલ નંબર (Mobile No)"
                          />
                        </div>
                      </div>

                      {/* Items Table */}
                      <div className="border border-red-200 dark:border-dark-500 rounded-xl overflow-hidden mt-3">
                        <div className="bg-red-50 dark:bg-red-950/30 px-3 py-2 border-b border-red-200 dark:border-dark-500 flex items-center justify-between">
                          <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">
                            ચલાણ આઇટમ્સ વિગત (Particulars Grid)
                          </span>
                          <button
                            type="button"
                            onClick={handleAddItem}
                            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            + નવી લાઇન
                          </button>
                        </div>

                        <div className="p-2 space-y-2 max-h-56 overflow-y-auto">
                          {formData.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-6 text-center text-xs font-bold text-gray-400">{idx + 1}</span>
                              <input
                                type="text"
                                required
                                placeholder="Particulars (ડિઝાઇન / આઇટમ વિગત)"
                                value={item.particulars}
                                onChange={(e) => handleItemChange(idx, "particulars", e.target.value)}
                                className="flex-1 h-8 text-xs rounded-lg border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 px-2.5 focus:outline-none"
                              />
                              <input
                                type="number"
                                required
                                placeholder="Qty / Pcs"
                                value={item.qty}
                                onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                                className="w-24 h-8 text-xs text-center font-bold rounded-lg border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 px-2 focus:outline-none"
                              />
                              <input
                                type="number"
                                placeholder="Rate"
                                value={item.rate}
                                onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                className="w-20 h-8 text-xs text-right rounded-lg border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 px-2 focus:outline-none"
                              />
                              <div className="w-24 text-right text-xs font-bold font-mono text-emerald-600">
                                ₹ {Number(item.amount || 0).toFixed(2)}
                              </div>
                              {formData.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-gray-400 hover:text-red-500 p-1"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Summary Bar */}
                        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold">
                          <div>કુલ જથ્થો (TOTAL QTY): {formTotals.qty} Pcs</div>
                          <div>નેટ રકમ (NET AMOUNT): ₹ {formTotals.amt.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Status & Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            સ્ટેટસ (Status)
                          </label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none"
                          >
                            <option value="Delivered">Delivered (ડિલિવર થયેલ)</option>
                            <option value="Pending Bill">Pending Bill (બિલ બનાવવાનું બાકી)</option>
                            <option value="Billed">Billed (બિલ બની ગયેલ)</option>
                            <option value="Returned">Returned (પરત)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            નોંધ (Notes / Remarks)
                          </label>
                          <input
                            type="text"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full h-9 text-xs rounded-xl border border-gray-300 dark:border-dark-500 bg-white dark:bg-dark-600 text-gray-800 dark:text-white px-3 focus:outline-none"
                            placeholder="કોઈ ખાસ નોંધ..."
                          />
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="flex justify-end gap-2 pt-4 border-t border-gray-150 dark:border-dark-600">
                        <Button
                          type="button"
                          variant="outlined"
                          color="neutral"
                          onClick={() => setIsModalOpen(false)}
                          disabled={submitting}
                        >
                          રદ કરો (Cancel)
                        </Button>
                        <Button type="submit" variant="solid" color="error" disabled={submitting}>
                          {submitting ? "સેવ થઈ રહ્યું છે..." : isEditing ? "અપડેટ કરો" : "સેવ કરો (Save Challan)"}
                        </Button>
                      </div>
                    </form>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* =================================================================== */}
        {/* PRINT PREVIEW MODAL */}
        {/* =================================================================== */}
        <Transition appear show={isPrintModalOpen} as="div">
          <Dialog as="div" className="relative z-50" onClose={() => setIsPrintModalOpen(false)}>
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <TransitionChild
                  as="div"
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                  className="w-full max-w-3xl sm:max-w-4xl"
                >
                  <DialogPanel className="w-full transform rounded-2xl bg-white dark:bg-dark-700 p-4 sm:p-5 text-left align-middle shadow-2xl transition-all border border-gray-200 dark:border-dark-600">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-150 dark:border-dark-600">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600">
                          <PrinterIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            ચલાણ પ્રિન્ટ પ્રીવ્યૂ (#{activePrintChallan?.challanNo})
                          </h3>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {activePrintChallan?.firmName || "Swastik Art"} • {activePrintChallan?.merchantName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="solid"
                          color="error"
                          size="sm"
                          className="h-8 text-xs font-semibold px-3"
                          onClick={handlePrintNow}
                        >
                          <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                          પ્રિન્ટ (Print)
                        </Button>
                        <button
                          type="button"
                          onClick={() => setIsPrintModalOpen(false)}
                          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-600"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Clean Iframe Preview - 100% exact print preview without CSS bleed or internal scrollbars */}
                    <div className="my-2 rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-200/80 dark:bg-dark-900 p-2 flex justify-center overflow-auto max-h-[78vh]">
                      {activePrintChallan && (
                        <div className="w-full max-w-[760px] shadow-lg rounded overflow-hidden bg-white border border-gray-300">
                          <iframe
                            srcDoc={generateDeliveryChallanPrintHtml(activePrintChallan)}
                            title="Challan Print Preview (A4 Portrait - 2 Copies)"
                            className="w-full h-[76vh] min-h-[660px] border-0 block"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-150 dark:border-dark-600 text-xs text-gray-500">
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        📄 A4 પોટ્રેટ – ૨ ચલાણ કોપી (Top Half: First Copy | Bottom Half: Second Copy)
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outlined" color="neutral" size="sm" onClick={() => setIsPrintModalOpen(false)}>
                          બંધ કરો
                        </Button>
                        <Button variant="solid" color="error" size="sm" onClick={handlePrintNow}>
                          <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                          હમણાં પ્રિન્ટ કરો (Print)
                        </Button>
                      </div>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* =================================================================== */}
        {/* DELETE CONFIRMATION MODAL */}
        {/* =================================================================== */}
        <Transition appear show={isDeleteModalOpen} as="div">
          <Dialog as="div" className="relative z-50" onClose={() => !deleting && setIsDeleteModalOpen(false)}>
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <TransitionChild
                  as="div"
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                  className="w-full max-w-md"
                >
                  <DialogPanel className="w-full transform rounded-2xl bg-white dark:bg-dark-700 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-dark-600">
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                        <TrashIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">
                          ચલાણ ડિલીટ કરવું છે?
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          ચલાણ #{challanToDelete?.challanNo} ({challanToDelete?.merchantName}) કાયમ માટે ડિલીટ થઈ જશે.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                      <Button
                        variant="outlined"
                        color="neutral"
                        onClick={() => setIsDeleteModalOpen(false)}
                        disabled={deleting}
                      >
                        ના, રહેવા દો
                      </Button>
                      <Button variant="solid" color="error" onClick={handleConfirmDelete} disabled={deleting}>
                        {deleting ? "ડિલીટ થઈ રહ્યું છે..." : "હા, ડિલીટ કરો"}
                      </Button>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </Page>
  );
}
