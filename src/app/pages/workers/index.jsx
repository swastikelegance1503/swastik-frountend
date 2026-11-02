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
  PhoneIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  CpuChipIcon,
  BanknotesIcon,
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

// Predefined Roles for Workers
const ROLE_OPTIONS = [
  "Embroidery Operator",
  "Machine Master",
  "Checker / Quality",
  "Helper / Packer",
  "Embroidery Designer",
  "Floor Supervisor",
  "Maintenance Technician",
  "Other",
];

export default function WorkersPage() {
  // Workers and Machines Data
  const [workers, setWorkers] = useState([]);
  const [machinesList, setMachinesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [machineFilter, setMachineFilter] = useState("");

  // Add / Edit Worker Modal State
  const [isOpenWorkerModal, setIsOpenWorkerModal] = useState(false);
  const [isEditingWorker, setIsEditingWorker] = useState(false);
  const [currentWorkerId, setCurrentWorkerId] = useState(null);
  const [submittingWorker, setSubmittingWorker] = useState(false);
  const [workerForm, setWorkerForm] = useState({
    name: "",
    mobileNumber: "",
    role: "Embroidery Operator",
    machineId: "",
    machineName: "",
    machineCode: "",
    machineType: "",
    salary: "",
    joinDate: dayjs().format("YYYY-MM-DD"),
    status: "Active",
    notes: "",
  });
  const [workerErrors, setWorkerErrors] = useState({});

  // Delete Worker Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Fetch Workers List
  const fetchWorkers = useCallback(async (searchQuery = "", status = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (status) params.append("status", status);

      const url = `/workers?${params.toString()}`;
      const response = await axios.get(url);
      if (response.data?.success) {
        setWorkers(response.data.workers || []);
      }
    } catch (err) {
      console.error("Error fetching workers:", err);
      toast.error(err?.message || "કારીગરો લાવવામાં ભૂલ આવી (Failed to load workers)");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 2. Fetch Machines List for Machine Assignment Dropdown
  const fetchMachines = useCallback(async () => {
    try {
      const response = await axios.get("/machines");
      if (response.data?.success) {
        setMachinesList(response.data.machines || []);
      }
    } catch (err) {
      console.error("Error fetching machines list:", err);
    }
  }, []);

  useEffect(() => {
    fetchWorkers(search, statusFilter);
    fetchMachines();
  }, [fetchWorkers, fetchMachines, search, statusFilter]);

  // Refresh data
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchWorkers(search, statusFilter);
    fetchMachines();
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // Machine filter
      if (machineFilter === "unassigned") {
        const hasMachine = Boolean(w.machine || w.machineName || w.machineCode);
        if (hasMachine) return false;
      } else if (machineFilter) {
        const workerMachineId = w.machine?._id || w.machine;
        if (workerMachineId !== machineFilter) return false;
      }
      return true;
    });
  }, [workers, machineFilter]);

  // Counts for Stats Cards
  const totalWorkersCount = workers.length;
  const activeWorkersCount = workers.filter(
    (w) => w.status === "Active" || w.status === "એક્ટિવ"
  ).length;
  const assignedMachinesCount = workers.filter(
    (w) => Boolean(w.machine || w.machineName || w.machineCode)
  ).length;
  const inactiveWorkersCount = workers.filter(
    (w) => w.status === "Inactive" || w.status === "ઇનએક્ટિવ"
  ).length;

  // Open Create Worker Modal
  const handleOpenCreateWorker = () => {
    setIsEditingWorker(false);
    setCurrentWorkerId(null);
    setWorkerForm({
      name: "",
      mobileNumber: "",
      role: "Embroidery Operator",
      machineId: "",
      machineName: "",
      machineCode: "",
      machineType: "",
      salary: "",
      joinDate: dayjs().format("YYYY-MM-DD"),
      status: "Active",
      notes: "",
    });
    setWorkerErrors({});
    setIsOpenWorkerModal(true);
  };

  // Open Edit Worker Modal
  const handleOpenEditWorker = (worker) => {
    setIsEditingWorker(true);
    setCurrentWorkerId(worker._id);
    const mId = worker.machine?._id || worker.machine || "";
    setWorkerForm({
      name: worker.name || "",
      mobileNumber: worker.mobileNumber || "",
      role: worker.role || "Embroidery Operator",
      machineId: mId,
      machineName: worker.machineName || worker.machine?.name || "",
      machineCode: worker.machineCode || worker.machine?.code || "",
      machineType: worker.machineType || worker.machine?.machineType || "",
      salary: worker.salary !== undefined && worker.salary !== null ? worker.salary : "",
      joinDate: worker.joinDate
        ? dayjs(worker.joinDate).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"),
      status: worker.status || "Active",
      notes: worker.notes || "",
    });
    setWorkerErrors({});
    setIsOpenWorkerModal(true);
  };

  // Handle Machine Select in Worker Modal
  const handleMachineSelect = (e) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setWorkerForm((prev) => ({
        ...prev,
        machineId: "",
        machineName: "",
        machineCode: "",
        machineType: "",
      }));
      return;
    }

    const selectedMachine = machinesList.find((m) => m._id === selectedId);
    if (selectedMachine) {
      setWorkerForm((prev) => ({
        ...prev,
        machineId: selectedMachine._id,
        machineName: selectedMachine.name,
        machineCode: selectedMachine.code,
        machineType: selectedMachine.machineType || "",
      }));
    }
  };

  // Form Validation
  const validateWorker = () => {
    const errs = {};
    if (!workerForm.name.trim()) {
      errs.name = "કારીગરનું નામ જરૂરી છે (Name required)";
    }
    if (!workerForm.mobileNumber.trim()) {
      errs.mobileNumber = "મોબાઇલ નંબર જરૂરી છે (Mobile required)";
    } else if (!/^[0-9]{10}$/.test(workerForm.mobileNumber.trim())) {
      errs.mobileNumber = "૧૦ આંકડાનો સાચો મોબાઇલ નંબર લખો (Valid 10 digits required)";
    }
    setWorkerErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Worker Create / Update
  const handleSubmitWorker = async (e) => {
    e.preventDefault();
    if (!validateWorker()) return;

    try {
      setSubmittingWorker(true);
      const payload = {
        name: workerForm.name.trim(),
        mobileNumber: workerForm.mobileNumber.trim(),
        role: workerForm.role,
        machineId: workerForm.machineId || null,
        machineName: workerForm.machineName,
        machineCode: workerForm.machineCode,
        machineType: workerForm.machineType,
        salary: workerForm.salary !== "" ? Number(workerForm.salary) : 0,
        joinDate: workerForm.joinDate,
        status: workerForm.status,
        notes: workerForm.notes.trim(),
      };

      if (isEditingWorker) {
        const res = await axios.put(`/workers/${currentWorkerId}`, payload);
        if (res.data?.success) {
          toast.success("કારીગરની વિગતો અપડેટ થઈ ગઈ!");
          setIsOpenWorkerModal(false);
          fetchWorkers(search, statusFilter);
        }
      } else {
        const res = await axios.post("/workers", payload);
        if (res.data?.success) {
          toast.success("નવો કારીગર સફળતાપૂર્વક ઉમેરાઈ ગયો!");
          setIsOpenWorkerModal(false);
          fetchWorkers(search, statusFilter);
        }
      }
    } catch (err) {
      toast.error(err?.message || "ભૂલ આવી. ફરી પ્રયાસ કરો.");
    } finally {
      setSubmittingWorker(false);
    }
  };

  // Open Delete Worker Modal
  const handleOpenDeleteWorker = (worker) => {
    setWorkerToDelete(worker);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete Worker
  const handleConfirmDeleteWorker = async () => {
    if (!workerToDelete?._id) return;
    try {
      setDeleting(true);
      const res = await axios.delete(`/workers/${workerToDelete._id}`);
      if (res.data?.success) {
        toast.success("કારીગર સફળતાપૂર્વક ડિલીટ થયો!");
        setIsDeleteModalOpen(false);
        setWorkerToDelete(null);
        fetchWorkers(search, statusFilter);
      }
    } catch (err) {
      toast.error(err?.message || "કારીગર ડિલીટ કરવામાં ભૂલ આવી");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Page title="Workers - Swastik Art">
      <div className="transition-content w-full px-(--margin-x) pt-5 pb-8 lg:pt-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400">
              <UserGroupIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-dark-50">
                કારીગરો (Workers Management)
              </h2>
              <p className="text-xs text-gray-400 dark:text-dark-300">
                કારીગરોની ડિરેક્ટરી અને ઓપરેટ કરતા મશીનની માહિતી
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="flat"
              className="gap-2"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
            >
              <ArrowPathIcon
                className={`size-4.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              color="primary"
              className="gap-2 shadow-sm"
              onClick={handleOpenCreateWorker}
            >
              <PlusIcon className="size-4.5" />
              <span>નવો કારીગર ઉમેરો (Add Worker)</span>
            </Button>
          </div>
        </div>

        {/* 📑 SUB-MODULE TABS */}
        <div className="mt-4 flex items-center space-x-2 border-b border-gray-200 dark:border-dark-700">
          <Link
            to="/workers"
            className="flex items-center gap-2 border-b-2 border-primary-600 px-4 py-2.5 text-sm font-bold text-primary-600 dark:border-primary-400 dark:text-primary-400"
          >
            <UserGroupIcon className="size-4.5" />
            <span>કારીગરોની ડિરેક્ટરી (Workers Directory)</span>
          </Link>
          <Link
            to="/workers/salary"
            className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100"
          >
            <BanknotesIcon className="size-4.5" />
            <span>સેલેરી મેનેજમેન્ટ (Workers Salary Management)</span>
          </Link>
        </div>

        {/* 📊 4 OVERVIEW STAT CARDS */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* 1. Total Workers */}
          <Card className="p-4.5 border-l-4 border-l-primary-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                કુલ કારીગરો
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                <UserGroupIcon className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-800 dark:text-dark-50">
              {totalWorkersCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Total Registered Workers</p>
          </Card>

          {/* 2. Active Workers */}
          <Card className="p-4.5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                સક્રિય કારીગરો
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <CheckCircleIcon className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {activeWorkersCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Currently Active</p>
          </Card>

          {/* 3. Machine Assigned */}
          <Card className="p-4.5 border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                મશીન ફાળવેલ
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <CpuChipIcon className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {assignedMachinesCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Assigned to Machines</p>
          </Card>

          {/* 4. Inactive Workers */}
          <Card className="p-4.5 border-l-4 border-l-gray-400 dark:border-l-dark-400">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-dark-300 uppercase tracking-wider">
                ઇનએક્ટિવ કારીગરો
              </span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-dark-700 dark:text-dark-300">
                <XCircleIcon className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-600 dark:text-dark-200">
              {inactiveWorkersCount}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">Inactive / On Leave</p>
          </Card>
        </div>

        {/* 🔍 SEARCH & FILTERS BAR */}
        <Card className="mt-5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="કારીગરનું નામ, મોબાઇલ, મશીન કે હોદ્દો શોધો... (Search worker, machine, role)"
                className="pl-9.5 w-full"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="કારીગર સ્ટેટસ ફિલ્ટર"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
              >
                <option value="">તમામ સ્ટેટસ (All Status)</option>
                <option value="Active">સક્રિય (Active)</option>
                <option value="Inactive">ઇનએક્ટિવ (Inactive)</option>
              </select>

              {/* Machine Filter */}
              <select
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value)}
                aria-label="મશીન ફિલ્ટર"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
              >
                <option value="">તમામ મશીનો (All Machines)</option>
                <option value="unassigned">મશીન ફાળવેલ નથી (Unassigned)</option>
                {machinesList.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(search || statusFilter || machineFilter) && (
                <Button
                  variant="flat"
                  size="sm"
                  className="gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setMachineFilter("");
                  }}
                >
                  <XMarkIcon className="size-3.5" />
                  <span>Clear Filters</span>
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* 📋 WORKERS TABLE */}
        <Card className="mt-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-dark-700">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                કારીગરોની યાદી (Workers Directory)
              </h3>
              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                {filteredWorkers.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table hoverable className="w-full text-left">
              <THead>
                <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-700 dark:bg-dark-800/50">
                  <Th className="w-14 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    #
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    કારીગર (Worker & Role)
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    ઓપરેટ કરતું મશીન (Assigned Machine)
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    મોબાઇલ નંબર (Mobile)
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    પગાર (Salary ₹)
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    જોઇનિંગ તારીખ (Joining Date)
                  </Th>
                  <Th className="w-36 px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    સ્ટેટસ (Status)
                  </Th>
                  <Th className="w-28 px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    એક્શન (Actions)
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {loading ? (
                  <Tr>
                    <Td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Spinner className="size-8 text-primary-600" />
                        <span className="text-sm text-gray-400">
                          કારીગરો લાવવામાં આવી રહ્યા છે...
                        </span>
                      </div>
                    </Td>
                  </Tr>
                ) : filteredWorkers.length === 0 ? (
                  <Tr>
                    <Td colSpan={8} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-dark-700">
                          <UserGroupIcon className="size-6" />
                        </div>
                        <p className="text-base font-semibold text-gray-700 dark:text-dark-200">
                          કોઈ કારીગર મળ્યા નથી (No Workers Found)
                        </p>
                        <p className="text-xs text-gray-400 dark:text-dark-400">
                          શોધેલી વિગતો માટે કોઈ પરિણામ મળ્યું નથી અથવા હજી સુધી કોઈ કારીગર ઉમેરાયા નથી.
                        </p>
                        <Button
                          size="sm"
                          color="primary"
                          className="mt-2 gap-1.5"
                          onClick={handleOpenCreateWorker}
                        >
                          <PlusIcon className="size-4" />
                          <span>નવો કારીગર ઉમેરો</span>
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ) : (
                  filteredWorkers.map((worker, index) => {
                    const initials = (worker.name || "W")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    const isActive = worker.status === "Active" || worker.status === "એક્ટિવ";
                    const machineName =
                      worker.machineName || worker.machine?.name || "";
                    const machineCode =
                      worker.machineCode || worker.machine?.code || "";
                    const machineType =
                      worker.machineType || worker.machine?.machineType || "";

                    return (
                      <Tr
                        key={worker._id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-dark-700 dark:hover:bg-dark-800/40"
                      >
                        {/* 1. Index */}
                        <Td className="w-14 px-4 py-3.5 text-center text-xs font-medium text-gray-400">
                          {index + 1}
                        </Td>

                        {/* 2. Worker Name & Role */}
                        <Td className="px-4 py-3.5">
                          <div className="flex items-center space-x-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-100 font-bold text-xs text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-800 dark:text-dark-50">
                                {worker.name}
                              </div>
                              <span className="inline-block mt-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-700 dark:text-dark-300">
                                {worker.role || "Embroidery Operator"}
                              </span>
                            </div>
                          </div>
                        </Td>

                        {/* 3. Assigned Machine */}
                        <Td className="px-4 py-3.5">
                          {machineName || machineCode ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <CpuChipIcon className="size-3.5 text-primary-600 dark:text-primary-400" />
                                <span className="font-semibold text-gray-800 dark:text-dark-100">
                                  {machineName || "Machine"}
                                </span>
                                {machineCode && (
                                  <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                                    {machineCode}
                                  </span>
                                )}
                              </div>
                              {machineType && (
                                <span className="mt-0.5 text-[11px] text-gray-400 dark:text-dark-400">
                                  {machineType}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-dark-700 dark:text-dark-400">
                              ફાળવેલ નથી (None)
                            </span>
                          )}
                        </Td>

                        {/* 4. Mobile Number */}
                        <Td className="px-4 py-3.5">
                          <div className="flex items-center space-x-1.5 text-gray-700 dark:text-dark-200">
                            <PhoneIcon className="size-3.5 text-gray-400" />
                            <a
                              href={`tel:${worker.mobileNumber}`}
                              className="font-medium hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              {worker.mobileNumber}
                            </a>
                          </div>
                        </Td>

                        {/* 5. Salary */}
                        <Td className="px-4 py-3.5">
                          <span className="font-bold text-gray-900 dark:text-dark-50">
                            {Number(worker.salary) > 0
                              ? `₹${Number(worker.salary).toLocaleString("en-IN")}`
                              : "₹0"}
                          </span>
                        </Td>

                        {/* 6. Joining Date */}
                        <Td className="px-4 py-3.5">
                          <div className="flex items-center space-x-1.5 text-xs text-gray-600 dark:text-dark-300">
                            <CalendarDaysIcon className="size-3.5 text-gray-400" />
                            <span>
                              {worker.joinDate
                                ? dayjs(worker.joinDate).format("DD-MM-YYYY")
                                : "-"}
                            </span>
                          </div>
                        </Td>

                        {/* 7. Status */}
                        <Td className="w-36 px-4 py-3.5 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              સક્રિય (Active)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-dark-700 dark:text-dark-300">
                              <span className="size-1.5 rounded-full bg-gray-400" />
                              ઇનએક્ટિવ (Inactive)
                            </span>
                          )}
                        </Td>

                        {/* 8. Actions */}
                        <Td className="w-28 px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="flat"
                              size="sm"
                              className="size-8 p-0 text-gray-600 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
                              title="વિગતો સુધારો (Edit Worker)"
                              onClick={() => handleOpenEditWorker(worker)}
                            >
                              <PencilSquareIcon className="size-4" />
                            </Button>
                            <Button
                              variant="flat"
                              size="sm"
                              className="size-8 p-0 text-gray-600 hover:text-rose-600 dark:text-dark-300 dark:hover:text-rose-400"
                              title="ડિલીટ કરો (Delete Worker)"
                              onClick={() => handleOpenDeleteWorker(worker)}
                            >
                              <TrashIcon className="size-4" />
                            </Button>
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
      </div>

      {/* ============================================================== */}
      {/* 🛠️ ADD / EDIT WORKER MODAL                                     */}
      {/* ============================================================== */}
      <Transition appear show={isOpenWorkerModal} as="div">
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => !submittingWorker && setIsOpenWorkerModal(false)}
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
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                        <UserGroupIcon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-dark-50">
                          {isEditingWorker
                            ? "કારીગરની વિગતો સુધારો (Edit Worker)"
                            : "નવો કારીગર ઉમેરો (Add Worker)"}
                        </h3>
                        <p className="text-xs text-gray-400">
                          કારીગર પ્રોફાઇલ અને મશીન ફાળવણી વિગતો
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700"
                      onClick={() => setIsOpenWorkerModal(false)}
                      disabled={submittingWorker}
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitWorker} className="mt-4 space-y-4">
                    {/* Worker Full Name */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        કારીગરનું નામ (Worker Name) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        placeholder="દા.ત. રમેશભાઈ પટેલ"
                        value={workerForm.name}
                        onChange={(e) =>
                          setWorkerForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className={workerErrors.name ? "border-rose-500" : ""}
                      />
                      {workerErrors.name && (
                        <p className="mt-1 text-xs text-rose-500">{workerErrors.name}</p>
                      )}
                    </div>

                    {/* Mobile Number & Role in 2 Columns */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          મોબાઇલ નંબર (Mobile) <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          type="tel"
                          maxLength={10}
                          placeholder="દા.ત. 9876543210"
                          value={workerForm.mobileNumber}
                          onChange={(e) =>
                            setWorkerForm((prev) => ({
                              ...prev,
                              mobileNumber: e.target.value.replace(/[^0-9]/g, ""),
                            }))
                          }
                          className={workerErrors.mobileNumber ? "border-rose-500" : ""}
                        />
                        {workerErrors.mobileNumber && (
                          <p className="mt-1 text-xs text-rose-500">
                            {workerErrors.mobileNumber}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          કામગીરી / હોદ્દો (Role)
                        </label>
                        <select
                          value={workerForm.role}
                          onChange={(e) =>
                            setWorkerForm((prev) => ({ ...prev, role: e.target.value }))
                          }
                          aria-label="કામગીરી અથવા હોદ્દો પસંદ કરો"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Assigned Machine Select */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        ઓપરેટ કરતું મશીન (Assigned Machine)
                      </label>
                      <select
                        value={workerForm.machineId}
                        onChange={handleMachineSelect}
                        aria-label="ઓપરેટ કરતું મશીન પસંદ કરો"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                      >
                        <option value="">-- કોઈ મશીન ફાળવેલ નથી (None) --</option>
                        {machinesList.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.name} [{m.code}] - {m.machineType || "Embroidery"} ({m.heads || 0} Heads)
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-gray-400">
                        મશીન મોડ્યુલમાં દાખલ કરેલ મશીનોમાંથી પસંદ કરો.
                      </p>
                    </div>

                    {/* Salary & Joining Date in 2 Columns */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          માસિક પગાર (Salary ₹)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="દા.ત. 25000"
                          value={workerForm.salary}
                          onChange={(e) =>
                            setWorkerForm((prev) => ({
                              ...prev,
                              salary: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                          જોઇનિંગ તારીખ (Joining Date)
                        </label>
                        <Input
                          type="date"
                          value={workerForm.joinDate}
                          onChange={(e) =>
                            setWorkerForm((prev) => ({ ...prev, joinDate: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    {/* Status Select */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        સ્ટેટસ (Status)
                      </label>
                      <select
                        value={workerForm.status}
                        onChange={(e) =>
                          setWorkerForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                        aria-label="સ્ટેટસ પસંદ કરો"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                      >
                        <option value="Active">સક્રિય (Active)</option>
                        <option value="Inactive">ઇનએક્ટિવ (Inactive)</option>
                      </select>
                    </div>

                    {/* Notes / Remarks */}
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        વધારાની નોંધ (Notes / Address)
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="સરનામું, ઓળખપત્ર અથવા અન્ય નોંધ..."
                        value={workerForm.notes}
                        onChange={(e) =>
                          setWorkerForm((prev) => ({ ...prev, notes: e.target.value }))
                        }
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-dark-700">
                      <Button
                        type="button"
                        variant="flat"
                        onClick={() => setIsOpenWorkerModal(false)}
                        disabled={submittingWorker}
                      >
                        રદ કરો (Cancel)
                      </Button>
                      <Button
                        type="submit"
                        color="primary"
                        className="gap-2"
                        disabled={submittingWorker}
                      >
                        {submittingWorker && <Spinner className="size-4 text-white" />}
                        <span>
                          {isEditingWorker ? "અપડેટ કરો (Update)" : "કારીગર સેવ કરો (Save)"}
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
      {/* 🗑️ DELETE WORKER CONFIRMATION MODAL                            */}
      {/* ============================================================== */}
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
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-2xl transition-all dark:bg-dark-800">
                  <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40">
                      <TrashIcon className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                        કારીગર ડિલીટ કરો (Delete Worker)
                      </h3>
                      <p className="text-xs text-gray-400">આ પ્રક્રિયા પૂર્વવત્ કરી શકાશે નહીં</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-dark-700/50">
                    <p className="text-sm text-gray-700 dark:text-dark-200">
                      શું તમે ખરેખર કારીગર{" "}
                      <span className="font-bold text-gray-900 dark:text-dark-50">
                        &quot;{workerToDelete?.name}&quot;
                      </span>{" "}
                      ને ડિલીટ કરવા માંગો છો?
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2.5">
                    <Button
                      type="button"
                      variant="flat"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={deleting}
                    >
                      ના, રદ કરો (Cancel)
                    </Button>
                    <Button
                      type="button"
                      color="error"
                      className="gap-2"
                      onClick={handleConfirmDeleteWorker}
                      disabled={deleting}
                    >
                      {deleting && <Spinner className="size-4 text-white" />}
                      <span>હા, ડિલીટ કરો (Delete)</span>
                    </Button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </Page>
  );
}
