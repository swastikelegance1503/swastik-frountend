// Import Dependencies
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import {
  DocumentTextIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PrinterIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  XMarkIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  CloudArrowUpIcon,
  FolderIcon,
  TableCellsIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { toast } from "sonner";
import clsx from "clsx";
import dayjs from "dayjs";

// UI Component Imports
import {
  Button,
  Card,
  Input,
  Select,
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
import { JWT_HOST_API } from "configs/auth.config";
import {
  generateBillPrintHtml,
  printChallanIframe,
  formatCurrency,
  formatDate,
} from "./billPrintHtml";
import { GOOGLE_APPS_SCRIPT_CODE } from "./googleDriveScriptCode";

// ----------------------------------------------------------------------

const INITIAL_ITEM = {
  srNo: 1,
  description: "",
  qty: "",
  rate: "",
  amount: 0,
};

const INITIAL_FORM = {
  firmName: "Astha Fashion",
  profileId: "",
  merchantId: "",
  merchantName: "",
  merchantAddress: "",
  merchantMobile: "",
  merchantGstin: "",
  stateCode: "24",
  billNo: "",
  bookNo: "1",
  challanNo: "",
  date: dayjs().format("YYYY-MM-DD"),
  dueDate: dayjs().add(30, "day").format("YYYY-MM-DD"),
  items: [
    {
      srNo: 1,
      description: "Embroidery Job Work",
      qty: 100,
      rate: 50,
      amount: 5000,
    },
  ],
  discount: 0,
  isGstApplicable: false,
  cgstRate: 2.5,
  sgstRate: 2.5,
  igstRate: 0,
  paymentWithinDays: 30,
  chequeNo: "",
  chequeDate: "",
  bankName: "",
  notes: "",
  status: "Pending",
};

export default function ChallansPage() {
  // Main Data States
  const [challans, setChallans] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Tab: 'list' | 'summary'
  const [activeTab, setActiveTab] = useState("list");

  // Filter States
  const [selectedFirm, setSelectedFirm] = useState("All");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Date Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Print Preview Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [activePrintChallan, setActivePrintChallan] = useState(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [challanToDelete, setChallanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Google Drive Settings State (swastikelegance065@gmail.com)
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveConfig, setDriveConfig] = useState({
    email: "swastikelegance065@gmail.com",
    webhookUrl: "",
    autoSync: true,
    isConfigured: false,
  });
  const [savingDriveConfig, setSavingDriveConfig] = useState(false);
  const [syncingAllDrive, setSyncingAllDrive] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // 1. Fetch Google Drive Settings
  const fetchDriveConfig = useCallback(async () => {
    try {
      const res = await axios.get("/challans/drive/config");
      if (res.data?.success && res.data.config) {
        setDriveConfig(res.data.config);
      }
    } catch (e) {
      console.warn("Drive config fetch warning:", e);
    }
  }, []);

  // 2. Fetch Challans
  const fetchChallans = useCallback((isRefresh) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    const params = {};
    if (selectedFirm !== "All") params.firm = selectedFirm;
    if (statusFilter !== "All") params.status = statusFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (search.trim()) params.search = search.trim();

    return axios
      .get("/challans", { params })
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.challans)) {
          setChallans(res.data.challans);
        }
      })
      .catch((err) => {
        console.error("Error fetching challans:", err);
        toast.error(err.message || "ચલાણ ડેટા મેળવવામાં ભૂલ આવી");
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  }, [selectedFirm, statusFilter, startDate, endDate, search]);

  // 3. Fetch Supporting Metadata (Profiles & Merchants)
  const fetchMeta = useCallback(async () => {
    try {
      const [profilesRes, merchantsRes] = await Promise.allSettled([
        axios.get("/profiles"),
        axios.get("/merchants"),
      ]);

      if (profilesRes.status === "fulfilled" && profilesRes.value.data?.profiles) {
        setProfiles(profilesRes.value.data.profiles);
      }
      if (merchantsRes.status === "fulfilled" && merchantsRes.value.data?.merchants) {
        setMerchants(merchantsRes.value.data.merchants);
      }
    } catch (e) {
      console.warn("Meta fetch error:", e);
    }
  }, []);

  // 3. Fetch Date-wise Summary
  const fetchDateSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = {};
      if (selectedFirm !== "All") params.firm = selectedFirm;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await axios.get("/challans/date-summary", { params });
      if (res.data?.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error("Error fetching date summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedFirm, startDate, endDate]);

  useEffect(() => {
    fetchMeta();
    fetchDriveConfig();
  }, [fetchMeta, fetchDriveConfig]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  useEffect(() => {
    if (activeTab === "summary") {
      fetchDateSummary();
    }
  }, [activeTab, fetchDateSummary]);

  // Overall Stats Calculation
  const stats = useMemo(() => {
    const totalBills = challans.length;
    const totalQty = challans.reduce((s, c) => s + (Number(c.totalQty) || 0), 0);
    const taxableAmount = challans.reduce(
      (s, c) => s + (Number(c.totalAmountBeforeTax) || 0),
      0,
    );
    const totalGst = challans.reduce((s, c) => s + (Number(c.totalGst) || 0), 0);
    const grandTotal = challans.reduce(
      (s, c) => s + (Number(c.grandTotal) || 0),
      0,
    );
    return { totalBills, totalQty, taxableAmount, totalGst, grandTotal };
  }, [challans]);

  // Quick Date Filter Presets
  const handleDatePreset = (preset) => {
    if (preset === "today") {
      const today = dayjs().format("YYYY-MM-DD");
      setStartDate(today);
      setEndDate(today);
    } else if (preset === "yesterday") {
      const yest = dayjs().subtract(1, "day").format("YYYY-MM-DD");
      setStartDate(yest);
      setEndDate(yest);
    } else if (preset === "month") {
      setStartDate(dayjs().startOf("month").format("YYYY-MM-DD"));
      setEndDate(dayjs().endOf("month").format("YYYY-MM-DD"));
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  // Google Drive Action Handlers (swastikelegance065@gmail.com)
  const handleSaveDriveConfig = async (e) => {
    if (e) e.preventDefault();
    setSavingDriveConfig(true);
    try {
      const res = await axios.post("/challans/drive/config", driveConfig);
      if (res.data?.success) {
        toast.success("Google Drive સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગઈ!");
        setDriveConfig(res.data.config);
      }
    } catch (err) {
      toast.error(err.message || "Google Drive સેટિંગ્સ સેવ કરવામાં ભૂલ આવી");
    } finally {
      setSavingDriveConfig(false);
    }
  };

  const handleSyncSingleToDrive = async (challanId) => {
    setSyncingId(challanId);
    try {
      const res = await axios.post(`/challans/${challanId}/sync-drive`);
      if (res.data?.success) {
        toast.success(res.data.message || "Google Drive માં સેવ થઈ ગયું!");
        setChallans((prev) =>
          prev.map((c) =>
            c._id === challanId
              ? {
                ...c,
                googleDriveSynced: true,
                googleDriveFileUrl: res.data.data?.fileUrl || c.googleDriveFileUrl,
              }
              : c,
          ),
        );
      } else {
        toast.error(res.data?.message || "સિંક કરવામાં ભૂલ આવી. કૃપા કરીને Webhook URL તપાસો.");
      }
    } catch (err) {
      toast.error(err.message || "Google Drive સિંકમાં ભૂલ આવી");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAllToDrive = async () => {
    setSyncingAllDrive(true);
    try {
      const res = await axios.post("/challans/drive/sync-all", { forceAll: true });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchChallans(true);
      } else {
        toast.error(res.data?.message || "બેચ સિંકમાં ભૂલ આવી");
      }
    } catch (err) {
      toast.error(err.message || "Google Drive સિંકમાં ભૂલ આવી");
    } finally {
      setSyncingAllDrive(false);
    }
  };

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    toast.success("Google Apps Script કોડ ક્લિપબોર્ડમાં કોપી થઈ ગયો!");
    setTimeout(() => setCopiedCode(false), 3000);
  };

  // Helper to compute next bill and challan numbers automatically
  const getNextNumbers = useCallback((firmName, allChallans) => {
    const isAstha = firmName && firmName.toLowerCase().includes("astha");
    const targetList = (allChallans || []).filter(
      (c) => !firmName || (c.firmName && c.firmName.toLowerCase() === firmName.toLowerCase())
    );
    const sourceList = targetList.length > 0 ? targetList : (allChallans || []);

    let maxBill = 0;
    let maxChallan = 0;

    for (const c of sourceList) {
      const b = parseInt(c.billNo, 10);
      if (!isNaN(b) && b > maxBill) maxBill = b;

      const ch = parseInt(c.challanNo, 10);
      if (!isNaN(ch) && ch > maxChallan) maxChallan = ch;
    }

    const defaultStart = isAstha ? 101 : 1;
    const nextBill = maxBill > 0 ? maxBill + 1 : defaultStart;
    const nextChallan = maxChallan > 0 ? maxChallan + 1 : nextBill;

    return {
      billNo: String(nextBill),
      challanNo: String(nextChallan),
    };
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);

    // Pick chosen firm or default profile
    const defaultProfile =
      profiles.find((p) => p.isDefault) || profiles[0] || null;
    const firmName = defaultProfile ? defaultProfile.firmName : "Swastik Art";
    const isSwastik = firmName.toLowerCase().includes("swastik");

    // Auto-generate next bill and challan numbers
    const { billNo, challanNo } = getNextNumbers(firmName, challans);

    setFormData({
      ...INITIAL_FORM,
      firmName,
      profileId: defaultProfile ? defaultProfile._id : "",
      billNo,
      challanNo,
      isGstApplicable: isSwastik, // Swastik Art defaults to GST
      items: [
        {
          srNo: 1,
          description: "Embroidery Job Work",
          qty: 100,
          rate: 50,
          amount: 5000,
        },
      ],
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c) => {
    setIsEditing(true);
    setEditingId(c._id);
    setFormData({
      firmName: c.firmName || "Astha Fashion",
      profileId: c.profile?._id || c.profile || "",
      merchantId: c.merchant?._id || c.merchant || "",
      merchantName: c.merchantName || "",
      merchantAddress: c.merchantAddress || "",
      merchantMobile: c.merchantMobile || "",
      merchantGstin: c.merchantGstin || "",
      stateCode: c.stateCode || "24",
      billNo: c.billNo || "",
      bookNo: c.bookNo || "",
      challanNo: c.challanNo || "",
      date: c.date ? dayjs(c.date).format("YYYY-MM-DD") : "",
      dueDate: c.dueDate ? dayjs(c.dueDate).format("YYYY-MM-DD") : "",
      items: Array.isArray(c.items) && c.items.length > 0 ? c.items : [INITIAL_ITEM],
      discount: c.discount || 0,
      isGstApplicable: Boolean(c.isGstApplicable),
      cgstRate: c.cgstRate || 2.5,
      sgstRate: c.sgstRate || 2.5,
      igstRate: c.igstRate || 0,
      paymentWithinDays: c.paymentDetails?.paymentWithinDays || 30,
      chequeNo: c.paymentDetails?.chequeNo || "",
      chequeDate: c.paymentDetails?.chequeDate
        ? dayjs(c.paymentDetails.chequeDate).format("YYYY-MM-DD")
        : "",
      bankName: c.paymentDetails?.bankName || "",
      notes: c.notes || "",
      status: c.status || "Pending",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Change Firm in Modal
  const handleSelectFirmInForm = (name) => {
    const prof = profiles.find((p) => p.firmName === name);
    const isSwastik = name.toLowerCase().includes("swastik");
    const { billNo, challanNo } = getNextNumbers(name, challans);

    setFormData((prev) => ({
      ...prev,
      firmName: name,
      profileId: prof ? prof._id : "",
      billNo: isEditing ? prev.billNo : billNo,
      challanNo: isEditing ? prev.challanNo : challanNo,
      isGstApplicable: isSwastik, // Swastik Art default to GST
    }));
  };

  // Select Merchant in Modal
  const handleSelectMerchantInForm = (merchantId) => {
    if (!merchantId) return;
    const m = merchants.find((x) => x._id === merchantId);
    if (m) {
      setFormData((prev) => ({
        ...prev,
        merchantId: m._id,
        merchantName: m.name || "",
        merchantAddress: m.address || "",
        merchantMobile: m.mobileNumber || "",
        merchantGstin: m.gstin || "",
      }));
    }
  };

  // Item Line Manipulation
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Auto-calculate amount when qty or rate changes
    if (field === "qty" || field === "rate") {
      const q = Number(newItems[index].qty) || 0;
      const r = Number(newItems[index].rate) || 0;
      newItems[index].amount = Number((q * r).toFixed(2));
    }

    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          srNo: prev.items.length + 1,
          description: "",
          qty: "",
          rate: "",
          amount: 0,
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) {
      toast.warning("ઓછામાં ઓછી એક આઇટમ હોવી જરૂરી છે");
      return;
    }
    const newItems = formData.items
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, srNo: idx + 1 }));
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  // Form Calculations Live Preview
  const formCalculations = useMemo(() => {
    const subTotal = formData.items.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0,
    );
    const totalQty = formData.items.reduce(
      (sum, item) => sum + (Number(item.qty) || 0),
      0,
    );
    const disc = Math.max(0, Number(formData.discount) || 0);
    const taxable = Math.max(0, subTotal - disc);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (formData.isGstApplicable) {
      const cRate = Number(formData.cgstRate) || 0;
      const sRate = Number(formData.sgstRate) || 0;
      const iRate = Number(formData.igstRate) || 0;

      cgst = Number(((taxable * cRate) / 100).toFixed(2));
      sgst = Number(((taxable * sRate) / 100).toFixed(2));
      igst = Number(((taxable * iRate) / 100).toFixed(2));
    }

    const totalGst = Number((cgst + sgst + igst).toFixed(2));
    const grandTotal = Number((taxable + totalGst).toFixed(2));

    return {
      subTotal,
      totalQty,
      taxable,
      cgst,
      sgst,
      igst,
      totalGst,
      grandTotal,
    };
  }, [formData]);

  // Validate and Submit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.merchantName.trim()) {
      errors.merchantName = "મર્ચન્ટ / વેપારીનું નામ જરૂરી છે";
    }
    if (!formData.merchantAddress.trim()) {
      errors.merchantAddress = "સરનામું જરૂરી છે";
    }
    if (!formData.billNo.trim()) {
      errors.billNo = "બિલ નંબર જરૂરી છે";
    }

    // Check items
    const validItems = formData.items.filter(
      (item) => (item.description || "").trim() && Number(item.qty) > 0,
    );
    if (validItems.length === 0) {
      errors.items = "ઓછામાં ઓછી એક માન્ય આઇટમ ઉમેરો (વિગત અને ક્વોન્ટિટી સાથે)";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("કૃપા કરીને ફોર્મની જરૂરી વિગતો ભરો");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firmName: formData.firmName,
        profileId: formData.profileId || undefined,
        merchantId: formData.merchantId || undefined,
        merchantName: formData.merchantName.trim(),
        merchantAddress: formData.merchantAddress.trim(),
        merchantMobile: formData.merchantMobile.trim(),
        merchantGstin: formData.merchantGstin.trim().toUpperCase(),
        stateCode: formData.stateCode.trim() || "24",
        billNo: formData.billNo.trim(),
        bookNo: formData.bookNo.trim(),
        challanNo: formData.challanNo.trim() || formData.billNo.trim(),
        date: formData.date ? new Date(formData.date) : new Date(),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        items: validItems.map((item, idx) => ({
          srNo: idx + 1,
          description: item.description.trim(),
          qty: Number(item.qty),
          rate: Number(item.rate),
          amount: Number(item.amount),
        })),
        discount: Number(formData.discount) || 0,
        isGstApplicable: Boolean(formData.isGstApplicable),
        cgstRate: Number(formData.cgstRate) || 0,
        sgstRate: Number(formData.sgstRate) || 0,
        igstRate: Number(formData.igstRate) || 0,
        paymentDetails: {
          paymentWithinDays: Number(formData.paymentWithinDays) || 0,
          chequeNo: formData.chequeNo.trim(),
          chequeDate: formData.chequeDate ? new Date(formData.chequeDate) : undefined,
          bankName: formData.bankName.trim(),
        },
        notes: formData.notes.trim(),
        status: formData.status || "Pending",
      };

      if (isEditing) {
        await axios.put(`/challans/${editingId}`, payload);
        toast.success("ચલાણ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
      } else {
        const res = await axios.post("/challans", payload);
        toast.success("નવું ચલાણ / બિલ સફળતાપૂર્વક બની ગયું!");
        // Ask or show print modal
        if (res.data?.challan) {
          setActivePrintChallan(res.data.challan);
          setIsPrintModalOpen(true);
        }
      }

      setIsModalOpen(false);
      await fetchChallans();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.message || "ચલાણ સેવ કરવામાં ભૂલ આવી");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Update
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.put(`/challans/${id}`, { status: newStatus });
      toast.success(`સ્ટેટસ "${newStatus}" થઈ ગયું!`);
      setChallans((prev) =>
        prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c)),
      );
    } catch (err) {
      console.error("Status update error:", err);
      toast.error("સ્ટેટસ અપડેટ કરવામાં નિષ્ફળતા");
    }
  };

  // Open Print Modal
  const handleOpenPrint = (challan) => {
    setActivePrintChallan(challan);
    setIsPrintModalOpen(true);
  };

  // Trigger 1-Click Print
  const handlePrintNow = () => {
    if (!activePrintChallan) return;
    const html = generateBillPrintHtml(activePrintChallan);
    printChallanIframe(html);
  };

  // Delete Action
  const handleOpenDelete = (c) => {
    setChallanToDelete(c);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!challanToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`/challans/${challanToDelete._id}`);
      toast.success(`બિલ #${challanToDelete.billNo} સફળતાપૂર્વક ડિલીટ થઈ ગયું!`);
      setIsDeleteModalOpen(false);
      setChallanToDelete(null);
      await fetchChallans();
    } catch (err) {
      toast.error(err.message || "ડિલીટ કરવામાં ભૂલ આવી");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Page title="ચલાણ & બિલિંગ (Challans & Bills)">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6 pb-12">
        {/* =================================================================== */}
        {/* HERO HEADER */}
        {/* =================================================================== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                  ચલાણ & બિલિંગ મેનેજમેન્ટ
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    (Challans & Bills)
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  સ્વસ્તિક આર્ટ અને આસ્થા ફેશન પેઢી મુજબ બિલિંગ, પ્રિન્ટ, PDF અને તારીખ મુજબ હિસાબ
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Drive Sync Settings Button */}
            <Button
              variant={driveConfig.isConfigured ? "soft" : "outlined"}
              color={driveConfig.isConfigured ? "success" : "warning"}
              className="h-10 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs"
              onClick={() => setIsDriveModalOpen(true)}
              title="Google Drive (swastikelegance065@gmail.com) ઓટો-સેવ સેટિંગ્સ"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              <span>Google Drive</span>
              {driveConfig.isConfigured ? (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1 py-0.2 rounded font-normal">
                  સેટઅપ
                </span>
              )}
            </Button>

            <Link to="/dashboards/home">
              <Button variant="outlined" color="neutral" className="h-10 text-xs sm:text-sm">
                <BuildingOffice2Icon className="h-4 w-4 mr-1.5" />
                ફર્મ પ્રોફાઇલ (Profiles)
              </Button>
            </Link>

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
              className="h-10 text-xs sm:text-sm shadow-sm"
              onClick={handleOpenCreate}
            >
              <PlusIcon className="h-4 w-4 mr-1.5 stroke-[2.5]" />
              નવું ચલાણ / બિલ બનાવો (Create Bill)
            </Button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* STATS SUMMARY METRIC CARDS */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 mb-6">
          {/* Card 1: Total Bills */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  કુલ બિલો (Bills)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalBills}
                </h3>
                <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-400">
                  ચલાણ સંખ્યા
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <DocumentTextIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Card 2: Total Qty */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  કુલ ક્વોન્ટિટી (Qty)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalQty}
                </h3>
                <p className="mt-0.5 text-xs text-indigo-600 dark:text-indigo-400">
                  મીટર / પીસ
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <BanknotesIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Card 3: Taxable Turnover */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  કરપાત્ર રકમ (Taxable)
                </p>
                <h3 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  ₹ {formatCurrency(stats.taxableAmount)}
                </h3>
                <p className="mt-0.5 text-xs text-purple-600 dark:text-purple-400">
                  ડિસ્કાઉન્ટ બાદ
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <BanknotesIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Card 4: Total GST */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  કુલ GST રકમ
                </p>
                <h3 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  ₹ {formatCurrency(stats.totalGst)}
                </h3>
                <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                  CGST + SGST + IGST
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <BanknotesIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>

          {/* Card 5: Grand Total */}
          <Card className="col-span-2 lg:col-span-1 p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  કુલ રકમ (Grand Total)
                </p>
                <h3 className="mt-1 text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 truncate">
                  ₹ {formatCurrency(stats.grandTotal)}
                </h3>
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-300">
                  કુલ નેટ બિલિંગ
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* =================================================================== */}
        {/* FIRM SELECTOR PILLS */}
        {/* =================================================================== */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase text-gray-400 mr-1 flex items-center gap-1">
            <BuildingOffice2Icon className="h-3.5 w-3.5" /> ફર્મ ફિલ્ટર:
          </span>

          <button
            type="button"
            onClick={() => setSelectedFirm("All")}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all",
              selectedFirm === "All"
                ? "bg-gray-900 text-white shadow-sm dark:bg-white dark:text-gray-900"
                : "bg-white text-gray-700 hover:bg-gray-100 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600 border border-gray-200 dark:border-dark-600",
            )}
          >
            તમામ ફર્મ્સ (All Firms)
          </button>

          <button
            type="button"
            onClick={() => setSelectedFirm("Swastik Art")}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
              selectedFirm === "Swastik Art"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white text-gray-700 hover:bg-red-50 dark:bg-dark-700 dark:text-gray-300 border border-gray-200 dark:border-dark-600",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
            Swastik Art (GST બિલ)
          </button>

          <button
            type="button"
            onClick={() => setSelectedFirm("Astha Fashion")}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5",
              selectedFirm === "Astha Fashion"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-gray-700 hover:bg-emerald-50 dark:bg-dark-700 dark:text-gray-300 border border-gray-200 dark:border-dark-600",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
            Astha Fashion (PAN / નોન-GST)
          </button>
        </div>

        {/* =================================================================== */}
        {/* TABS & CONTROLS TOOLBAR */}
        {/* =================================================================== */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
          {/* Tabs */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-dark-600 self-start">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeTab === "list"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              <DocumentTextIcon className="h-4 w-4" />
              ચલાણ / બિલ લિસ્ટ ({challans.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all",
                activeTab === "summary"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              <CalendarDaysIcon className="h-4 w-4" />
              તારીખ મુજબ હિસાબ (Date-wise Summary)
            </button>
          </div>

          {/* Date & Search Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-xl border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-200 px-2.5 focus:outline-none"
            >
              <option value="All">તમામ સ્ટેટસ (All Status)</option>
              <option value="Pending">Pending (બાકી)</option>
              <option value="Paid">Paid (ચૂકતે)</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Search */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="વેપારી, બિલ નં, મોબાઇલ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-7 h-9 text-xs w-full bg-white dark:bg-dark-700 rounded-xl border border-gray-200 dark:border-dark-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
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

            {/* Date Range Inputs */}
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
                  className="text-gray-400 hover:text-error ml-1"
                  title="તારીખ ફિલ્ટર સાફ કરો"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Date Presets */}
            <div className="hidden sm:flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleDatePreset("today")}
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300"
              >
                આજે
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset("month")}
                className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-700 dark:text-gray-300"
              >
                આ મહિને
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: CHALLANS LIST TABLE */}
        {/* =================================================================== */}
        {activeTab === "list" && (
          <>
            {loading && challans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Spinner className="h-10 w-10 text-primary-500" />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  ચલાણ ડેટા લોડ થઈ રહ્યો છે...
                </p>
              </div>
            ) : challans.length === 0 ? (
              /* Empty State */
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark-600 p-12 text-center bg-white/50 dark:bg-dark-700/50">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  કોઈ ચલાણ / બિલ મળ્યું નથી
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedFirm !== "All" || search || startDate
                    ? "પસંદ કરેલા ફિલ્ટર માટે કોઈ રેકોર્ડ નથી."
                    : "હજુ સુધી કોઈ બિલ બનેલ નથી. નવું બિલ બનાવવા માટે નીચેનું બટન દબાવો."}
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button variant="filled" color="primary" onClick={handleOpenCreate}>
                    <PlusIcon className="h-4 w-4 mr-1.5" /> નવું ચલાણ બનાવો
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-600">
                <div className="overflow-x-auto">
                  <Table className="w-full text-left">
                    <THead className="bg-gray-50 dark:bg-dark-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <Tr>
                        <Th className="py-3.5 px-3 font-semibold text-center">#</Th>
                        <Th className="py-3.5 px-3 font-semibold">બિલ & ચલાણ નં</Th>
                        <Th className="py-3.5 px-3 font-semibold">તારીખ</Th>
                        <Th className="py-3.5 px-3 font-semibold">પેઢી (Firm)</Th>
                        <Th className="py-3.5 px-4 font-semibold">મર્ચન્ટ / વેપારી</Th>
                        <Th className="py-3.5 px-3 font-semibold text-center">આઇટમ્સ / જથ્થો</Th>
                        <Th className="py-3.5 px-3 font-semibold">GST વિગત</Th>
                        <Th className="py-3.5 px-4 font-semibold text-right">કુલ રકમ (Total)</Th>
                        <Th className="py-3.5 px-3 font-semibold text-center">સ્ટેટસ</Th>
                        <Th className="py-3.5 px-3 font-semibold text-center">Google Drive</Th>
                        <Th className="py-3.5 px-4 font-semibold text-right">એક્શન્સ</Th>
                      </Tr>
                    </THead>
                    <TBody className="divide-y divide-gray-150 dark:divide-dark-600 text-sm">
                      {challans.map((c, idx) => {
                        const isSwastik = c.firmName?.toLowerCase().includes("swastik");
                        return (
                          <Tr
                            key={c._id}
                            className="transition-colors hover:bg-gray-50/70 dark:hover:bg-dark-600/40"
                          >
                            <Td className="py-4 px-3 text-center font-mono text-xs text-gray-400">
                              {idx + 1}
                            </Td>

                            {/* Bill & Challan No */}
                            <Td className="py-4 px-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-base font-mono text-gray-900 dark:text-white">
                                  #{c.billNo}
                                </span>
                                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                  {c.bookNo && <span>Book: {c.bookNo}</span>}
                                  {c.challanNo && <span>Ch: {c.challanNo}</span>}
                                </div>
                              </div>
                            </Td>

                            {/* Date */}
                            <Td className="py-4 px-3 whitespace-nowrap text-xs text-gray-700 dark:text-gray-300">
                              <span className="font-medium">{formatDate(c.date)}</span>
                            </Td>

                            {/* Firm */}
                            <Td className="py-4 px-3 whitespace-nowrap">
                              <span
                                className={clsx(
                                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                                  isSwastik
                                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-500/20"
                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-500/20",
                                )}
                              >
                                {c.firmName}
                              </span>
                            </Td>

                            {/* Merchant */}
                            <Td className="py-4 px-4 max-w-xs">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-white truncate">
                                  {c.merchantName}
                                </span>
                                {c.merchantMobile && (
                                  <span className="text-[11px] text-gray-500 font-mono">
                                    Mo: {c.merchantMobile}
                                  </span>
                                )}
                                {c.merchantAddress && (
                                  <span className="text-[11px] text-gray-400 truncate">
                                    {c.merchantAddress}
                                  </span>
                                )}
                              </div>
                            </Td>

                            {/* Items / Qty */}
                            <Td className="py-4 px-3 text-center whitespace-nowrap">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {c.totalQty}
                              </span>
                              <span className="text-[11px] text-gray-400 block">
                                {Array.isArray(c.items) ? c.items.length : 0} આઇટમ્સ
                              </span>
                            </Td>

                            {/* GST */}
                            <Td className="py-4 px-3 whitespace-nowrap text-xs">
                              {c.isGstApplicable && Number(c.totalGst) > 0 ? (
                                <div className="flex flex-col">
                                  <span className="text-emerald-600 font-semibold font-mono">
                                    ₹ {formatCurrency(c.totalGst)}
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    CGST {c.cgstRate || 2.5}% + SGST {c.sgstRate || 2.5}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px] italic">
                                  GST લાગુ નથી
                                </span>
                              )}
                            </Td>

                            {/* Grand Total */}
                            <Td className="py-4 px-4 whitespace-nowrap text-right">
                              <span className="font-bold text-base text-gray-900 dark:text-white font-mono">
                                ₹ {formatCurrency(c.grandTotal)}
                              </span>
                            </Td>

                            {/* Status */}
                            <Td className="py-4 px-3 text-center whitespace-nowrap">
                              <select
                                value={c.status || "Pending"}
                                onChange={(e) => handleUpdateStatus(c._id, e.target.value)}
                                className={clsx(
                                  "text-xs font-semibold rounded-lg px-2 py-1 border-0 cursor-pointer focus:ring-1",
                                  c.status === "Paid"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : c.status === "Partially Paid"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                      : c.status === "Cancelled"
                                        ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                                        : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
                                )}
                              >
                                <option value="Pending">Pending (બાકી)</option>
                                <option value="Paid">Paid (ચૂકતે)</option>
                                <option value="Partially Paid">Partially (અંશતઃ)</option>
                                <option value="Cancelled">Cancelled (રદ)</option>
                              </select>
                            </Td>

                            {/* Google Drive Sync Status */}
                            <Td className="py-4 px-3 text-center whitespace-nowrap">
                              {c.googleDriveSynced ? (
                                c.googleDriveFileUrl ? (
                                  <a
                                    href={c.googleDriveFileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                                    title="Google Drive માં ફાઈલ જુઓ"
                                  >
                                    <CloudArrowUpIcon className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>ડ્રાઇવમાં સેવ</span>
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                    <span>સેવ થયેલ</span>
                                  </span>
                                )
                              ) : (
                                <Button
                                  variant="outlined"
                                  color="neutral"
                                  className="h-7 text-xs px-2 flex items-center gap-1 font-medium text-gray-600 hover:text-primary-600"
                                  onClick={() => handleSyncSingleToDrive(c._id)}
                                  disabled={syncingId === c._id}
                                  title="Google Drive (swastikelegance065@gmail.com) માં સેવ કરો"
                                >
                                  <CloudArrowUpIcon
                                    className={clsx(
                                      "h-3.5 w-3.5",
                                      syncingId === c._id && "animate-bounce text-primary-600",
                                    )}
                                  />
                                  <span>{syncingId === c._id ? "સિંક..." : "ડ્રાઇવ સેવ"}</span>
                                </Button>
                              )}
                            </Td>

                            {/* Actions */}
                            <Td className="py-4 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Print Button */}
                                <Button
                                  variant="soft"
                                  color="primary"
                                  className="h-8 text-xs px-2.5 flex items-center gap-1 font-semibold"
                                  onClick={() => handleOpenPrint(c)}
                                  title="બિલ પ્રિન્ટ / PDF ડાઉનલોડ"
                                >
                                  <PrinterIcon className="h-4 w-4" />
                                  પ્રિન્ટ
                                </Button>

                                {/* Edit Button */}
                                <Button
                                  variant="flat"
                                  color="neutral"
                                  isIcon
                                  className="h-8 w-8 text-gray-500 hover:text-primary-600"
                                  onClick={() => handleOpenEdit(c)}
                                  title="સુધારો (Edit)"
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </Button>

                                {/* Delete Button */}
                                <Button
                                  variant="flat"
                                  color="neutral"
                                  isIcon
                                  className="h-8 w-8 text-gray-500 hover:text-error"
                                  onClick={() => handleOpenDelete(c)}
                                  title="ડિલીટ કરો (Delete)"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </Td>
                          </Tr>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* =================================================================== */}
        {/* TAB 2: DATE-WISE SUMMARY & REPORTS */}
        {/* =================================================================== */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Spinner className="h-10 w-10 text-primary-500" />
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  તારીખ મુજબ સમરી તૈયાર થઈ રહી છે...
                </p>
              </div>
            ) : !summaryData || !summaryData.dailyBreakdown || summaryData.dailyBreakdown.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark-600 p-12 text-center bg-white/50 dark:bg-dark-700/50">
                <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  આ તારીખગાળા માટે કોઈ સમરી ડેટા નથી
                </h3>
              </div>
            ) : (
              <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-600">
                <div className="p-4 bg-gray-50/70 dark:bg-dark-800/80 border-b border-gray-200 dark:border-dark-600 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      તારીખ વાઈઝ ટોટલ સમરી ({summaryData.firm})
                    </h3>
                    <p className="text-xs text-gray-500">
                      દરેક તારીખનું બિલ કાઉન્ટ, ક્વોન્ટિટી અને રકમનો હિસાબ
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">કુલ ટર્નઓવર:</span>
                    <div className="text-lg font-extrabold text-emerald-600 font-mono">
                      ₹ {formatCurrency(summaryData.overallTotals?.grandTotal)}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table className="w-full text-left">
                    <THead className="bg-gray-100/70 dark:bg-dark-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <Tr>
                        <Th className="py-3 px-4 font-semibold">તારીખ (Date)</Th>
                        <Th className="py-3 px-4 font-semibold text-center">બિલ સંખ્યા</Th>
                        <Th className="py-3 px-4 font-semibold text-center">કુલ જથ્થો (Qty)</Th>
                        <Th className="py-3 px-4 font-semibold text-right">કરપાત્ર રકમ (Taxable)</Th>
                        <Th className="py-3 px-4 font-semibold text-right">GST રકમ</Th>
                        <Th className="py-3 px-4 font-semibold text-right">ગ્રાન્ડ ટોટલ (Total)</Th>
                        <Th className="py-3 px-4 font-semibold text-center">એક્શન</Th>
                      </Tr>
                    </THead>
                    <TBody className="divide-y divide-gray-150 dark:divide-dark-600 text-sm">
                      {summaryData.dailyBreakdown.map((row) => (
                        <Tr
                          key={row._id}
                          className="hover:bg-gray-50/70 dark:hover:bg-dark-600/40"
                        >
                          <Td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            📅 {formatDate(row._id)}
                          </Td>
                          <Td className="py-3.5 px-4 text-center font-bold text-primary-600">
                            {row.totalBills} બિલો
                          </Td>
                          <Td className="py-3.5 px-4 text-center font-mono">
                            {row.totalQty}
                          </Td>
                          <Td className="py-3.5 px-4 text-right font-mono">
                            ₹ {formatCurrency(row.taxableAmount)}
                          </Td>
                          <Td className="py-3.5 px-4 text-right font-mono text-purple-600">
                            ₹ {formatCurrency(row.totalGst)}
                          </Td>
                          <Td className="py-3.5 px-4 text-right font-bold font-mono text-emerald-600 text-base">
                            ₹ {formatCurrency(row.grandTotal)}
                          </Td>
                          <Td className="py-3.5 px-4 text-center">
                            <Button
                              variant="soft"
                              color="primary"
                              className="h-7 text-xs px-2.5"
                              onClick={() => {
                                setStartDate(row._id);
                                setEndDate(row._id);
                                setActiveTab("list");
                              }}
                            >
                              બિલો જુઓ
                            </Button>
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* CREATE / EDIT CHALLAN MODAL */}
        {/* =================================================================== */}
        <Transition appear show={isModalOpen} as="div">
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => !submitting && setIsModalOpen(false)}
          >
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                <TransitionChild
                  as="div"
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-2xl transition-all dark:bg-dark-700 border border-gray-200 dark:border-dark-600">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between border-b border-gray-150 pb-4 dark:border-dark-600">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                          <DocumentTextIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isEditing
                              ? `ચલાણ / બિલ સુધારો (Edit Bill #${formData.billNo})`
                              : "નવું ચલાણ / બિલ બનાવો (Create New Bill)"}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            પેઢી પસંદ કરી વેપારીનું નવું ચલાણ અને બિલિંગ એન્ટ્રી કરો
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        disabled={submitting}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitForm} className="mt-4 space-y-5">
                      {/* Section 1: Firm Selection */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2">
                          ૧. બિલિંગ પેઢી પસંદ કરો (Select Billing Firm) *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Option A: Swastik Art */}
                          <div
                            onClick={() => handleSelectFirmInForm("Swastik Art")}
                            className={clsx(
                              "cursor-pointer rounded-xl p-3 border-2 transition-all flex items-center justify-between",
                              formData.firmName?.toLowerCase().includes("swastik")
                                ? "border-red-600 bg-red-50/50 dark:bg-red-950/20 shadow-xs"
                                : "border-gray-200 dark:border-dark-600 hover:border-gray-300",
                            )}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-red-700 dark:text-red-400">
                                  Swastik Art
                                </span>
                                <span className="text-[10px] font-semibold bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                                  GST બિલ ફોર્મેટ
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                GSTIN: 24BKJPS1499H1ZP | Sequence Embroidery
                              </p>
                            </div>
                            <input
                              type="radio"
                              name="firmSelect"
                              checked={formData.firmName?.toLowerCase().includes("swastik")}
                              onChange={() => handleSelectFirmInForm("Swastik Art")}
                              className="text-red-600 focus:ring-red-500 h-4 w-4"
                            />
                          </div>

                          {/* Option B: Astha Fashion */}
                          <div
                            onClick={() => handleSelectFirmInForm("Astha Fashion")}
                            className={clsx(
                              "cursor-pointer rounded-xl p-3 border-2 transition-all flex items-center justify-between",
                              formData.firmName?.toLowerCase().includes("astha")
                                ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                                : "border-gray-200 dark:border-dark-600 hover:border-gray-300",
                            )}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                                  Astha Fashion
                                </span>
                                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                  PAN / નોન-GST
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                PAN: DFQPS3042G | Maheshbhai L. Sutariya
                              </p>
                            </div>
                            <input
                              type="radio"
                              name="firmSelect"
                              checked={formData.firmName?.toLowerCase().includes("astha")}
                              onChange={() => handleSelectFirmInForm("Astha Fashion")}
                              className="text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Merchant & Bill Details */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          {/* Merchant Select / Auto-fill */}
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              વેપારી પસંદ કરો (Select Merchant) અથવા નવો લખો *
                            </label>
                            {merchants.length > 0 && (
                              <Select
                                value={formData.merchantId || ""}
                                onChange={(e) => handleSelectMerchantInForm(e.target.value)}
                                className="mb-2 text-xs"
                              >
                                <option value="">-- સિલેક્ટ મર્ચન્ટ (લિસ્ટમાંથી) --</option>
                                {merchants.map((m) => (
                                  <option key={m._id} value={m._id}>
                                    {m.name} ({m.mobileNumber || m.address || "વેપારી"})
                                  </option>
                                ))}
                              </Select>
                            )}
                            <Input
                              placeholder="મર્ચન્ટનું નામ (M/s.) *"
                              value={formData.merchantName}
                              onChange={(e) =>
                                setFormData({ ...formData, merchantName: e.target.value })
                              }
                              error={formErrors.merchantName}
                              required
                            />
                          </div>

                          {/* Bill No */}
                          <div>
                            <Input
                              label="બિલ નંબર (Bill No)*"
                              placeholder="101"
                              value={formData.billNo}
                              onChange={(e) =>
                                setFormData({ ...formData, billNo: e.target.value })
                              }
                              error={formErrors.billNo}
                              required
                            />
                          </div>

                          {/* Date */}
                          <div>
                            <Input
                              type="date"
                              label="બિલ તારીખ (Date) *"
                              value={formData.date}
                              onChange={(e) =>
                                setFormData({ ...formData, date: e.target.value })
                              }
                              required
                            />
                          </div>

                          {/* Address */}
                          <div className="sm:col-span-2">
                            <Input
                              label="સરનામું (Address) *"
                              placeholder="દા.ત. Ring Road, Surat"
                              value={formData.merchantAddress}
                              onChange={(e) =>
                                setFormData({ ...formData, merchantAddress: e.target.value })
                              }
                              error={formErrors.merchantAddress}
                              required
                            />
                          </div>

                          {/* Mobile */}
                          <div>
                            <Input
                              label="મોબાઇલ નંબર"
                              placeholder="98765 43210"
                              value={formData.merchantMobile}
                              onChange={(e) =>
                                setFormData({ ...formData, merchantMobile: e.target.value })
                              }
                            />
                          </div>

                          {/* GSTIN / PAN */}
                          <div>
                            <Input
                              label="મર્ચન્ટ GSTIN (ઓપ્શનલ)"
                              placeholder="24ABCDE1234F1Z5"
                              value={formData.merchantGstin}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  merchantGstin: e.target.value.toUpperCase(),
                                  isGstApplicable:
                                    e.target.value.trim().length > 0
                                      ? true
                                      : formData.isGstApplicable,
                                })
                              }
                            />
                          </div>

                          {/* Book No */}
                          <div>
                            <Input
                              label="બુક નં (Book No)"
                              placeholder="1"
                              value={formData.bookNo}
                              onChange={(e) =>
                                setFormData({ ...formData, bookNo: e.target.value })
                              }
                            />
                          </div>

                          {/* Challan No */}
                          <div>
                            <Input
                              label="ચલાણ નંબર (Challan No)"
                              placeholder="101"
                              value={formData.challanNo}
                              onChange={(e) =>
                                setFormData({ ...formData, challanNo: e.target.value })
                              }
                            />
                          </div>

                          {/* Due Date */}
                          <div>
                            <Input
                              type="date"
                              label="ડ્યૂ ડેટ (Due Date)"
                              value={formData.dueDate}
                              onChange={(e) =>
                                setFormData({ ...formData, dueDate: e.target.value })
                              }
                            />
                          </div>

                          {/* State Code */}
                          <div>
                            <Input
                              label="રાજ્ય કોડ (State)"
                              value={formData.stateCode}
                              onChange={(e) =>
                                setFormData({ ...formData, stateCode: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Dynamic Items Table */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                            ૨. આઇટમ્સ વિગત (Particulars / Items) *
                          </label>
                          <Button
                            type="button"
                            variant="soft"
                            color="primary"
                            className="h-7 text-xs px-2.5 font-semibold"
                            onClick={handleAddItem}
                          >
                            <PlusIcon className="h-3.5 w-3.5 mr-1" /> બીજી આઇટમ ઉમેરો (Add Item)
                          </Button>
                        </div>

                        {formErrors.items && (
                          <p className="text-xs text-error mb-2">{formErrors.items}</p>
                        )}

                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-dark-600">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 dark:bg-dark-800 text-gray-500 uppercase">
                              <tr>
                                <th className="p-2.5 text-center w-10">#</th>
                                <th className="p-2.5">વિગત (Particulars / Description) *</th>
                                <th className="p-2.5 w-24 text-center">જથ્થો (Qty) *</th>
                                <th className="p-2.5 w-24 text-right">ભાવ (Rate) *</th>
                                <th className="p-2.5 w-28 text-right">રકમ (Amount)</th>
                                <th className="p-2.5 w-10 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-150 dark:divide-dark-600">
                              {formData.items.map((item, index) => (
                                <tr key={index} className="bg-white dark:bg-dark-700">
                                  <td className="p-2 text-center font-mono text-gray-400">
                                    {index + 1}
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="text"
                                      placeholder="દા.ત. Sequence Embroidery Work (Design #101)"
                                      value={item.description}
                                      onChange={(e) =>
                                        handleItemChange(index, "description", e.target.value)
                                      }
                                      className="w-full h-8 px-2 text-xs rounded border border-gray-200 dark:border-dark-500 bg-transparent text-gray-900 dark:text-white"
                                      required
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      placeholder="100"
                                      value={item.qty}
                                      onChange={(e) =>
                                        handleItemChange(index, "qty", e.target.value)
                                      }
                                      className="w-full h-8 px-2 text-xs text-center font-mono rounded border border-gray-200 dark:border-dark-500 bg-transparent text-gray-900 dark:text-white"
                                      min="0"
                                      step="any"
                                      required
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      placeholder="45"
                                      value={item.rate}
                                      onChange={(e) =>
                                        handleItemChange(index, "rate", e.target.value)
                                      }
                                      className="w-full h-8 px-2 text-xs text-right font-mono rounded border border-gray-200 dark:border-dark-500 bg-transparent text-gray-900 dark:text-white"
                                      min="0"
                                      step="any"
                                      required
                                    />
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                    ₹ {formatCurrency(item.amount)}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(index)}
                                      className="text-gray-400 hover:text-error p-1"
                                      title="આઇટમ કાઢી નાખો"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section 4: Discount, GST & Calculations */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Left: GST Toggles & Payment */}
                          <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={formData.isGstApplicable}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    isGstApplicable: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                આ બિલમાં GST ઉમેરો (Enable GST Calculation)
                              </span>
                            </label>

                            {formData.isGstApplicable && (
                              <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">
                                    CGST %
                                  </label>
                                  <input
                                    type="number"
                                    value={formData.cgstRate}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        cgstRate: Number(e.target.value),
                                      })
                                    }
                                    className="w-full h-8 px-2 text-xs font-mono rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-dark-700"
                                    step="0.1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">
                                    SGST %
                                  </label>
                                  <input
                                    type="number"
                                    value={formData.sgstRate}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        sgstRate: Number(e.target.value),
                                      })
                                    }
                                    className="w-full h-8 px-2 text-xs font-mono rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-dark-700"
                                    step="0.1"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] text-gray-500 mb-0.5">
                                    IGST %
                                  </label>
                                  <input
                                    type="number"
                                    value={formData.igstRate}
                                    onChange={(e) =>
                                      setFormData({
                                        ...formData,
                                        igstRate: Number(e.target.value),
                                      })
                                    }
                                    className="w-full h-8 px-2 text-xs font-mono rounded border border-purple-200 dark:border-purple-800 bg-white dark:bg-dark-700"
                                    step="0.1"
                                  />
                                </div>
                              </div>
                            )}

                            <div>
                              <Input
                                type="number"
                                label="ડિસ્કાઉન્ટ (Discount ₹)"
                                placeholder="0"
                                value={formData.discount}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    discount: Number(e.target.value),
                                  })
                                }
                                min="0"
                              />
                            </div>
                          </div>

                          {/* Right: Calculation Breakdown Card */}
                          <div className="rounded-xl bg-gray-50 dark:bg-dark-800 p-4 border border-gray-200 dark:border-dark-600 text-xs space-y-2">
                            <div className="flex justify-between text-gray-600 dark:text-gray-300">
                              <span>કુલ આઇટમ્સ / જથ્થો:</span>
                              <strong className="font-mono">
                                {formCalculations.totalQty} (Qty)
                              </strong>
                            </div>
                            <div className="flex justify-between text-gray-600 dark:text-gray-300">
                              <span>સબટોટલ (Sub Total):</span>
                              <span className="font-mono">
                                ₹ {formatCurrency(formCalculations.subTotal)}
                              </span>
                            </div>
                            {formData.discount > 0 && (
                              <div className="flex justify-between text-amber-600">
                                <span>ડિસ્કાઉન્ટ:</span>
                                <span className="font-mono">
                                  -₹ {formatCurrency(formData.discount)}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-dark-600 pt-1.5">
                              <span>કરપાત્ર રકમ (Taxable Amount):</span>
                              <span className="font-mono">
                                ₹ {formatCurrency(formCalculations.taxable)}
                              </span>
                            </div>
                            {formData.isGstApplicable && (
                              <div className="space-y-1 text-purple-700 dark:text-purple-300 border-t border-purple-100 dark:border-purple-900/40 pt-1">
                                {formCalculations.cgst > 0 && (
                                  <div className="flex justify-between">
                                    <span>CGST ({formData.cgstRate}%):</span>
                                    <span className="font-mono">
                                      +₹ {formatCurrency(formCalculations.cgst)}
                                    </span>
                                  </div>
                                )}
                                {formCalculations.sgst > 0 && (
                                  <div className="flex justify-between">
                                    <span>SGST ({formData.sgstRate}%):</span>
                                    <span className="font-mono">
                                      +₹ {formatCurrency(formCalculations.sgst)}
                                    </span>
                                  </div>
                                )}
                                {formCalculations.igst > 0 && (
                                  <div className="flex justify-between">
                                    <span>IGST ({formData.igstRate}%):</span>
                                    <span className="font-mono">
                                      +₹ {formatCurrency(formCalculations.igst)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex justify-between text-base font-extrabold text-emerald-600 dark:text-emerald-400 border-t border-gray-300 dark:border-dark-600 pt-2">
                              <span>ગ્રાન્ડ ટોટલ (Grand Total):</span>
                              <span className="font-mono">
                                ₹ {formatCurrency(formCalculations.grandTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 dark:border-dark-600">
                        <Button
                          variant="outlined"
                          color="neutral"
                          onClick={() => setIsModalOpen(false)}
                          disabled={submitting}
                        >
                          રદ કરો (Cancel)
                        </Button>
                        <Button
                          type="submit"
                          variant="filled"
                          color="primary"
                          disabled={submitting}
                        >
                          {submitting && <Spinner className="h-4 w-4 mr-1.5" />}
                          {isEditing ? "અપડેટ કરો (Update Bill)" : "સેવ કરો & પ્રિન્ટ (Save & Print)"}
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
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setIsPrintModalOpen(false)}
          >
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                <TransitionChild
                  as="div"
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-4 sm:p-6 shadow-2xl transition-all dark:bg-dark-700 border border-gray-200 dark:border-dark-600">
                    {/* Print Toolbar */}
                    <div className="flex items-center justify-between border-b border-gray-150 pb-3 mb-4 dark:border-dark-600">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <PrinterIcon className="h-5 w-5 text-primary-500" />
                          બિલ પ્રિન્ટ / PDF ડાઉનલોડ પ્રીવ્યૂ (Bill #{activePrintChallan?.billNo})
                        </h3>
                        <p className="text-xs text-gray-500">
                          ફર્મ: {activePrintChallan?.firmName} &bull; વેપારી: {activePrintChallan?.merchantName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="filled"
                          color="primary"
                          className="h-9 text-xs px-3 font-semibold shadow-sm"
                          onClick={handlePrintNow}
                        >
                          <PrinterIcon className="h-4 w-4 mr-1.5" />
                          પ્રિન્ટ કરો / Save as PDF
                        </Button>

                        {activePrintChallan?._id && (
                          <a
                            href={`${JWT_HOST_API}/challans/${activePrintChallan._id}/print`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="outlined" color="neutral" className="h-9 text-xs px-2.5">
                              <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                              નવા ટેબમાં ખોલો
                            </Button>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsPrintModalOpen(false)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-600 ml-1"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Interactive HTML Preview Box */}
                    {activePrintChallan && (
                      <div className="overflow-y-auto max-h-[72vh] rounded-xl border border-gray-200 dark:border-dark-600 bg-gray-100 p-2 sm:p-4">
                        <div
                          dangerouslySetInnerHTML={{
                            __html: generateBillPrintHtml(activePrintChallan),
                          }}
                        />
                      </div>
                    )}
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
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => !deleting && setIsDeleteModalOpen(false)}
          >
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
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
                >
                  <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-dark-700 border border-gray-200 dark:border-dark-600">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
                        <TrashIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          બિલ ડિલીટ કરવું છે?
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          શું તમે ખરેખર બિલ{" "}
                          <strong className="text-gray-900 dark:text-white">
                            #{challanToDelete?.billNo}
                          </strong>{" "}
                          ({challanToDelete?.merchantName}) ને સિસ્ટમમાંથી ડિલીટ કરવા માંગો છો? આ ક્રિયા રદ કરી શકાશે નહીં.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                      <Button
                        variant="outlined"
                        color="neutral"
                        onClick={() => setIsDeleteModalOpen(false)}
                        disabled={deleting}
                      >
                        રદ કરો
                      </Button>
                      <Button
                        variant="filled"
                        color="error"
                        onClick={handleConfirmDelete}
                        disabled={deleting}
                      >
                        {deleting && <Spinner className="h-4 w-4 mr-1.5" />}
                        હા, ડિલીટ કરો
                      </Button>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* =================================================================== */}
        {/* GOOGLE DRIVE SYNC SETTINGS MODAL */}
        {/* =================================================================== */}
        <Transition appear show={isDriveModalOpen} as="div">
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setIsDriveModalOpen(false)}
          >
            <TransitionChild
              as="div"
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" />
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
                >
                  <DialogPanel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-5 sm:p-6 shadow-2xl transition-all dark:bg-dark-700 border border-gray-200 dark:border-dark-600">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-150 pb-4 dark:border-dark-600">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <CloudArrowUpIcon className="h-6 w-6 stroke-[2]" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Google Drive & Google Sheet ઓટો-સેવ
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ચલાણ અને બિલિંગ ડેટા swastikelegance065@gmail.com ડ્રાઇવમાં સેવ કરો
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDriveModalOpen(false)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="mt-5 space-y-5">
                      {/* Target Account Info Card */}
                      <div className="rounded-xl p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-500/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase text-emerald-800 dark:text-emerald-300">
                              લક્ષ્ય Google એકાઉન્ટ (Target Account)
                            </div>
                            <div className="text-base font-bold text-emerald-950 dark:text-white font-mono mt-0.5">
                              {driveConfig.email || "swastikelegance065@gmail.com"}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-3 text-xs text-emerald-700 dark:text-emerald-300">
                              <span className="flex items-center gap-1">
                                <FolderIcon className="h-3.5 w-3.5" /> 📁 Swastik Art - Challans & Bills
                              </span>
                              <span className="flex items-center gap-1">
                                <TableCellsIcon className="h-3.5 w-3.5" /> 📊 Challans & Bills Master Record
                              </span>
                            </div>
                          </div>

                          <div>
                            {driveConfig.isConfigured ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                કનેક્ટેડ (Active)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                સેટઅપ બાકી
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Webhook Configuration Form */}
                      <form onSubmit={handleSaveDriveConfig} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Google Apps Script Webhook URL *
                          </label>
                          <Input
                            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                            value={driveConfig.webhookUrl}
                            onChange={(e) =>
                              setDriveConfig({ ...driveConfig, webhookUrl: e.target.value })
                            }
                            className="font-mono text-xs"
                            required
                          />
                          <p className="mt-1 text-[11px] text-gray-400">
                            તમારા swastikelegance065@gmail.com Google Apps Script માંથી Web app URL કોપી કરી અહીં પેસ્ટ કરો.
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(driveConfig.autoSync)}
                              onChange={(e) =>
                                setDriveConfig({ ...driveConfig, autoSync: e.target.checked })
                              }
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              નવું ચલાણ બનતા જ આપમેળે Drive અને Sheet માં સેવ કરો (Auto-Sync)
                            </span>
                          </label>

                          <Button
                            type="submit"
                            variant="filled"
                            color="primary"
                            className="h-9 text-xs px-4 font-semibold"
                            disabled={savingDriveConfig}
                          >
                            {savingDriveConfig && <Spinner className="h-3.5 w-3.5 mr-1" />}
                            સેટિંગ્સ સેવ કરો
                          </Button>
                        </div>
                      </form>

                      {/* Batch Sync Action */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                            બધા જૂના બિલો ડ્રાઇવમાં સિંક કરો
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            સિસ્ટમના તમામ {challans.length} બિલોને Google Drive અને Sheet માં એક સાથે અપલોડ કરો
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="soft"
                          color="success"
                          className="h-9 text-xs px-3 font-semibold flex items-center gap-1.5"
                          onClick={handleSyncAllToDrive}
                          disabled={syncingAllDrive || !driveConfig.isConfigured}
                        >
                          {syncingAllDrive ? (
                            <>
                              <Spinner className="h-3.5 w-3.5" />
                              <span>સિંક થઈ રહ્યું છે...</span>
                            </>
                          ) : (
                            <>
                              <CloudArrowUpIcon className="h-4 w-4" />
                              <span>બધા બિલો સિંક કરો</span>
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Setup Instructions Card with Copy Code Button */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            📖 30 સેકન્ડ ગાઈડ: swastikelegance065@gmail.com માં કેવી રીતે સેટઅપ કરવું?
                          </h4>
                          <Button
                            type="button"
                            variant="soft"
                            color="primary"
                            className="h-7 text-xs px-2.5 font-semibold flex items-center gap-1"
                            onClick={handleCopyScriptCode}
                          >
                            {copiedCode ? (
                              <>
                                <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                                <span>કોપી થઈ ગયું!</span>
                              </>
                            ) : (
                              <>
                                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                <span>કોડ કોપી કરો (Copy Script)</span>
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="bg-gray-50 dark:bg-dark-800 rounded-xl p-3.5 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
                          <p>
                            <strong>૧.</strong> બ્રાઉઝરમાં{" "}
                            <a
                              href="https://script.google.com/home"
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary-600 underline font-semibold"
                            >
                              script.google.com
                            </a>{" "}
                            ખોલો (swastikelegance065@gmail.com લોગિન હોવું જોઈએ).
                          </p>
                          <p>
                            <strong>૨.</strong> <strong>&quot;+ New project&quot;</strong> પર ક્લિક કરો અને ઉપરનું{" "}
                            <span className="font-semibold text-primary-600">&quot;કોડ કોપી કરો&quot;</span> બટન દબાવીને તે કોડ ત્યાં પેસ્ટ કરી દો.
                          </p>
                          <p>
                            <strong>૩.</strong> જમણી બાજુ ઉપર <strong>&quot;Deploy&quot;</strong> &rarr; <strong>&quot;New deployment&quot;</strong> પર ક્લિક કરો.
                          </p>
                          <p>
                            <strong>૪.</strong> ⚙️ માં <strong>&quot;Web app&quot;</strong> પસંદ કરો અને <strong>&quot;Who has access&quot;</strong> માં <strong>&quot;Anyone&quot;</strong> સિલેક્ટ કરો.
                          </p>
                          <p>
                            <strong>૫.</strong> Deploy બટન દબાવી મળેલી <strong>Web app URL</strong> ને ઉપરના બોક્સમાં પેસ્ટ કરી સેવ કરી દો!
                          </p>
                        </div>
                      </div>
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
