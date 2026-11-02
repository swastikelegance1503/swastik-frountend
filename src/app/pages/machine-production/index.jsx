// Import Dependencies
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CpuChipIcon,
  BanknotesIcon,
  XMarkIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { toast } from "sonner";
import dayjs from "dayjs";

// Local UI Component Imports from components/ui
import {
  Button,
  Card,
  Input,
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

// ગુજરાતી વાર સહાયક (Gujarati Day of Week)
const GUJ_DAYS = ["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"];
function formatGujaratiDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  const dayName = GUJ_DAYS[d.getDay()] || "";
  return `${dayjs(dateStr).format("DD-MM-YYYY")} (${dayName})`;
}

export default function MachineProductionPage() {
  // Selected Month (YYYY-MM format)
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().format("YYYY-MM"));

  // State
  const [machines, setMachines] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters: Date wise & Machine wise
  const [dateFilter, setDateFilter] = useState("");
  const [machineFilter, setMachineFilter] = useState("");

  // Modal State for Add Production (Only Date, Machine, Production Value)
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    machineId: "",
    amount: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // ----------------------------------------------------------------------
  // API CALLS
  // ----------------------------------------------------------------------
  const fetchMachines = useCallback(async () => {
    try {
      const res = await axios.get("/machines");
      if (res.data?.success) {
        setMachines(res.data.machines || []);
      }
    } catch (err) {
      console.error("Error fetching machines:", err);
    }
  }, []);

  const fetchEntries = useCallback(async (month = selectedMonth, dt = dateFilter, mId = machineFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (month) params.append("month", month);
      if (dt) params.append("date", dt);
      if (mId) params.append("machineId", mId);

      const res = await axios.get(`/machines/daily-productions?${params.toString()}`);
      if (res.data?.success) {
        setEntries(res.data.entries || []);
      }
    } catch (err) {
      console.error("Error fetching production entries:", err);
      toast.error(err?.message || "પ્રોડક્શન માહિતી લાવવામાં ભૂલ આવી");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedMonth, dateFilter, machineFilter]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  useEffect(() => {
    fetchEntries(selectedMonth, dateFilter, machineFilter);
  }, [fetchEntries, selectedMonth, dateFilter, machineFilter]);

  // Month Navigation
  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
    fetchEntries(newMonth, dateFilter, machineFilter);
  };

  const handlePrevMonth = () => {
    const prev = dayjs(selectedMonth + "-01").subtract(1, "month").format("YYYY-MM");
    handleMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = dayjs(selectedMonth + "-01").add(1, "month").format("YYYY-MM");
    handleMonthChange(next);
  };

  const monthOptions = useMemo(() => {
    const list = [];
    const base = dayjs();
    for (let i = -12; i <= 3; i++) {
      const d = base.add(i, "month");
      list.push({
        value: d.format("YYYY-MM"),
        label: d.format("MMMM YYYY"),
        isCurrent: d.format("YYYY-MM") === base.format("YYYY-MM"),
      });
    }
    return list;
  }, []);

  const isCurrentCalendarMonth = selectedMonth === dayjs().format("YYYY-MM");

  // Filtered Totals
  const totals = useMemo(() => {
    const totalAmount = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const uniqueDates = new Set(
      entries.map((e) => (e.date ? new Date(e.date).toISOString().split("T")[0] : ""))
    ).size;
    const uniqueMachines = new Set(entries.map((e) => (e.machineId || "").toString())).size;

    return {
      totalAmount,
      totalEntries: entries.length,
      uniqueDates: uniqueDates || (entries.length > 0 ? 1 : 0),
      uniqueMachines: uniqueMachines || (entries.length > 0 ? 1 : 0),
      avgPerDay: uniqueDates > 0 ? Math.round(totalAmount / uniqueDates) : 0,
    };
  }, [entries]);

  // ----------------------------------------------------------------------
  // HANDLERS: ADD PRODUCTION (Date, Machine, Production Value)
  // ----------------------------------------------------------------------
  const handleOpenAdd = () => {
    setForm({
      date: dateFilter || dayjs().format("YYYY-MM-DD"),
      machineId: machineFilter || (machines[0]?._id || ""),
      amount: "",
    });
    setFormErrors({});
    setIsOpenModal(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!form.date) errs.date = "તારીખ પસંદ કરો (Date is required)";
    if (!form.machineId) errs.machineId = "મશીન પસંદ કરો (Machine is required)";
    if (!form.amount || Number(form.amount) <= 0) {
      errs.amount = "પ્રોડક્શન રકમ (₹) દાખલ કરો (Valid production value is required)";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const res = await axios.post("/machines/daily-production", {
        machineId: form.machineId,
        date: form.date,
        amount: Number(form.amount),
        month: selectedMonth || dayjs(form.date).format("YYYY-MM"),
      });

      if (res.data?.success) {
        toast.success(res.data.message || "મશીન પ્રોડક્શન સફળતાપૂર્વક ઉમેરાઈ ગયું!");
        setIsOpenModal(false);
        fetchEntries(selectedMonth, dateFilter, machineFilter);
      }
    } catch (err) {
      toast.error(err?.message || "પ્રોડક્શન સેવ કરવામાં ભૂલ આવી");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // HANDLERS: DELETE
  // ----------------------------------------------------------------------
  const handleDelete = async (machineId, entryId) => {
    if (!window.confirm("શું તમે ખરેખર આ મશીન પ્રોડક્શન એન્ટ્રી ડિલીટ કરવા માંગો છો?")) return;

    try {
      const res = await axios.delete(`/machines/${machineId}/daily-production/${entryId}`);
      if (res.data?.success) {
        toast.success(res.data.message || "એન્ટ્રી સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
        fetchEntries(selectedMonth, dateFilter, machineFilter);
      }
    } catch (err) {
      toast.error(err?.message || "ડિલીટ કરવામાં ભૂલ આવી");
    }
  };

  const handleResetFilters = () => {
    setDateFilter("");
    setMachineFilter("");
  };

  // ----------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------
  return (
    <Page title="Machine Production - Swastik Art">
      <div className="transition-content w-full px-(--margin-x) pt-5 pb-8 lg:pt-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400">
              <CpuChipIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-dark-50">
                મશીન પ્રોડક્શન (Machine Production)
              </h2>
              <p className="text-xs text-gray-400 dark:text-dark-300">
                તારીખ મુજબ મશીન વાઇઝ દૈનિક ઉત્પાદન રકમ (₹) ની નોંધણી અને ફિલ્ટર
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="flat"
              className="gap-1.5"
              onClick={() => {
                setIsRefreshing(true);
                fetchEntries(selectedMonth, dateFilter, machineFilter);
              }}
              disabled={loading || isRefreshing}
            >
              <ArrowPathIcon className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              color="primary"
              className="gap-1.5 shadow-sm"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="size-4" />
              <span>+ પ્રોડક્શન ઉમેરો</span>
            </Button>
          </div>
        </div>

        {/* 🎯 Master Filter Card: Date-wise & Machine-wise */}
        <Card className="mt-5 border-l-4 border-l-primary-600 p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 dark:border-dark-600">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                  <FunnelIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">
                    તારીખ અને મશીન વાઇઝ ફિલ્ટર
                  </h3>
                  <p className="text-xs text-gray-400">
                    ક્યા દિવસે ક્યા મશીન પર કેટલું પ્રોડક્શન થયું તે જોવા માટે તારીખ કે મશીન પસંદ કરો
                  </p>
                </div>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1 dark:border-dark-600 dark:bg-dark-750">
                  <button
                    onClick={handlePrevMonth}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-600"
                    title="પાછલો મહિનો"
                  >
                    <ChevronLeftIcon className="size-4" />
                  </button>

                  <select
                    className="border-none bg-transparent px-2 text-xs font-semibold text-gray-700 outline-hidden dark:text-dark-100"
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(e.target.value)}
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} {opt.isCurrent ? "★ (ચાલુ)" : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleNextMonth}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-600"
                    title="આગલો મહિનો"
                  >
                    <ChevronRightIcon className="size-4" />
                  </button>
                </div>

                {!isCurrentCalendarMonth && (
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => handleMonthChange(dayjs().format("YYYY-MM"))}
                  >
                    આજનો મહિનો
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Inputs Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {/* 1. Date Filter */}
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700 dark:text-dark-200 uppercase tracking-wider">
                  📅 તારીખ ફિલ્ટર (Date)
                </label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>

              {/* 2. Machine Filter */}
              <div>
                <label className="mb-1 block text-[11px] font-bold text-gray-700 dark:text-dark-200 uppercase tracking-wider">
                  ⚙️ મશીન ફિલ્ટર (Machine)
                </label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 outline-hidden focus:border-primary-600 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-100"
                  value={machineFilter}
                  onChange={(e) => setMachineFilter(e.target.value)}
                >
                  <option value="">-- બધા મશીનો (All Machines) --</option>
                  {machines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Actions */}
              <div className="flex items-end gap-2">
                {(dateFilter || machineFilter) && (
                  <Button
                    variant="outlined"
                    className="w-full text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/40"
                    onClick={handleResetFilters}
                  >
                    રીસેટ ફિલ્ટર
                  </Button>
                )}
                <Button
                  color="primary"
                  className="w-full text-xs gap-1.5"
                  onClick={handleOpenAdd}
                >
                  <PlusIcon className="size-4" />
                  <span>+ પ્રોડક્શન ઉમેરો</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* 3 Simple KPI Summary Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Card className="p-4 sm:p-5 border-l-2 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider dark:text-dark-300">
                  કુલ પ્રોડક્શન રકમ (Total ₹)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{totals.totalAmount.toLocaleString("en-IN")}
                </h3>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  {dateFilter
                    ? `તારીખ: ${formatGujaratiDate(dateFilter)}`
                    : `${dayjs(selectedMonth + "-01").format("MMMM YYYY")} નું કુલ પ્રોડક્શન`}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <BanknotesIcon className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-l-2 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider dark:text-blue-400">
                  કુલ એન્ટ્રીઓ (Total Entries)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {totals.totalEntries} એન્ટ્રીઓ
                </h3>
                <p className="mt-0.5 text-[11px] text-blue-600/70">
                  {totals.uniqueMachines} મશીન પર નોંધાયેલ
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <CpuChipIcon className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-l-2 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider dark:text-purple-400">
                  કામ કરેલ દિવસો (Active Days)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totals.uniqueDates} દિવસ
                </h3>
                <p className="mt-0.5 text-[11px] text-purple-600/70">
                  દૈનિક સરેરાશ: ₹{totals.avgPerDay.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <CalendarIcon className="size-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* 📋 Data Table: Date, Machine, Production Value, Action */}
        <Card className="mt-5 overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50/50 p-4 dark:border-dark-600 dark:bg-dark-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-dark-50">
                  તારીખ મુજબ મશીન પ્રોડક્શન લિસ્ટ
                </h3>
                <p className="text-xs text-gray-400">
                  મશીન પર થયેલ ઉત્પાદન મૂલ્ય (₹) ની તારીખ-વાઇઝ વિગતો
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                  કુલ {entries.length} એન્ટ્રીઓ
                </span>
                <Button color="primary" size="sm" className="gap-1.5" onClick={handleOpenAdd}>
                  <PlusIcon className="size-4" />
                  <span>+ પ્રોડક્શન ઉમેરો</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table hoverable className="w-full text-left">
              <THead>
                <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-500 dark:bg-dark-800">
                  <Th className="w-14 px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">#</Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">તારીખ (Date)</Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">મશીન (Machine)</Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">પ્રોડક્શન રકમ (Production Value ₹)</Th>
                  <Th className="w-24 px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">એક્શન</Th>
                </Tr>
              </THead>
              <TBody>
                {loading ? (
                  <Tr>
                    <Td colSpan={5} className="py-12 text-center">
                      <Spinner className="size-8 text-primary-600" />
                    </Td>
                  </Tr>
                ) : entries.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <CpuChipIcon className="size-8 text-gray-300 dark:text-dark-500" />
                        <p className="text-sm font-medium">કોઈ પ્રોડક્શન એન્ટ્રી મળી નથી.</p>
                        <p className="text-xs text-gray-400">
                          ઉપરના &quot;+ પ્રોડક્શન ઉમેરો&quot; બટન પર ક્લિક કરી મશીનનું પ્રોડક્શન નોંધો.
                        </p>
                      </div>
                    </Td>
                  </Tr>
                ) : (
                  entries.map((p, index) => (
                    <Tr
                      key={p._id}
                      className="border-b border-gray-100 hover:bg-gray-50/60 dark:border-dark-600"
                    >
                      <Td className="px-4 py-3.5 text-xs text-gray-400">{index + 1}</Td>

                      {/* 1. Date */}
                      <Td className="px-4 py-3.5 text-xs font-semibold text-gray-800 dark:text-dark-100">
                        {formatGujaratiDate(p.date)}
                      </Td>

                      {/* 2. Machine */}
                      <Td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-primary-50 px-2 py-1 text-xs font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                            {p.machineCode || "M"}
                          </span>
                          <span className="font-bold text-gray-800 dark:text-dark-100">
                            {p.machineName}
                          </span>
                        </div>
                      </Td>

                      {/* 3. Production Value ₹ */}
                      <Td className="px-4 py-3.5 text-xs">
                        <span className="inline-block rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          ₹{Number(p.amount || 0).toLocaleString("en-IN")}
                        </span>
                      </Td>

                      {/* 4. Action */}
                      <Td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(p.machineId, p._id)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="એન્ટ્રી કાઢી નાખો"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>

          {/* Table Footer with Total */}
          {entries.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/70 p-4 text-xs font-semibold text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 flex items-center justify-between">
              <span>કુલ {entries.length} મશીન એન્ટ્રીઓ</span>
              <div className="flex items-center gap-2 text-sm">
                <span>કુલ ઉત્પાદન રકમ:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  ₹{totals.totalAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* ================================================================ */}
        {/* MODAL: ADD PRODUCTION (Only: Date, Machine, Production Value ₹)   */}
        {/* ================================================================ */}
        <Transition appear show={isOpenModal}>
          <Dialog as="div" className="relative z-50" onClose={() => setIsOpenModal(false)}>
            <TransitionChild enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <TransitionChild enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-600">
                      <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                          મશીન પ્રોડક્શન ઉમેરો
                        </h3>
                        <p className="text-xs text-gray-400">
                          તારીખ, મશીન અને પ્રોડક્શન રકમ (₹) દાખલ કરો
                        </p>
                      </div>
                      <button onClick={() => setIsOpenModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700">
                        <XMarkIcon className="size-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      {/* 1. Date */}
                      <div>
                        <Input
                          label="તારીખ (Date) *"
                          type="date"
                          value={form.date}
                          onChange={(e) => setForm({ ...form, date: e.target.value })}
                          error={formErrors.date}
                          required
                        />
                      </div>

                      {/* 2. Select Machine */}
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          મશીન પસંદ કરો (Select Machine) *
                        </label>
                        <select
                          className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 outline-hidden focus:border-primary-600 dark:border-dark-600 dark:bg-dark-750 dark:text-dark-100"
                          value={form.machineId}
                          onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                          required
                        >
                          <option value="">-- મશીન પસંદ કરો --</option>
                          {machines.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.name} ({m.code})
                            </option>
                          ))}
                        </select>
                        {formErrors.machineId && (
                          <p className="mt-1 text-xs text-rose-500">{formErrors.machineId}</p>
                        )}
                      </div>

                      {/* 3. Production Value (Amount ₹) */}
                      <div>
                        <Input
                          label="પ્રોડક્શન રકમ (Production Value ₹) *"
                          type="number"
                          placeholder="દા.ત. 25000"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          prefix={<span className="font-bold text-emerald-600">₹</span>}
                          error={formErrors.amount}
                          required
                        />
                      </div>

                      <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-dark-600">
                        <Button type="button" variant="outlined" onClick={() => setIsOpenModal(false)}>
                          રદ કરો
                        </Button>
                        <Button type="submit" color="primary" className="gap-2" disabled={submitting}>
                          {submitting && <Spinner className="size-4" />}
                          <span>પ્રોડક્શન સેવ કરો</span>
                        </Button>
                      </div>
                    </form>
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
