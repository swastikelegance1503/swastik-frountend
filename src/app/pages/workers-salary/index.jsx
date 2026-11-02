// Import Dependencies
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import {
  UserGroupIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  CpuChipIcon,
  XMarkIcon,
  EyeIcon,
  CreditCardIcon,
  GiftIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { toast } from "sonner";
import dayjs from "dayjs";

// Local UI Component Imports from components/ui
import {
  Button,
  Card,
  Input,
  Textarea,
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

// Helper function to calculate automatic bonus based on exact formula
// Rules:
// Below ₹5,00,000 = ₹0
// ₹5,00,000 to ₹5,49,999 = ₹50
// ₹5,50,000 to ₹5,99,999 = ₹100
// ₹6,00,000 to ₹6,49,999 = ₹150
// ₹6,50,000 to ₹6,99,999 = ₹200
// Formula: Bonus = ₹50 × (floor(Production / 50,000) - 9), for Production ≥ ₹5,00,000
function getBonusPreview(amount) {
  const num = Number(amount) || 0;
  if (num < 500000) {
    return {
      bonus: 0,
      slab: "₹0 – ₹4,99,999 (નો-બોનસ)",
      isEligible: false,
    };
  }
  const slabUnits = Math.floor(num / 50000) - 9;
  const bonus = 50 * slabUnits;
  const lower = (slabUnits + 9) * 50000;
  const upper = lower + 49999;
  return {
    bonus,
    slab: `₹${lower.toLocaleString("en-IN")} – ₹${upper.toLocaleString("en-IN")}`,
    isEligible: true,
  };
}

export default function WorkersSalaryPage() {
  // 1. Month Cycle State
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().format("YYYY-MM"));

  // 2. Active View Sub-Tab ('salary-list' | 'production' | 'bonus' | 'advance')
  const [activeTab, setActiveTab] = useState("salary-list");

  // 3. Data States
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncingMachine, setIsSyncingMachine] = useState(false);
  const [dashboard, setDashboard] = useState({
    totalWorkers: 0,
    totalMonthlySalary: 0,
    totalProduction: 0,
    totalBonus: 0,
    totalAdvance: 0,
    totalPendingSalary: 0,
    totalPaidSalary: 0,
  });
  const [workers, setWorkers] = useState([]);
  const [allDailyProductions, setAllDailyProductions] = useState([]);
  const [allBonuses, setAllBonuses] = useState([]);
  const [allAdvances, setAllAdvances] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedWorkerFilter, setSelectedWorkerFilter] = useState("");

  // ==============================================================
  // MODALS STATE
  // ==============================================================
  // Modal 1: Add / Edit Daily Production
  const [isOpenProductionModal, setIsOpenProductionModal] = useState(false);
  const [isEditingProduction, setIsEditingProduction] = useState(false);
  const [productionTargetWorker, setProductionTargetWorker] = useState(null);
  const [editingProductionId, setEditingProductionId] = useState(null);
  const [submittingProduction, setSubmittingProduction] = useState(false);
  const [productionForm, setProductionForm] = useState({
    workerId: "",
    date: dayjs().format("YYYY-MM-DD"),
    amount: "",
    remarks: "",
  });

  // Modal 2: Add / Edit Advance (ઉપાડ)
  const [isOpenAdvanceModal, setIsOpenAdvanceModal] = useState(false);
  const [isEditingAdvance, setIsEditingAdvance] = useState(false);
  const [advanceTargetWorker, setAdvanceTargetWorker] = useState(null);
  const [editingAdvanceId, setEditingAdvanceId] = useState(null);
  const [submittingAdvance, setSubmittingAdvance] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    workerId: "",
    amount: "",
    date: dayjs().format("YYYY-MM-DD"),
    paymentMethod: "Cash",
    note: "",
    addedBy: "Admin",
  });

  // Modal 3: Settle Salary / Pay Month Modal
  const [isOpenSettleModal, setIsOpenSettleModal] = useState(false);
  const [settleWorker, setSettleWorker] = useState(null);
  const [submittingSettle, setSubmittingSettle] = useState(false);
  const [settleForm, setSettleForm] = useState({
    paymentMode: "Cash",
    settlementDate: dayjs().format("YYYY-MM-DD"),
    notes: "",
  });

  // Modal 4: Full Worker Details (6 Tabs)
  const [isOpenDetailModal, setIsOpenDetailModal] = useState(false);
  const [detailWorker, setDetailWorker] = useState(null);
  const [detailTab, setDetailTab] = useState("overview"); // 'overview' | 'machine' | 'production' | 'bonus' | 'advance' | 'payments'

  // ==============================================================
  // FETCH DATA
  // ==============================================================
  const fetchData = useCallback(
    async (month = selectedMonth, forceLoading = false) => {
      try {
        if (forceLoading) {
          setLoading(true);
        }
        const res = await axios.get(`/workers/salary-management?month=${month}`);
        if (res.data?.success) {
          setDashboard(
            res.data.dashboard || {
              totalWorkers: 0,
              totalMonthlySalary: 0,
              totalProduction: 0,
              totalBonus: 0,
              totalAdvance: 0,
              totalPendingSalary: 0,
              totalPaidSalary: 0,
            }
          );
          setWorkers(res.data.workers || []);
          setAllDailyProductions(res.data.allDailyProductions || []);
          setAllBonuses(res.data.allBonuses || []);
          setAllAdvances(res.data.allAdvances || []);

          // Keep detail worker updated if open (functional update to prevent infinite re-render loop)
          setDetailWorker((prev) => {
            if (!prev) return null;
            const updated = (res.data.workers || []).find((w) => w._id === prev._id);
            return updated || prev;
          });
        }
      } catch (err) {
        console.error("Error fetching salary management data:", err);
        toast.error(err?.message || "સેલેરી ડેટા લાવવામાં ભૂલ આવી");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        setIsSyncingMachine(false);
      }
    },
    [selectedMonth]
  );

  useEffect(() => {
    fetchData(selectedMonth, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData(selectedMonth);
  };

  const handleSyncMachineProduction = async () => {
    try {
      setIsSyncingMachine(true);
      const res = await axios.post(`/workers/sync-machine-production?month=${selectedMonth}`);
      if (res.data?.success) {
        toast.success(res.data.message || "મશીન અને પ્રોડક્શન મોડ્યુલ ડેટા સફળતાપૂર્વક સિન્ક થયો!");
        fetchData(selectedMonth);
      }
    } catch (err) {
      toast.error(err?.message || "મશીન ડેટા સિન્ક કરવામાં ભૂલ આવી");
    } finally {
      setIsSyncingMachine(false);
    }
  };

  // Month Switchers
  const handlePrevMonth = () => {
    const prev = dayjs(selectedMonth + "-01").subtract(1, "month").format("YYYY-MM");
    setSelectedMonth(prev);
  };

  const handleNextMonth = () => {
    const next = dayjs(selectedMonth + "-01").add(1, "month").format("YYYY-MM");
    setSelectedMonth(next);
  };

  // Filtered Workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      if (statusFilter && w.paymentStatus !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (w.name || "").toLowerCase().includes(q);
        const matchMobile = (w.mobileNumber || "").toLowerCase().includes(q);
        const matchMachine = (w.machineName || "").toLowerCase().includes(q);
        const matchCode = (w.machineCode || "").toLowerCase().includes(q);
        const matchRole = (w.role || "").toLowerCase().includes(q);
        if (!matchName && !matchMobile && !matchMachine && !matchCode && !matchRole) {
          return false;
        }
      }
      return true;
    });
  }, [workers, statusFilter, search]);

  // Filtered Daily Productions
  const filteredDailyProductions = useMemo(() => {
    return allDailyProductions.filter((p) => {
      if (selectedWorkerFilter && p.workerId !== selectedWorkerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (p.workerName || "").toLowerCase().includes(q);
        const matchMachine = (p.machineName || "").toLowerCase().includes(q);
        const matchRemark = (p.remarks || "").toLowerCase().includes(q);
        if (!matchName && !matchMachine && !matchRemark) return false;
      }
      return true;
    });
  }, [allDailyProductions, selectedWorkerFilter, search]);

  // Filtered Bonuses
  const filteredBonuses = useMemo(() => {
    return allBonuses.filter((b) => {
      if (selectedWorkerFilter && b.workerId !== selectedWorkerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (b.workerName || "").toLowerCase().includes(q);
        const matchMachine = (b.machineName || "").toLowerCase().includes(q);
        const matchReason = (b.reason || "").toLowerCase().includes(q);
        if (!matchName && !matchMachine && !matchReason) return false;
      }
      return true;
    });
  }, [allBonuses, selectedWorkerFilter, search]);

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    return allAdvances.filter((a) => {
      if (selectedWorkerFilter && a.workerId !== selectedWorkerFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (a.workerName || "").toLowerCase().includes(q);
        const matchNote = (a.note || "").toLowerCase().includes(q);
        const matchMethod = (a.paymentMethod || "").toLowerCase().includes(q);
        if (!matchName && !matchNote && !matchMethod) return false;
      }
      return true;
    });
  }, [allAdvances, selectedWorkerFilter, search]);

  // ==============================================================
  // PRODUCTION HANDLERS
  // ==============================================================
  const handleOpenAddProduction = (worker = null) => {
    setIsEditingProduction(false);
    setEditingProductionId(null);
    setProductionTargetWorker(worker);
    setProductionForm({
      workerId: worker ? worker._id : workers[0]?._id || "",
      date: dayjs().format("YYYY-MM-DD"),
      amount: "",
      remarks: "",
    });
    setIsOpenProductionModal(true);
  };

  const handleOpenEditProduction = (prod, worker = null) => {
    setIsEditingProduction(true);
    setEditingProductionId(prod._id);
    const wId = prod.workerId || worker?._id || "";
    setProductionTargetWorker(worker || workers.find((w) => w._id === wId) || null);
    setProductionForm({
      workerId: wId,
      date: prod.date ? dayjs(prod.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      amount: prod.amount || "",
      remarks: prod.remarks || "",
    });
    setIsOpenProductionModal(true);
  };

  const handleSubmitProduction = async (e) => {
    e.preventDefault();
    const numAmount = Number(productionForm.amount);
    if (!productionForm.workerId) {
      toast.error("કૃપા કરીને કારીગર પસંદ કરો");
      return;
    }
    if (!productionForm.amount || numAmount < 0) {
      toast.error("સાચી પ્રોડક્શન રકમ દાખલ કરો");
      return;
    }

    try {
      setSubmittingProduction(true);
      if (isEditingProduction) {
        const res = await axios.put(
          `/workers/${productionForm.workerId}/daily-production/${editingProductionId}`,
          {
            date: productionForm.date,
            amount: numAmount,
            remarks: productionForm.remarks,
          }
        );
        if (res.data?.success) {
          toast.success("પ્રોડક્શન અને બોનસ સફળતાપૂર્વક અપડેટ થયા!");
          setIsOpenProductionModal(false);
          fetchData(selectedMonth);
        }
      } else {
        const res = await axios.post(
          `/workers/${productionForm.workerId}/daily-production`,
          {
            date: productionForm.date,
            amount: numAmount,
            remarks: productionForm.remarks,
            month: selectedMonth,
          }
        );
        if (res.data?.success) {
          toast.success(res.data.message || "પ્રોડક્શન સફળતાપૂર્વક નોંધાઈ ગયું!");
          setIsOpenProductionModal(false);
          fetchData(selectedMonth);
        }
      }
    } catch (err) {
      toast.error(err?.message || "પ્રોડક્શન સેવ કરવામાં ભૂલ આવી");
    } finally {
      setSubmittingProduction(false);
    }
  };

  const handleDeleteProduction = async (workerId, entryId) => {
    if (!window.confirm("શું તમે ખરેખર આ પ્રોડક્શન એન્ટ્રી ડિલીટ કરવા માંગો છો?")) return;
    try {
      const res = await axios.delete(`/workers/${workerId}/daily-production/${entryId}`);
      if (res.data?.success) {
        toast.success("પ્રોડક્શન એન્ટ્રી ડિલીટ થઈ ગઈ!");
        fetchData(selectedMonth);
      }
    } catch (err) {
      toast.error(err?.message || "ડિલીટ કરવામાં ભૂલ આવી");
    }
  };

  // ==============================================================
  // ADVANCE (ઉપાડ) HANDLERS
  // ==============================================================
  const handleOpenAddAdvance = (worker = null) => {
    setIsEditingAdvance(false);
    setEditingAdvanceId(null);
    setAdvanceTargetWorker(worker);
    setAdvanceForm({
      workerId: worker ? worker._id : workers[0]?._id || "",
      amount: "",
      date: dayjs().format("YYYY-MM-DD"),
      paymentMethod: "Cash",
      note: "",
      addedBy: "Admin",
    });
    setIsOpenAdvanceModal(true);
  };

  const handleOpenEditAdvance = (adv, worker = null) => {
    setIsEditingAdvance(true);
    setEditingAdvanceId(adv._id);
    const wId = adv.workerId || worker?._id || "";
    setAdvanceTargetWorker(worker || workers.find((w) => w._id === wId) || null);
    setAdvanceForm({
      workerId: wId,
      amount: adv.amount || "",
      date: adv.date ? dayjs(adv.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
      paymentMethod: adv.paymentMethod || "Cash",
      note: adv.note || "",
      addedBy: adv.addedBy || "Admin",
    });
    setIsOpenAdvanceModal(true);
  };

  const handleSubmitAdvance = async (e) => {
    e.preventDefault();
    const numAmount = Number(advanceForm.amount);
    if (!advanceForm.workerId) {
      toast.error("કારીગર પસંદ કરો");
      return;
    }
    if (!advanceForm.amount || numAmount <= 0) {
      toast.error("સાચી ઉપાડ રકમ દાખલ કરો");
      return;
    }

    try {
      setSubmittingAdvance(true);
      if (isEditingAdvance) {
        const res = await axios.put(
          `/workers/${advanceForm.workerId}/withdrawals/${editingAdvanceId}`,
          {
            amount: numAmount,
            date: advanceForm.date,
            paymentMethod: advanceForm.paymentMethod,
            note: advanceForm.note,
            addedBy: advanceForm.addedBy,
          }
        );
        if (res.data?.success) {
          toast.success("ઉપાડ એન્ટ્રી સુધારી લેવાઈ!");
          setIsOpenAdvanceModal(false);
          fetchData(selectedMonth);
        }
      } else {
        const res = await axios.post(
          `/workers/${advanceForm.workerId}/withdrawals`,
          {
            amount: numAmount,
            date: advanceForm.date,
            paymentMethod: advanceForm.paymentMethod,
            note: advanceForm.note,
            addedBy: advanceForm.addedBy,
            month: selectedMonth,
          }
        );
        if (res.data?.success) {
          toast.success(`₹${numAmount.toLocaleString("en-IN")} ઉપાડ સફળતાપૂર્વક નોંધાઈ ગયો!`);
          setIsOpenAdvanceModal(false);
          fetchData(selectedMonth);
        }
      }
    } catch (err) {
      toast.error(err?.message || "ઉપાડ નોંધવામાં ભૂલ આવી");
    } finally {
      setSubmittingAdvance(false);
    }
  };

  const handleDeleteAdvance = async (workerId, withdrawalId) => {
    if (!window.confirm("શું તમે ખરેખર આ ઉપાડ એન્ટ્રી ડિલીટ કરવા માંગો છો?")) return;
    try {
      const res = await axios.delete(`/workers/${workerId}/withdrawals/${withdrawalId}`);
      if (res.data?.success) {
        toast.success("ઉપાડ એન્ટ્રી સફળતાપૂર્વક હટાવી!");
        fetchData(selectedMonth);
      }
    } catch (err) {
      toast.error(err?.message || "ડિલીટ કરવામાં ભૂલ આવી");
    }
  };

  // ==============================================================
  // SALARY SETTLEMENT HANDLERS
  // ==============================================================
  const handleOpenSettleSalary = (worker) => {
    setSettleWorker(worker);
    setSettleForm({
      paymentMode: "Cash",
      settlementDate: dayjs().format("YYYY-MM-DD"),
      notes: `${dayjs(selectedMonth + "-01").format("MMMM YYYY")} નો આખરી પગાર ચૂકવ્યો`,
    });
    setIsOpenSettleModal(true);
  };

  const handleSubmitSettleSalary = async (e) => {
    e.preventDefault();
    if (!settleWorker?._id) return;

    try {
      setSubmittingSettle(true);
      const res = await axios.post(`/workers/${settleWorker._id}/settle-month`, {
        month: selectedMonth,
        baseSalary: settleWorker.monthlySalary,
        totalBonus: settleWorker.monthBonus,
        totalWithdrawals: settleWorker.monthAdvance,
        netPaid: settleWorker.netPayable,
        paymentMode: settleForm.paymentMode,
        settlementDate: settleForm.settlementDate,
        notes: settleForm.notes,
      });

      if (res.data?.success) {
        toast.success(`${settleWorker.name} નો પગાર ચૂકતે થઈ ગયો!`);
        setIsOpenSettleModal(false);
        fetchData(selectedMonth);
      }
    } catch (err) {
      toast.error(err?.message || "પગાર પતાવટમાં ભૂલ આવી");
    } finally {
      setSubmittingSettle(false);
    }
  };

  const handleCancelSettlement = async (workerId, settlementId) => {
    if (!window.confirm("શું તમે આ મહિનાની પગાર પતાવટ રદ (Pending) કરવા માંગો છો?")) return;
    try {
      const res = await axios.delete(`/workers/${workerId}/settle-month/${settlementId}`);
      if (res.data?.success) {
        toast.success("પગાર પતાવટ રદ કરવામાં આવી!");
        fetchData(selectedMonth);
      }
    } catch (err) {
      toast.error(err?.message || "ભૂલ આવી");
    }
  };

  // ==============================================================
  // EXPORT TO EXCEL / CSV & PRINT
  // ==============================================================
  const handleExportCSV = () => {
    if (workers.length === 0) {
      toast.error("નિકાસ કરવા માટે કોઈ ડેટા નથી");
      return;
    }

    const headers = [
      "Worker Name",
      "Mobile",
      "Role",
      "Assigned Machine",
      "Machine Code",
      "Heads",
      "Monthly Salary",
      "Total Production",
      "Total Bonus",
      "Total Advance",
      "Net Payable",
      "Payment Status",
      "Month",
    ];

    const rows = workers.map((w) => [
      `"${w.name || ""}"`,
      `"${w.mobileNumber || ""}"`,
      `"${w.role || ""}"`,
      `"${w.machineName || "None"}"`,
      `"${w.machineCode || ""}"`,
      `"${w.machineHeadCount || 24}"`,
      w.monthlySalary || 0,
      w.monthProduction || 0,
      w.monthBonus || 0,
      w.monthAdvance || 0,
      w.netPayable || 0,
      `"${w.paymentStatus || "Pending"}"`,
      `"${selectedMonth}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Workers_Salary_Report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Excel / CSV રિપોર્ટ ડાઉનલોડ થઈ ગયો!");
  };

  const handlePrint = () => {
    window.print();
  };

  // Live preview for bonus inside production modal
  const liveBonusPreview = getBonusPreview(productionForm.amount);

  return (
    <Page title="Workers Salary Management - Swastik Art">
      <div className="transition-content w-full px-(--margin-x) pt-5 pb-8 lg:pt-6">
        {/* 1. TOP HEADER & CONTROLS */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400">
              <BanknotesIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-dark-50">
                કારીગર સેલેરી મેનેજમેન્ટ (Workers Salary Management)
              </h2>
              <p className="text-xs text-gray-400 dark:text-dark-300">
                મશીન એસાઇનમેન્ટ, દૈનિક પ્રોડક્શન, ઓટોમેટિક બોનસ (₹5L+), ઉપાડ અને સેલેરી પતાવટ
              </p>
            </div>
          </div>

          {/* Month Navigator & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Switcher Pill */}
            <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-xs dark:border-dark-600 dark:bg-dark-800">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                title="અગાઉનો મહિનો (Previous Month)"
              >
                <ChevronLeftIcon className="size-4.5" />
              </button>
              <span className="px-2.5 text-xs font-bold text-gray-800 dark:text-dark-50">
                {dayjs(selectedMonth + "-01").format("MMMM YYYY")}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                title="આગલો મહિનો (Next Month)"
              >
                <ChevronRightIcon className="size-4.5" />
              </button>
            </div>

            {/* Refresh */}
            <Button
              variant="flat"
              className="gap-1.5"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
            >
              <ArrowPathIcon className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Sync Machine Production Button */}
            <Button
              variant="flat"
              className="gap-1.5 border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
              onClick={handleSyncMachineProduction}
              disabled={isSyncingMachine || loading}
              title="મશીન મોડ્યુલ અને પ્રોડક્શન મોડ્યુલમાંથી ડેટા આપોઆપ સિન્ક કરો"
            >
              <CpuChipIcon className={`size-4 ${isSyncingMachine ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">મશીન ડેટા સિન્ક</span>
            </Button>

            {/* Add Production Quick Button */}
            <Button
              variant="flat"
              color="primary"
              className="gap-1.5"
              onClick={() => handleOpenAddProduction(null)}
            >
              <SparklesIcon className="size-4 text-primary-600" />
              <span>પ્રોડક્શન ઉમેરો</span>
            </Button>

            {/* Add Advance Quick Button */}
            <Button
              color="primary"
              className="gap-1.5 shadow-sm"
              onClick={() => handleOpenAddAdvance(null)}
            >
              <PlusIcon className="size-4" />
              <span>ઉપાડ નોંધો (Advance)</span>
            </Button>

            {/* Export & Print */}
            <Button
              variant="flat"
              className="size-9 p-0"
              onClick={handleExportCSV}
              title="Excel / CSV ડાઉનલોડ કરો"
            >
              <ArrowDownTrayIcon className="size-4.5 text-gray-600 dark:text-dark-300" />
            </Button>
            <Button
              variant="flat"
              className="size-9 p-0"
              onClick={handlePrint}
              title="પ્રિન્ટ રિપોર્ટ"
            >
              <PrinterIcon className="size-4.5 text-gray-600 dark:text-dark-300" />
            </Button>
          </div>
        </div>

        {/* 📑 SUB-MODULE NAVIGATION TABS */}
        <div className="mt-4 flex items-center space-x-2 border-b border-gray-200 dark:border-dark-700">
          <Link
            to="/workers"
            className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100"
          >
            <UserGroupIcon className="size-4.5" />
            <span>કારીગરોની ડિરેક્ટરી (Workers Directory)</span>
          </Link>
          <Link
            to="/workers/salary"
            className="flex items-center gap-2 border-b-2 border-primary-600 px-4 py-2.5 text-sm font-bold text-primary-600 dark:border-primary-400 dark:text-primary-400"
          >
            <BanknotesIcon className="size-4.5" />
            <span>સેલેરી મેનેજમેન્ટ (Workers Salary Management)</span>
          </Link>
        </div>

        {/* 📊 SECTION 8: 7 PROFESSIONAL STAT CARDS */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {/* 1. Total Workers */}
          <Card className="p-3.5 border-l-3 border-l-blue-500">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              કુલ કારીગરો
            </span>
            <p className="mt-1 text-xl font-bold text-gray-800 dark:text-dark-50">
              {dashboard.totalWorkers}
            </p>
            <p className="text-[10px] text-gray-400">Total Workers</p>
          </Card>

          {/* 2. Total Monthly Salary */}
          <Card className="p-3.5 border-l-3 border-l-primary-500">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              માસિક પગાર
            </span>
            <p className="mt-1 text-xl font-bold text-primary-600 dark:text-primary-400">
              ₹{(dashboard.totalMonthlySalary || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400">Base Payroll</p>
          </Card>

          {/* 3. Total Production */}
          <Card className="p-3.5 border-l-3 border-l-indigo-500">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              કુલ પ્રોડક્શન
            </span>
            <p className="mt-1 text-xl font-bold text-indigo-600 dark:text-indigo-400">
              ₹{(dashboard.totalProduction || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400">Month Production</p>
          </Card>

          {/* 4. Total Bonus */}
          <Card className="p-3.5 border-l-3 border-l-amber-500">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              કુલ બોનસ
            </span>
            <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
              ₹{(dashboard.totalBonus || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400">
              {dashboard.totalOtherBonus > 0
                ? `પ્રોડક્શન: ₹${(dashboard.totalProductionBonus || 0).toLocaleString("en-IN")} • અન્ય: ₹${dashboard.totalOtherBonus.toLocaleString("en-IN")}`
                : "ઓટો સ્લેબ બોનસ"}
            </p>
          </Card>

          {/* 5. Total Advance */}
          <Card className="p-3.5 border-l-3 border-l-rose-500">
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              કુલ ઉપાડ
            </span>
            <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">
              ₹{(dashboard.totalAdvance || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400">Cash & Online</p>
          </Card>

          {/* 6. Total Pending Salary */}
          <Card className="p-3.5 border-l-3 border-l-orange-500">
            <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              બાકી પગાર
            </span>
            <p className="mt-1 text-xl font-bold text-orange-600 dark:text-orange-400">
              ₹{(dashboard.totalPendingSalary || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400">Net Due</p>
          </Card>

          {/* 7. Total Paid Salary */}
          <Card className="p-3.5 border-l-3 border-l-emerald-500">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              ચૂકવેલ પગાર
            </span>
            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{(dashboard.totalPaidSalary || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-gray-400">Paid Settled</p>
          </Card>
        </div>

        {/* 🗂️ 4 SUB-VIEW TABS */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-dark-700">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("salary-list")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "salary-list"
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-200"
              }`}
            >
              <UserGroupIcon className="size-4" />
              <span>૧. સેલેરી સમરી યાદી ({filteredWorkers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("production")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "production"
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-200"
              }`}
            >
              <CpuChipIcon className="size-4" />
              <span>૨. દૈનિક પ્રોડક્શન ({allDailyProductions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("bonus")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "bonus"
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-200"
              }`}
            >
              <GiftIcon className="size-4" />
              <span>૩. બોનસ ઇતિહાસ ({allBonuses.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("advance")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                activeTab === "advance"
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-700 dark:text-dark-200"
              }`}
            >
              <CreditCardIcon className="size-4" />
              <span>૪. દૈનિક ઉપાડ યાદી ({allAdvances.length})</span>
            </button>
          </div>

          {/* Search Box & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="કારીગર કે મશીન શોધો..."
                className="pl-8.5 text-xs h-9 w-48 sm:w-64"
              />
            </div>

            {activeTab === "salary-list" ? (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="સેલેરી સ્ટેટસ ફિલ્ટર"
                className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-700 shadow-xs focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
              >
                <option value="">તમામ સ્ટેટસ (All Status)</option>
                <option value="Pending">બાકી (Pending)</option>
                <option value="Paid">ચૂકતે (Paid)</option>
              </select>
            ) : (
              <select
                value={selectedWorkerFilter}
                onChange={(e) => setSelectedWorkerFilter(e.target.value)}
                aria-label="કારીગર ફિલ્ટર"
                className="h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-gray-700 shadow-xs focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
              >
                <option value="">તમામ કારીગરો (All Workers)</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}

            {(search || statusFilter || selectedWorkerFilter) && (
              <Button
                variant="flat"
                size="sm"
                className="h-9 text-rose-600 dark:text-rose-400"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setSelectedWorkerFilter("");
                }}
              >
                <XMarkIcon className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: WORKERS SALARY LIST                                     */}
        {/* ============================================================== */}
        {activeTab === "salary-list" && (
          <Card className="mt-4 overflow-hidden">
            <div className="overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700 dark:bg-dark-800/50">
                    <Th className="w-12 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      #
                    </Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      કારીગર (Worker Name & Role)
                    </Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      મશીન & હેડ (Machine & Heads)
                    </Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      માસિક પગાર (Salary ₹)
                    </Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      કુલ પ્રોડક્શન (Production ₹)
                    </Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      પ્રોડક્શન બોનસ (Bonus ₹)
                    </Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      કુલ ઉપાડ (Advance ₹)
                    </Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      ચૂકવવાપાત્ર (Net Due ₹)
                    </Th>
                    <Th className="w-28 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      સ્ટેટસ (Status)
                    </Th>
                    <Th className="w-36 px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                      એક્શન્સ (Actions)
                    </Th>
                  </Tr>
                </THead>
                <TBody>
                  {loading && workers.length === 0 ? (
                    <Tr>
                      <Td colSpan={10} className="py-12 text-center">
                        <Spinner className="size-8 text-primary-600" />
                        <p className="mt-2 text-xs text-gray-400">સેલેરી ડેટા લોડ થઈ રહ્યો છે...</p>
                      </Td>
                    </Tr>
                  ) : filteredWorkers.length === 0 ? (
                    <Tr>
                      <Td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                        કોઈ કારીગર મળ્યા નથી.
                      </Td>
                    </Tr>
                  ) : (
                    filteredWorkers.map((worker, index) => {
                      const isPaid = worker.paymentStatus === "Paid";
                      return (
                        <Tr
                          key={worker._id}
                          className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-dark-700 dark:hover:bg-dark-800/40"
                        >
                          <Td className="w-12 px-3 py-3 text-center text-xs text-gray-400">
                            {index + 1}
                          </Td>

                          {/* Worker Name & Role */}
                          <Td className="px-3.5 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailWorker(worker);
                                setDetailTab("overview");
                                setIsOpenDetailModal(true);
                              }}
                              className="text-left group"
                            >
                              <div className="font-bold text-gray-800 group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400 text-xs sm:text-sm">
                                {worker.name}
                              </div>
                              <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-700 dark:text-dark-300">
                                {worker.role || "Operator"} • {worker.mobileNumber}
                              </span>
                            </button>
                          </Td>

                          {/* Machine & Head */}
                          <Td className="px-3.5 py-3">
                            {worker.machineName || worker.machineCode ? (
                              <div className="flex flex-col text-xs">
                                <span className="font-semibold text-gray-800 dark:text-dark-100">
                                  {worker.machineName}
                                </span>
                                <span className="text-[11px] text-primary-600 dark:text-primary-400">
                                  [{worker.machineCode || "M"}] • {worker.machineHeadCount || 24} Heads
                                </span>
                              </div>
                            ) : (
                              <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400 dark:bg-dark-700">
                                ફાળવેલ નથી
                              </span>
                            )}
                          </Td>

                          {/* Monthly Salary */}
                          <Td className="px-3.5 py-3 text-xs font-bold text-gray-800 dark:text-dark-100">
                            ₹{(worker.monthlySalary || 0).toLocaleString("en-IN")}
                          </Td>

                          {/* Total Production */}
                          <Td className="px-3.5 py-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            ₹{(worker.monthProduction || 0).toLocaleString("en-IN")}
                          </Td>

                          {/* Total Bonus */}
                          <Td className="px-3.5 py-3 text-xs">
                            <div className="flex flex-col">
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                +₹{(worker.monthProductionBonus ?? worker.monthBonus ?? 0).toLocaleString("en-IN")}
                              </span>
                              {worker.monthOtherBonus > 0 && (
                                <span className="text-[10px] text-gray-400">
                                  (+₹{worker.monthOtherBonus.toLocaleString("en-IN")} અન્ય બોનસ)
                                </span>
                              )}
                            </div>
                          </Td>

                          {/* Total Advance */}
                          <Td className="px-3.5 py-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                            -₹{(worker.monthAdvance || 0).toLocaleString("en-IN")}
                          </Td>

                          {/* Net Payable */}
                          <Td className="px-3.5 py-3">
                            <span
                              className={`text-sm font-extrabold ${
                                isPaid
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-orange-600 dark:text-orange-400"
                              }`}
                            >
                              ₹{(worker.netPayable || 0).toLocaleString("en-IN")}
                            </span>
                          </Td>

                          {/* Payment Status */}
                          <Td className="w-28 px-3 py-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                <CheckCircleIcon className="size-3.5" />
                                ચૂકતે (Paid)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                <ClockIcon className="size-3.5" />
                                બાકી (Pending)
                              </span>
                            )}
                          </Td>

                          {/* Actions */}
                          <Td className="w-36 px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Full Profile Modal */}
                              <Button
                                variant="flat"
                                size="sm"
                                className="size-7.5 p-0 text-gray-600 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
                                title="સંપૂર્ણ હિસાબ અને વિગત (Full Details)"
                                onClick={() => {
                                  setDetailWorker(worker);
                                  setDetailTab("overview");
                                  setIsOpenDetailModal(true);
                                }}
                              >
                                <EyeIcon className="size-4" />
                              </Button>

                              {/* Add Production */}
                              <Button
                                variant="flat"
                                size="sm"
                                className="size-7.5 p-0 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-dark-700"
                                title="પ્રોડક્શન ઉમેરો (Add Production)"
                                onClick={() => handleOpenAddProduction(worker)}
                              >
                                <CpuChipIcon className="size-4" />
                              </Button>

                              {/* Add Advance */}
                              <Button
                                variant="flat"
                                size="sm"
                                className="size-7.5 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-dark-700"
                                title="ઉપાડ ઉમેરો (Add Advance)"
                                onClick={() => handleOpenAddAdvance(worker)}
                              >
                                <CreditCardIcon className="size-4" />
                              </Button>

                              {/* Settle Month / Pay Salary */}
                              {isPaid ? (
                                <Button
                                  variant="flat"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400"
                                  title="પગાર ચૂકતે થયેલ છે (ક્લિક કરી પતાવટ રદ કરી શકાય)"
                                  onClick={() =>
                                    handleCancelSettlement(worker._id, worker.settlement?._id)
                                  }
                                >
                                  Paid ✓
                                </Button>
                              ) : (
                                <Button
                                  color="primary"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] font-bold"
                                  title="પગાર ચૂકવો (Settle Month)"
                                  onClick={() => handleOpenSettleSalary(worker)}
                                >
                                  પગાર ચૂકવો
                                </Button>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </TBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MACHINE-WISE DAILY PRODUCTION                           */}
        {/* ============================================================== */}
        {activeTab === "production" && (
          <Card className="mt-4 overflow-hidden">
            <div className="flex flex-col gap-2 border-b border-gray-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-dark-700">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">
                  દૈનિક પ્રોડક્શન એન્ટ્રીઓ (Daily Production History)
                </h3>
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                  {filteredDailyProductions.length}
                </span>
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ⚡ મશીન મોડ્યુલ ઓટો-સિન્ક
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="flat"
                  size="sm"
                  className="gap-1.5 border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                  onClick={handleSyncMachineProduction}
                  disabled={isSyncingMachine || loading}
                >
                  <CpuChipIcon className={`size-3.5 ${isSyncingMachine ? "animate-spin" : ""}`} />
                  <span>મશીન ડેટા સિન્ક કરો</span>
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleOpenAddProduction(null)}
                >
                  <PlusIcon className="size-4" />
                  <span>નવી પ્રોડક્શન એન્ટ્રી</span>
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700 dark:bg-dark-800/50">
                    <Th className="w-12 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">#</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">તારીખ (Date)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">કારીગરનું નામ (Worker)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">મશીન & હેડ (Machine & Heads)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">દૈનિક પ્રોડક્શન (Amount ₹)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">લાગુ પડતું બોનસ (Bonus ₹)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">નોંધ (Remarks)</Th>
                    <Th className="w-24 px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">એક્શન</Th>
                  </Tr>
                </THead>
                <TBody>
                  {filteredDailyProductions.length === 0 ? (
                    <Tr>
                      <Td colSpan={8} className="py-12 text-center text-gray-400 text-xs">
                        કોઈ પ્રોડક્શન એન્ટ્રી મળેલ નથી.
                      </Td>
                    </Tr>
                  ) : (
                    filteredDailyProductions.map((p, index) => (
                      <Tr
                        key={p._id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-dark-700 dark:hover:bg-dark-800/40"
                      >
                        <Td className="w-12 px-3 py-3 text-center text-xs text-gray-400">
                          {index + 1}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs font-medium text-gray-700 dark:text-dark-200">
                          {dayjs(p.date).format("DD-MM-YYYY")}
                        </Td>
                        <Td className="px-3.5 py-3">
                          <span className="font-bold text-gray-800 dark:text-dark-100 text-xs">
                            {p.workerName}
                          </span>
                        </Td>
                        <Td className="px-3.5 py-3 text-xs text-gray-600 dark:text-dark-300">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-gray-800 dark:text-dark-100">
                              {p.machineName ? `${p.machineName} (${p.machineHeadCount || 24}H)` : "-"}
                            </span>
                            {p.machineDailyEntryId && (
                              <span className="w-fit rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                                મશીન મોડ્યુલ
                              </span>
                            )}
                          </div>
                        </Td>
                        <Td className="px-3.5 py-3 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          ₹{(Number(p.amount) || 0).toLocaleString("en-IN")}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs">
                          {(() => {
                            const bCalc = getBonusPreview(p.amount);
                            const actualBonus = p.bonusAmount || bCalc.bonus;
                            const actualSlab = p.slab || bCalc.slab;
                            return actualBonus > 0 ? (
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                +₹{Number(actualBonus).toLocaleString("en-IN")} ({actualSlab})
                              </span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">₹0 (નો-બોનસ)</span>
                            );
                          })()}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs text-gray-500 dark:text-dark-300">
                          {p.remarks || "-"}
                        </Td>
                        <Td className="w-24 px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="flat"
                              size="sm"
                              className="size-7 p-0 text-gray-600 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
                              title="સુધારો"
                              onClick={() => handleOpenEditProduction(p)}
                            >
                              <PencilSquareIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="flat"
                              size="sm"
                              className="size-7 p-0 text-gray-600 hover:text-rose-600 dark:text-dark-300 dark:hover:text-rose-400"
                              title="ડિલીટ"
                              onClick={() => handleDeleteProduction(p.workerId, p._id)}
                            >
                              <TrashIcon className="size-3.5" />
                            </Button>
                          </div>
                        </Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ============================================================== */}
        {/* TAB 3: DATE-WISE BONUS HISTORY                                 */}
        {/* ============================================================== */}
        {activeTab === "bonus" && (
          <Card className="mt-4 overflow-hidden">
            <div className="border-b border-gray-200 px-5 py-3 dark:border-dark-700">
              <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">
                ઓટોમેટિક પ્રોડક્શન બોનસ ઇતિહાસ (Automatic Bonus History)
              </h3>
              <p className="text-[11px] text-gray-400">
                નિયમ: ₹૫,૦૦,૦૦૦ થી ₹૫,૫૦,૦૦૦ વચ્ચે ₹૫૦ અને દર વધારાના ₹૫૦,૦૦૦ એ ₹૫૦ આપોઆપ ઉમેરાય છે.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700 dark:bg-dark-800/50">
                    <Th className="w-12 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">#</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">બોનસ તારીખ (Bonus Date)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">કારીગરનું નામ (Worker)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">ઓપરેટ કરતું મશીન</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">દૈનિક ઉત્પાદન (Production ₹)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">લાગુ પડતો સ્લેબ (Production Slab)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">બોનસ રકમ (Bonus Amount)</Th>
                  </Tr>
                </THead>
                <TBody>
                  {filteredBonuses.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} className="py-12 text-center text-gray-400 text-xs">
                        આ મહિનામાં કોઈ બોનસ રેકોર્ડ મળેલ નથી.
                      </Td>
                    </Tr>
                  ) : (
                    filteredBonuses.map((b, index) => (
                      <Tr
                        key={b._id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-dark-700 dark:hover:bg-dark-800/40"
                      >
                        <Td className="w-12 px-3 py-3 text-center text-xs text-gray-400">
                          {index + 1}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs font-medium text-gray-700 dark:text-dark-200">
                          {dayjs(b.date).format("DD-MM-YYYY")}
                        </Td>
                        <Td className="px-3.5 py-3">
                          <span className="font-bold text-gray-800 dark:text-dark-100 text-xs">
                            {b.workerName}
                          </span>
                        </Td>
                        <Td className="px-3.5 py-3 text-xs text-gray-600 dark:text-dark-300">
                          {b.machineName || "-"}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          ₹{(Number(b.productionAmount) || 0).toLocaleString("en-IN")}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs">
                          <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                            {b.slab || "₹5,00,000 – ₹5,49,999"}
                          </span>
                        </Td>
                        <Td className="px-3.5 py-3 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          +₹{(Number(b.amount) || 0).toLocaleString("en-IN")}
                        </Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </Card>
        )}

        {/* ============================================================== */}
        {/* TAB 4: DAILY ADVANCE / UPAD MANAGEMENT                         */}
        {/* ============================================================== */}
        {activeTab === "advance" && (
          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-700">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">
                  દૈનિક ઉપાડ હિસાબ (Daily Advance / Upad History)
                </h3>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {filteredAdvances.length}
                </span>
              </div>
              <Button
                color="primary"
                size="sm"
                className="gap-1.5"
                onClick={() => handleOpenAddAdvance(null)}
              >
                <PlusIcon className="size-4" />
                <span>નવો ઉપાડ નોંધો</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700 dark:bg-dark-800/50">
                    <Th className="w-12 px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">#</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">ઉપાડ તારીખ (Date)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">કારીગરનું નામ (Worker)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">ઉપાડ રકમ (Amount ₹)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">ચુકવણી માધ્યમ (Method)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">શેરો / કારણ (Description)</Th>
                    <Th className="px-3.5 py-3 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">નોંધનાર (Added By)</Th>
                    <Th className="w-24 px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">એક્શન</Th>
                  </Tr>
                </THead>
                <TBody>
                  {filteredAdvances.length === 0 ? (
                    <Tr>
                      <Td colSpan={8} className="py-12 text-center text-gray-400 text-xs">
                        આ મહિનામાં કોઈ ઉપાડ નોંધાયેલ નથી.
                      </Td>
                    </Tr>
                  ) : (
                    filteredAdvances.map((adv, index) => (
                      <Tr
                        key={adv._id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-dark-700 dark:hover:bg-dark-800/40"
                      >
                        <Td className="w-12 px-3 py-3 text-center text-xs text-gray-400">
                          {index + 1}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs font-medium text-gray-700 dark:text-dark-200">
                          {dayjs(adv.date).format("DD-MM-YYYY")}
                        </Td>
                        <Td className="px-3.5 py-3">
                          <span className="font-bold text-gray-800 dark:text-dark-100 text-xs">
                            {adv.workerName}
                          </span>
                        </Td>
                        <Td className="px-3.5 py-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                          ₹{(Number(adv.amount) || 0).toLocaleString("en-IN")}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                              adv.paymentMethod === "Online" || adv.paymentMethod === "ઓનલાઇન"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            }`}
                          >
                            {adv.paymentMethod}
                          </span>
                        </Td>
                        <Td className="px-3.5 py-3 text-xs text-gray-500 dark:text-dark-300">
                          {adv.note || "-"}
                        </Td>
                        <Td className="px-3.5 py-3 text-xs text-gray-400">
                          {adv.addedBy || "Admin"}
                        </Td>
                        <Td className="w-24 px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="flat"
                              size="sm"
                              className="size-7 p-0 text-gray-600 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
                              title="સુધારો"
                              onClick={() => handleOpenEditAdvance(adv)}
                            >
                              <PencilSquareIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="flat"
                              size="sm"
                              className="size-7 p-0 text-gray-600 hover:text-rose-600 dark:text-dark-300 dark:hover:text-rose-400"
                              title="ડિલીટ"
                              onClick={() => handleDeleteAdvance(adv.workerId, adv._id)}
                            >
                              <TrashIcon className="size-3.5" />
                            </Button>
                          </div>
                        </Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      {/* ============================================================== */}
      {/* 🛠️ MODAL 1: ADD / EDIT DAILY PRODUCTION (WITH LIVE BONUS)      */}
      {/* ============================================================== */}
      <Transition appear show={isOpenProductionModal} as="div">
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !submittingProduction && setIsOpenProductionModal(false)}
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
                <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all dark:bg-dark-800">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-700">
                    <div className="flex items-center space-x-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                        <CpuChipIcon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                          {isEditingProduction
                            ? "દૈનિક પ્રોડક્શન સુધારો (Edit Production)"
                            : "દૈનિક પ્રોડક્શન ઉમેરો (Add Production)"}
                        </h3>
                        <p className="text-xs text-gray-400">
                          રૂ. ૫,૦૦,૦૦૦ થી વધુ ઉત્પાદન પર બોનસ આપોઆપ ગણાશે
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                      onClick={() => setIsOpenProductionModal(false)}
                      disabled={submittingProduction}
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitProduction} className="mt-4 space-y-4">
                    {/* Worker Selection */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        કારીગર પસંદ કરો (Select Worker) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={productionForm.workerId}
                        onChange={(e) => {
                          const wId = e.target.value;
                          setProductionForm((prev) => ({ ...prev, workerId: wId }));
                          setProductionTargetWorker(workers.find((w) => w._id === wId) || null);
                        }}
                        disabled={isEditingProduction}
                        aria-label="કારીગર પસંદ કરો"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-xs focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                      >
                        <option value="">-- કારીગર પસંદ કરો --</option>
                        {workers.map((w) => (
                          <option key={w._id} value={w._id}>
                            {w.name} {w.machineName ? `(મશીન: ${w.machineName} [${w.machineHeadCount || 24}H])` : "(કોઈ મશીન નથી)"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Auto-filled Machine Info Badge */}
                    {productionTargetWorker && (
                      <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-dark-700/50 text-xs">
                        <span className="font-semibold text-gray-700 dark:text-dark-200">
                          ફાળવેલ મશીન:{" "}
                        </span>
                        <span className="text-primary-600 dark:text-primary-400 font-bold">
                          {productionTargetWorker.machineName || "કોઈ મશીન ફાળવેલ નથી"}
                        </span>
                        {productionTargetWorker.machineCode && (
                          <span className="ml-1 text-gray-500">
                            [{productionTargetWorker.machineCode}] •{" "}
                            {productionTargetWorker.machineHeadCount || 24} Heads
                          </span>
                        )}
                      </div>
                    )}

                    {/* Date and Amount */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          પ્રોડક્શન તારીખ (Date) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={productionForm.date}
                          onChange={(e) =>
                            setProductionForm((prev) => ({ ...prev, date: e.target.value }))
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          દૈનિક ઉત્પાદન રકમ (Production ₹) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="દા.ત. 520000"
                          value={productionForm.amount}
                          onChange={(e) =>
                            setProductionForm((prev) => ({ ...prev, amount: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {/* 🎁 LIVE DYNAMIC BONUS PREVIEW BOX */}
                    <div
                      className={`rounded-xl border p-3 transition-all ${
                        liveBonusPreview.isEligible
                          ? "border-emerald-300 bg-emerald-50/70 dark:border-emerald-700/40 dark:bg-emerald-950/30"
                          : "border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GiftIcon
                            className={`size-4.5 ${
                              liveBonusPreview.isEligible
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-gray-400"
                            }`}
                          />
                          <span className="text-xs font-bold text-gray-800 dark:text-dark-50">
                            લાગુ પડતું બોનસ (Applicable Bonus)
                          </span>
                        </div>
                        <span
                          className={`text-sm font-extrabold ${
                            liveBonusPreview.isEligible
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-400"
                          }`}
                        >
                          ₹{liveBonusPreview.bonus}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-dark-300">
                        સ્લેબ: <span className="font-semibold">{liveBonusPreview.slab}</span>
                      </p>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        નોંધ / વિગત (Remarks)
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="શિફ્ટ, ડિઝાઈન અથવા વધારાની નોંધ..."
                        value={productionForm.remarks}
                        onChange={(e) =>
                          setProductionForm((prev) => ({ ...prev, remarks: e.target.value }))
                        }
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-dark-700">
                      <Button
                        type="button"
                        variant="flat"
                        onClick={() => setIsOpenProductionModal(false)}
                        disabled={submittingProduction}
                      >
                        રદ કરો
                      </Button>
                      <Button
                        type="submit"
                        color="primary"
                        className="gap-2"
                        disabled={submittingProduction}
                      >
                        {submittingProduction && <Spinner className="size-4 text-white" />}
                        <span>
                          {isEditingProduction ? "અપડેટ કરો" : "પ્રોડક્શન સેવ કરો"}
                        </span>
                      </Button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ============================================================== */}
      {/* 💸 MODAL 2: ADD / EDIT ADVANCE (ઉપાડ)                           */}
      {/* ============================================================== */}
      <Transition appear show={isOpenAdvanceModal} as="div">
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !submittingAdvance && setIsOpenAdvanceModal(false)}
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
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all dark:bg-dark-800">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-700">
                    <div className="flex items-center space-x-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                        <CreditCardIcon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                          {isEditingAdvance ? "ઉપાડ સુધારો (Edit Advance)" : "ઉપાડ નોંધો (Add Advance)"}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {advanceTargetWorker?.name ? `${advanceTargetWorker.name} • ` : ""}કારીગરે લીધેલ રોકડ અથવા ઓનલાઇન ઉપાડ
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                      onClick={() => setIsOpenAdvanceModal(false)}
                      disabled={submittingAdvance}
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitAdvance} className="mt-4 space-y-4">
                    {/* Worker Select */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        કારીગર (Worker) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={advanceForm.workerId}
                        onChange={(e) =>
                          setAdvanceForm((prev) => ({ ...prev, workerId: e.target.value }))
                        }
                        disabled={isEditingAdvance}
                        aria-label="કારીગર પસંદ કરો"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-xs focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                      >
                        <option value="">-- કારીગર પસંદ કરો --</option>
                        {workers.map((w) => (
                          <option key={w._id} value={w._id}>
                            {w.name} ({w.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Amount & Date */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          ઉપાડ રકમ (Amount ₹) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="દા.ત. 1500"
                          value={advanceForm.amount}
                          onChange={(e) =>
                            setAdvanceForm((prev) => ({ ...prev, amount: e.target.value }))
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          ઉપાડ તારીખ (Date)
                        </label>
                        <Input
                          type="date"
                          value={advanceForm.date}
                          onChange={(e) =>
                            setAdvanceForm((prev) => ({ ...prev, date: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {/* Payment Method & Added By */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          ચુકવણી માધ્યમ (Method)
                        </label>
                        <select
                          value={advanceForm.paymentMethod}
                          onChange={(e) =>
                            setAdvanceForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                          }
                          aria-label="ચુકવણી માધ્યમ"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-xs focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                        >
                          <option value="Cash">રોકડ (Cash)</option>
                          <option value="Online">ઓનલાઇન (GPay / UPI)</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          નોંધનાર (Added By)
                        </label>
                        <Input
                          type="text"
                          value={advanceForm.addedBy}
                          onChange={(e) =>
                            setAdvanceForm((prev) => ({ ...prev, addedBy: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        શેરો / કારણ (Remarks)
                      </label>
                      <Input
                        type="text"
                        placeholder="દા.ત. ઘરખર્ચ / મેડિકલ ઉપાડ"
                        value={advanceForm.note}
                        onChange={(e) =>
                          setAdvanceForm((prev) => ({ ...prev, note: e.target.value }))
                        }
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-dark-700">
                      <Button
                        type="button"
                        variant="flat"
                        onClick={() => setIsOpenAdvanceModal(false)}
                        disabled={submittingAdvance}
                      >
                        રદ કરો
                      </Button>
                      <Button
                        type="submit"
                        color="error"
                        className="gap-2"
                        disabled={submittingAdvance}
                      >
                        {submittingAdvance && <Spinner className="size-4 text-white" />}
                        <span>{isEditingAdvance ? "અપડેટ કરો" : "ઉપાડ સેવ કરો"}</span>
                      </Button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ============================================================== */}
      {/* 💳 MODAL 3: PAY SALARY / SETTLE MONTH (પગાર પતાવટ)              */}
      {/* ============================================================== */}
      <Transition appear show={isOpenSettleModal} as="div">
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !submittingSettle && setIsOpenSettleModal(false)}
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
                <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all dark:bg-dark-800">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-700">
                    <div className="flex items-center space-x-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <BanknotesIcon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                          પગાર પતાવટ (Settle Month Salary)
                        </h3>
                        <p className="text-xs text-gray-400">
                          {settleWorker?.name} • {dayjs(selectedMonth + "-01").format("MMMM YYYY")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                      onClick={() => setIsOpenSettleModal(false)}
                      disabled={submittingSettle}
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  </div>

                  {settleWorker && (
                    <form onSubmit={handleSubmitSettleSalary} className="mt-4 space-y-4">
                      {/* Financial Calculation Breakdown */}
                      <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-dark-700/60 text-xs space-y-2">
                        <div className="flex justify-between text-gray-600 dark:text-dark-300">
                          <span>માસિક મૂળ પગાર (Basic Salary):</span>
                          <span className="font-bold text-gray-900 dark:text-dark-50">
                            ₹{(settleWorker.monthlySalary || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                          <span>+ કુલ બોનસ (Total Production Bonus):</span>
                          <span className="font-bold">
                            +₹{(settleWorker.monthBonus || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="flex justify-between text-rose-600 dark:text-rose-400">
                          <span>- કુલ ઉપાડ (Total Advance):</span>
                          <span className="font-bold">
                            -₹{(settleWorker.monthAdvance || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 dark:border-dark-600 pt-2 flex justify-between text-sm font-extrabold text-primary-600 dark:text-primary-400">
                          <span>આખરી ચૂકવવાપાત્ર રકમ (Net Payable):</span>
                          <span>₹{(settleWorker.netPayable || 0).toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      {/* Payment Mode and Date */}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                            ચુકવણી માધ્યમ (Payment Mode)
                          </label>
                          <select
                            value={settleForm.paymentMode}
                            onChange={(e) =>
                              setSettleForm((prev) => ({ ...prev, paymentMode: e.target.value }))
                            }
                            aria-label="ચુકવણી માધ્યમ"
                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-xs focus:border-primary-500 focus:outline-none dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                          >
                            <option value="Cash">રોકડ (Cash)</option>
                            <option value="Online">ઓનલાઇન (GPay / UPI)</option>
                            <option value="Bank Transfer">બેંક ટ્રાન્સફર (NEFT / IMPS)</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                            ચુકવણી તારીખ (Date)
                          </label>
                          <Input
                            type="date"
                            value={settleForm.settlementDate}
                            onChange={(e) =>
                              setSettleForm((prev) => ({
                                ...prev,
                                settlementDate: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          પગાર પતાવટ નોંધ (Notes)
                        </label>
                        <Input
                          type="text"
                          value={settleForm.notes}
                          onChange={(e) =>
                            setSettleForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          placeholder="દા.ત. હિસાબ ચૂકતે કર્યો"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-dark-700">
                        <Button
                          type="button"
                          variant="flat"
                          onClick={() => setIsOpenSettleModal(false)}
                          disabled={submittingSettle}
                        >
                          રદ કરો
                        </Button>
                        <Button
                          type="submit"
                          color="primary"
                          className="gap-2"
                          disabled={submittingSettle}
                        >
                          {submittingSettle && <Spinner className="size-4 text-white" />}
                          <span>પગાર ચૂકતે કરો (Confirm & Settle)</span>
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* ============================================================== */}
      {/* 🔍 SECTION 7: WORKER SALARY DETAILS MODAL (6 COMPLETE TABS)     */}
      {/* ============================================================== */}
      <Transition appear show={isOpenDetailModal} as="div">
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsOpenDetailModal(false)}
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
                <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-5 sm:p-6 text-left align-middle shadow-2xl transition-all dark:bg-dark-800 max-h-[90vh] flex flex-col">
                  {detailWorker && (
                    <>
                      {/* Modal Top Header */}
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-700">
                        <div className="flex items-center space-x-3">
                          <div className="flex size-11 items-center justify-center rounded-full bg-primary-100 font-bold text-sm text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                            {(detailWorker.name || "W")[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-50">
                              {detailWorker.name}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {detailWorker.role} • {detailWorker.mobileNumber} •{" "}
                              {dayjs(selectedMonth + "-01").format("MMMM YYYY")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700"
                          onClick={() => setIsOpenDetailModal(false)}
                        >
                          <XMarkIcon className="size-5" />
                        </button>
                      </div>

                      {/* 6 Tabs Navigator */}
                      <div className="mt-3 flex overflow-x-auto border-b border-gray-200 dark:border-dark-700 text-xs font-bold gap-1 pb-1">
                        <button
                          type="button"
                          onClick={() => setDetailTab("overview")}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                            detailTab === "overview"
                              ? "bg-primary-600 text-white"
                              : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                          }`}
                        >
                          ૧. પગાર સારાંશ (Overview)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailTab("machine")}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                            detailTab === "machine"
                              ? "bg-primary-600 text-white"
                              : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                          }`}
                        >
                          ૨. મશીન વિગત (Machine)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailTab("production")}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                            detailTab === "production"
                              ? "bg-primary-600 text-white"
                              : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                          }`}
                        >
                          ૩. પ્રોડક્શન ({detailWorker.monthDailyProductions?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailTab("bonus")}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                            detailTab === "bonus"
                              ? "bg-primary-600 text-white"
                              : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                          }`}
                        >
                          ૪. બોનસ ({detailWorker.monthBonuses?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailTab("advance")}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                            detailTab === "advance"
                              ? "bg-primary-600 text-white"
                              : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                          }`}
                        >
                          ૫. ઉપાડ ({detailWorker.monthAdvances?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailTab("payments")}
                          className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                            detailTab === "payments"
                              ? "bg-primary-600 text-white"
                              : "text-gray-600 hover:bg-gray-100 dark:text-dark-300 dark:hover:bg-dark-700"
                          }`}
                        >
                          ૬. ચુકવણી ઇતિહાસ ({detailWorker.monthlySettlements?.length || 0})
                        </button>
                      </div>

                      {/* Tab Contents Area (Scrollable) */}
                      <div className="mt-4 grow overflow-y-auto pr-1 text-xs">
                        {/* TAB 1: SALARY OVERVIEW */}
                        {detailTab === "overview" && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-dark-700/50">
                                <span className="text-gray-400">મૂળ માસિક પગાર:</span>
                                <p className="mt-1 text-lg font-bold text-gray-800 dark:text-dark-100">
                                  ₹{(detailWorker.monthlySalary || 0).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="rounded-xl bg-emerald-50/70 p-3.5 dark:bg-emerald-950/30">
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                  કુલ પ્રોડક્શન બોનસ:
                                </span>
                                <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                  +₹{(detailWorker.monthBonus || 0).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="rounded-xl bg-rose-50/70 p-3.5 dark:bg-rose-950/30">
                                <span className="text-rose-700 dark:text-rose-400 font-semibold">
                                  કુલ ઉપાડ (Advance):
                                </span>
                                <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
                                  -₹{(detailWorker.monthAdvance || 0).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="rounded-xl bg-primary-50 p-3.5 dark:bg-primary-950/40">
                                <span className="text-primary-700 dark:text-primary-400 font-semibold">
                                  ચૂકવવાપાત્ર (Net Due):
                                </span>
                                <p className="mt-1 text-xl font-extrabold text-primary-600 dark:text-primary-400">
                                  ₹{(detailWorker.netPayable || 0).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-dark-700/50">
                                <span className="text-gray-400">ચૂકવેલ રકમ:</span>
                                <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{(detailWorker.paidAmount || 0).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-dark-700/50">
                                <span className="text-gray-400">ચુકવણી સ્થિતિ:</span>
                                <p className="mt-1">
                                  {detailWorker.paymentStatus === "Paid" ? (
                                    <span className="font-bold text-emerald-600">ચૂકતે (Paid ✓)</span>
                                  ) : (
                                    <span className="font-bold text-amber-600">બાકી (Pending)</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Quick Action Buttons inside modal */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-dark-700">
                              <Button
                                size="sm"
                                variant="flat"
                                color="primary"
                                className="gap-1.5"
                                onClick={() => handleOpenAddProduction(detailWorker)}
                              >
                                <CpuChipIcon className="size-4" />
                                <span>પ્રોડક્શન ઉમેરો</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="flat"
                                className="gap-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-dark-700"
                                onClick={() => handleOpenAddAdvance(detailWorker)}
                              >
                                <CreditCardIcon className="size-4" />
                                <span>ઉપાડ ઉમેરો</span>
                              </Button>
                              {detailWorker.paymentStatus !== "Paid" && (
                                <Button
                                  size="sm"
                                  color="primary"
                                  className="gap-1.5"
                                  onClick={() => handleOpenSettleSalary(detailWorker)}
                                >
                                  <CheckCircleIcon className="size-4" />
                                  <span>પગાર પતાવટ કરો</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* TAB 2: MACHINE DETAILS */}
                        {detailTab === "machine" && (
                          <div className="rounded-xl border border-gray-200 p-4 dark:border-dark-700 space-y-3">
                            <h4 className="font-bold text-sm text-gray-800 dark:text-dark-50">
                              ઓપરેટ કરતા મશીનની માહિતી (Machine Information)
                            </h4>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              <div>
                                <span className="text-gray-400">મશીનનું નામ:</span>
                                <p className="font-semibold text-gray-800 dark:text-dark-100 mt-0.5">
                                  {detailWorker.machineName || "ફાળવેલ નથી"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">મશીન કોડ / નંબર:</span>
                                <p className="font-semibold text-gray-800 dark:text-dark-100 mt-0.5">
                                  {detailWorker.machineCode || "-"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">હેડ કાઉન્ટ (Head Count):</span>
                                <p className="font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                                  {detailWorker.machineHeadCount || 24} Heads
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">મશીન પ્રકાર (Type):</span>
                                <p className="font-semibold text-gray-800 dark:text-dark-100 mt-0.5">
                                  {detailWorker.machineType || "Embroidery Machine"}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">બોનસ ટાર્ગેટ સ્લેબ:</span>
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                  ₹૫,૦૦,૦૦૦ થી બોનસ શરૂ
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-400">જોઇનિંગ તારીખ:</span>
                                <p className="font-semibold text-gray-800 dark:text-dark-100 mt-0.5">
                                  {detailWorker.joinDate
                                    ? dayjs(detailWorker.joinDate).format("DD-MM-YYYY")
                                    : "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB 3: DAILY PRODUCTION */}
                        {detailTab === "production" && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-700 dark:text-dark-100">
                                આ મહિનાનું દૈનિક પ્રોડક્શન ({detailWorker.monthDailyProductions?.length || 0})
                              </span>
                              <Button
                                size="sm"
                                color="primary"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleOpenAddProduction(detailWorker)}
                              >
                                <PlusIcon className="size-3.5" />
                                <span>પ્રોડક્શન ઉમેરો</span>
                              </Button>
                            </div>
                            <Table hoverable className="w-full text-left">
                              <THead>
                                <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700 dark:bg-dark-800/50">
                                  <Th className="px-3 py-2 text-xs">તારીખ</Th>
                                  <Th className="px-3 py-2 text-xs">ઉત્પાદન રકમ</Th>
                                  <Th className="px-3 py-2 text-xs">બોનસ</Th>
                                  <Th className="px-3 py-2 text-xs">નોંધ</Th>
                                  <Th className="px-3 py-2 text-xs text-right">એક્શન</Th>
                                </Tr>
                              </THead>
                              <TBody>
                                {(detailWorker.monthDailyProductions || []).length === 0 ? (
                                  <Tr>
                                    <Td colSpan={5} className="py-6 text-center text-gray-400">
                                      કોઈ પ્રોડક્શન નોંધાયેલ નથી.
                                    </Td>
                                  </Tr>
                                ) : (
                                  detailWorker.monthDailyProductions.map((p) => (
                                    <Tr key={p._id} className="border-b border-gray-100">
                                      <Td className="px-3 py-2">
                                        {dayjs(p.date).format("DD-MM-YYYY")}
                                      </Td>
                                      <Td className="px-3 py-2 font-bold text-indigo-600">
                                        ₹{(Number(p.amount) || 0).toLocaleString("en-IN")}
                                      </Td>
                                      <Td className="px-3 py-2 font-bold text-emerald-600">
                                        {p.bonusAmount > 0 ? `+₹${p.bonusAmount}` : "-"}
                                      </Td>
                                      <Td className="px-3 py-2 text-gray-400">{p.remarks || "-"}</Td>
                                      <Td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            variant="flat"
                                            size="sm"
                                            className="size-6 p-0"
                                            onClick={() => handleOpenEditProduction(p, detailWorker)}
                                          >
                                            <PencilSquareIcon className="size-3" />
                                          </Button>
                                          <Button
                                            variant="flat"
                                            size="sm"
                                            className="size-6 p-0 text-rose-600"
                                            onClick={() => handleDeleteProduction(detailWorker._id, p._id)}
                                          >
                                            <TrashIcon className="size-3" />
                                          </Button>
                                        </div>
                                      </Td>
                                    </Tr>
                                  ))
                                )}
                              </TBody>
                            </Table>
                          </div>
                        )}

                        {/* TAB 4: BONUS HISTORY */}
                        {detailTab === "bonus" && (
                          <div className="space-y-3">
                            <span className="font-bold text-gray-700 dark:text-dark-100">
                              બોનસ એન્ટ્રીઓ ({detailWorker.monthBonuses?.length || 0})
                            </span>
                            <Table hoverable className="w-full text-left">
                              <THead>
                                <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700">
                                  <Th className="px-3 py-2 text-xs">તારીખ</Th>
                                  <Th className="px-3 py-2 text-xs">ઉત્પાદન રકમ</Th>
                                  <Th className="px-3 py-2 text-xs">સ્લેબ / કારણ</Th>
                                  <Th className="px-3 py-2 text-xs text-right">બોનસ રકમ</Th>
                                </Tr>
                              </THead>
                              <TBody>
                                {(detailWorker.monthBonuses || []).length === 0 ? (
                                  <Tr>
                                    <Td colSpan={4} className="py-6 text-center text-gray-400">
                                      આ મહિનામાં કોઈ બોનસ મળેલ નથી.
                                    </Td>
                                  </Tr>
                                ) : (
                                  detailWorker.monthBonuses.map((b) => (
                                    <Tr key={b._id} className="border-b border-gray-100">
                                      <Td className="px-3 py-2">
                                        {dayjs(b.date).format("DD-MM-YYYY")}
                                      </Td>
                                      <Td className="px-3 py-2 font-bold text-indigo-600">
                                        ₹{(Number(b.productionAmount) || 0).toLocaleString("en-IN")}
                                      </Td>
                                      <Td className="px-3 py-2 text-gray-600">
                                        {b.reason || b.slab || "દૈનિક પ્રોડક્શન બોનસ"}
                                      </Td>
                                      <Td className="px-3 py-2 text-right font-extrabold text-emerald-600">
                                        +₹{(Number(b.amount) || 0).toLocaleString("en-IN")}
                                      </Td>
                                    </Tr>
                                  ))
                                )}
                              </TBody>
                            </Table>
                          </div>
                        )}

                        {/* TAB 5: ADVANCE / UPAD HISTORY */}
                        {detailTab === "advance" && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-700 dark:text-dark-100">
                                આ મહિનાના ઉપાડ ({detailWorker.monthAdvances?.length || 0})
                              </span>
                              <Button
                                size="sm"
                                color="error"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleOpenAddAdvance(detailWorker)}
                              >
                                <PlusIcon className="size-3.5" />
                                <span>ઉપાડ ઉમેરો</span>
                              </Button>
                            </div>
                            <Table hoverable className="w-full text-left">
                              <THead>
                                <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700">
                                  <Th className="px-3 py-2 text-xs">તારીખ</Th>
                                  <Th className="px-3 py-2 text-xs">રકમ</Th>
                                  <Th className="px-3 py-2 text-xs">માધ્યમ</Th>
                                  <Th className="px-3 py-2 text-xs">નોંધ</Th>
                                  <Th className="px-3 py-2 text-xs text-right">એક્શન</Th>
                                </Tr>
                              </THead>
                              <TBody>
                                {(detailWorker.monthAdvances || []).length === 0 ? (
                                  <Tr>
                                    <Td colSpan={5} className="py-6 text-center text-gray-400">
                                      કોઈ ઉપાડ નોંધાયેલ નથી.
                                    </Td>
                                  </Tr>
                                ) : (
                                  detailWorker.monthAdvances.map((adv) => (
                                    <Tr key={adv._id} className="border-b border-gray-100">
                                      <Td className="px-3 py-2">
                                        {dayjs(adv.date).format("DD-MM-YYYY")}
                                      </Td>
                                      <Td className="px-3 py-2 font-bold text-rose-600">
                                        ₹{(Number(adv.amount) || 0).toLocaleString("en-IN")}
                                      </Td>
                                      <Td className="px-3 py-2">{adv.paymentMethod}</Td>
                                      <Td className="px-3 py-2 text-gray-400">{adv.note || "-"}</Td>
                                      <Td className="px-3 py-2 text-right">
                                        <Button
                                          variant="flat"
                                          size="sm"
                                          className="size-6 p-0 text-rose-600"
                                          onClick={() => handleDeleteAdvance(detailWorker._id, adv._id)}
                                        >
                                          <TrashIcon className="size-3" />
                                        </Button>
                                      </Td>
                                    </Tr>
                                  ))
                                )}
                              </TBody>
                            </Table>
                          </div>
                        )}

                        {/* TAB 6: SALARY PAYMENT HISTORY */}
                        {detailTab === "payments" && (
                          <div className="space-y-3">
                            <span className="font-bold text-gray-700 dark:text-dark-100">
                              તમામ મહિનાના પગાર પતાવટ ઇતિહાસ ({detailWorker.monthlySettlements?.length || 0})
                            </span>
                            <Table hoverable className="w-full text-left">
                              <THead>
                                <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700">
                                  <Th className="px-3 py-2 text-xs">મહિનો (Month)</Th>
                                  <Th className="px-3 py-2 text-xs">મૂળ પગાર</Th>
                                  <Th className="px-3 py-2 text-xs">બોનસ</Th>
                                  <Th className="px-3 py-2 text-xs">ઉપાડ</Th>
                                  <Th className="px-3 py-2 text-xs font-bold">ચૂકવેલ રકમ</Th>
                                  <Th className="px-3 py-2 text-xs">માધ્યમ & તારીખ</Th>
                                </Tr>
                              </THead>
                              <TBody>
                                {(detailWorker.monthlySettlements || []).length === 0 ? (
                                  <Tr>
                                    <Td colSpan={6} className="py-6 text-center text-gray-400">
                                      હજી સુધી કોઈ મહિનો સેટલ કરેલ નથી.
                                    </Td>
                                  </Tr>
                                ) : (
                                  detailWorker.monthlySettlements.map((s) => (
                                    <Tr key={s._id} className="border-b border-gray-100">
                                      <Td className="px-3 py-2 font-bold text-primary-600">
                                        {s.month}
                                      </Td>
                                      <Td className="px-3 py-2">₹{(s.baseSalary || 0).toLocaleString("en-IN")}</Td>
                                      <Td className="px-3 py-2 text-emerald-600">+₹{(s.totalBonus || 0).toLocaleString("en-IN")}</Td>
                                      <Td className="px-3 py-2 text-rose-600">-₹{(s.totalWithdrawals || 0).toLocaleString("en-IN")}</Td>
                                      <Td className="px-3 py-2 font-bold text-emerald-600">
                                        ₹{(s.netPaid || 0).toLocaleString("en-IN")}
                                      </Td>
                                      <Td className="px-3 py-2 text-gray-500">
                                        {s.paymentMode} ({s.settlementDate ? dayjs(s.settlementDate).format("DD-MM-YYYY") : "-"})
                                      </Td>
                                    </Tr>
                                  ))
                                )}
                              </TBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </Page>
  );
}

