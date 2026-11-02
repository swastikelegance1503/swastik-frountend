// Import Dependencies
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  WrenchScrewdriverIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  XMarkIcon,
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

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

// Standard machine type presets
const MACHINE_TYPE_OPTIONS = [
  "24 Head Multi-Head",
  "Cording & Sequin Embroidery",
  "Flat High-Speed",
  "Chain Stitch Embroidery",
  "Chenille & Chain",
  "Schiffli Embroidery",
  "Single Head Sample",
];

export default function MachinesPage() {
  const navigate = useNavigate();

  // State
  const [machines, setMachines] = useState([]);
  const [workersList, setWorkersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'

  // Modal State for Add / Edit
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    headCount: "24",
    machineType: "24 Head Multi-Head",
    status: "Active",
    defaultOperator: "",
    defaultOperatorName: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ----------------------------------------------------------------------
  // API CALLS
  // ----------------------------------------------------------------------
  const fetchMachines = useCallback(async (searchQuery = "", st = statusFilter) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (st) params.append("status", st);

      const response = await axios.get(`/machines?${params.toString()}`);
      if (response.data?.success) {
        setMachines(response.data.machines || []);
      }
    } catch (err) {
      console.error("Error fetching machines:", err);
      toast.error(err?.message || "મશીનો લાવવામાં ભૂલ આવી");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter]);

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await axios.get("/workers");
      if (res.data?.success) {
        setWorkersList(res.data.workers || []);
      }
    } catch (e) {
      console.error("Error fetching workers for dropdown:", e);
    }
  }, []);

  useEffect(() => {
    fetchMachines(search, statusFilter);
    fetchWorkers();
  }, [fetchMachines, fetchWorkers, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = machines.length;
    const active = machines.filter((m) => m.status === "Active").length;
    const maintenance = machines.filter((m) => m.status === "Under Maintenance").length;
    const idle = machines.filter((m) => m.status === "Idle").length;
    const totalHeads = machines.reduce((s, m) => s + (Number(m.headCount) || 0), 0);

    return { total, active, maintenance, idle, totalHeads };
  }, [machines]);

  // Filtered List
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      if (typeFilter && m.machineType !== typeFilter) return false;
      return true;
    });
  }, [machines, typeFilter]);

  // ----------------------------------------------------------------------
  // HANDLERS: CREATE / EDIT
  // ----------------------------------------------------------------------
  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    const nextNum = machines.length + 1;
    setFormData({
      name: `Machine #${String(nextNum).padStart(2, "0")}`,
      code: `M-${String(nextNum).padStart(2, "0")}`,
      headCount: "24",
      machineType: "24 Head Multi-Head",
      status: "Active",
      defaultOperator: "",
      defaultOperatorName: "",
    });
    setFormErrors({});
    setIsOpenModal(true);
  };

  const handleOpenEdit = (m) => {
    setIsEditing(true);
    setCurrentId(m._id);
    setFormData({
      name: m.name || "",
      code: m.code || "",
      headCount: String(m.headCount ?? 24),
      machineType: m.machineType || "24 Head Multi-Head",
      status: m.status || "Active",
      defaultOperator: m.defaultOperator || "",
      defaultOperatorName: m.defaultOperatorName || "",
    });
    setFormErrors({});
    setIsOpenModal(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "મશીનનું નામ જરૂરી છે (Machine name is required)";
    if (!formData.headCount || Number(formData.headCount) <= 0) {
      errs.headCount = "યોગ્ય હેડ કાઉન્ટ દાખલ કરો (Heads count is required)";
    }
    if (!formData.machineType.trim()) {
      errs.machineType = "મશીનનો પ્રકાર જરૂરી છે (Machine type is required)";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        headCount: Number(formData.headCount) || 24,
        machineType: formData.machineType.trim(),
        status: formData.status,
        defaultOperator: formData.defaultOperator || null,
        defaultOperatorName: formData.defaultOperatorName || "",
      };

      if (isEditing) {
        const res = await axios.put(`/machines/${currentId}`, payload);
        if (res.data?.success) {
          toast.success("મશીનની વિગતો સફળતાપૂર્વક સુધારી લેવાઈ!");
          setIsOpenModal(false);
          fetchMachines(search, statusFilter);
        }
      } else {
        const res = await axios.post("/machines", payload);
        if (res.data?.success) {
          toast.success(res.data.message || "નવું મશીન સફળતાપૂર્વક ઉમેરાઈ ગયું!");
          setIsOpenModal(false);
          fetchMachines(search, statusFilter);
        }
      }
    } catch (err) {
      toast.error(err?.message || "ભૂલ આવી. ફરી પ્રયાસ કરો.");
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------
  // HANDLERS: DELETE
  // ----------------------------------------------------------------------
  const handleOpenDelete = (m) => {
    setMachineToDelete(m);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!machineToDelete?._id) return;
    try {
      setDeleting(true);
      const res = await axios.delete(`/machines/${machineToDelete._id}`);
      if (res.data?.success) {
        toast.success(res.data.message || "મશીન સફળતાપૂર્વક ડિલીટ થઈ ગયું!");
        setIsDeleteModalOpen(false);
        setMachineToDelete(null);
        fetchMachines(search, statusFilter);
      }
    } catch (err) {
      toast.error(err?.message || "ડિલીટ કરવામાં ભૂલ આવી");
    } finally {
      setDeleting(false);
    }
  };

  // ----------------------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------------------
  return (
    <Page title="Machines Master - Swastik Art">
      <div className="transition-content w-full px-(--margin-x) pt-5 pb-8 lg:pt-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400">
              <CpuChipIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-dark-50">
                મશીનો (Machines Master)
              </h2>
              <p className="text-xs text-gray-400 dark:text-dark-300">
                ફેક્ટરીના تمام મશીનોનું સંચાલન, હેડ કાઉન્ટ (Heads), પ્રકાર અને સ્ટેટસ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="flat"
              className="gap-1.5"
              onClick={() => {
                setIsRefreshing(true);
                fetchMachines(search, statusFilter);
              }}
              disabled={loading || isRefreshing}
            >
              <ArrowPathIcon className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="flat"
              className="gap-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300"
              onClick={() => navigate("/machine-production")}
            >
              <SparklesIcon className="size-4" />
              <span>દૈનિક પ્રોડક્શન મોડ્યુલ</span>
            </Button>

            <Button
              color="primary"
              className="gap-1.5 shadow-sm"
              onClick={handleOpenCreate}
            >
              <PlusIcon className="size-4" />
              <span>+ નવું મશીન ઉમેરો</span>
            </Button>
          </div>
        </div>

        {/* 4 Overview Statistics Cards */}
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 sm:p-5 border-l-2 border-l-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider dark:text-dark-300">
                  કુલ મશીનો (Total Machines)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-dark-50">
                  {loading ? "-" : stats.total}
                </h3>
                <p className="mt-0.5 text-[11px] text-gray-400">કુલ નોંધાયેલ મશીન</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <CpuChipIcon className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-l-2 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider dark:text-emerald-400">
                  સક્રિય મશીનો (Active)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {loading ? "-" : `${stats.active} / ${stats.total}`}
                </h3>
                <p className="mt-0.5 text-[11px] text-emerald-600/70">કાર્યરત સ્થિતિમાં</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <CheckCircleIcon className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-l-2 border-l-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider dark:text-purple-400">
                  કુલ હેડ ક્ષમતા (Total Heads)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {loading ? "-" : `${stats.totalHeads} હેડ્સ`}
                </h3>
                <p className="mt-0.5 text-[11px] text-purple-600/70">ફેક્ટરીની કુલ ક્ષમતા</p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <WrenchScrewdriverIcon className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 border-l-2 border-l-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider dark:text-amber-400">
                  મેઇન્ટેનન્સ / બંધ (Inactive)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {loading ? "-" : stats.maintenance + stats.idle}
                </h3>
                <p className="mt-0.5 text-[11px] text-amber-600/70">
                  {stats.maintenance > 0 ? `${stats.maintenance} મેઇન્ટેનન્સમાં` : "બધા મશીન ચાલુ"}
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <ExclamationTriangleIcon className="size-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="mt-5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Input
                  placeholder="મશીનનું નામ કે કોડ શોધો..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  prefix={<MagnifyingGlassIcon className="size-4 text-gray-400" />}
                />
              </div>

              <select
                className="rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-700 outline-hidden dark:border-dark-600 dark:bg-dark-750 dark:text-dark-100"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">બધા સ્ટેટસ (All Status)</option>
                <option value="Active">સક્રિય (Active)</option>
                <option value="Under Maintenance">મેઇન્ટેનન્સ (Maintenance)</option>
                <option value="Idle">બંધ (Idle)</option>
              </select>

              <select
                className="rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-700 outline-hidden dark:border-dark-600 dark:bg-dark-750 dark:text-dark-100"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">બધા પ્રકાર (All Types)</option>
                {MACHINE_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {(search || statusFilter || typeFilter) && (
                <Button
                  variant="outlined"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setTypeFilter("");
                  }}
                >
                  રીસેટ
                </Button>
              )}
            </div>

            {/* View Mode Toggle: Cards vs Table */}
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 p-1 bg-gray-50/50 dark:border-dark-600 dark:bg-dark-800">
              <button
                onClick={() => setViewMode("cards")}
                className={`rounded-lg p-1.5 transition-all ${
                  viewMode === "cards"
                    ? "bg-white text-primary-600 shadow-xs dark:bg-dark-700 dark:text-primary-400"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
                }`}
                title="કાર્ડ વ્યૂ (Cards Grid)"
              >
                <Squares2X2Icon className="size-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-lg p-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-white text-primary-600 shadow-xs dark:bg-dark-700 dark:text-primary-400"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
                }`}
                title="ટેબલ વ્યૂ (Table View)"
              >
                <ListBulletIcon className="size-4" />
              </button>
            </div>
          </div>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* VIEW 1: CARDS GRID VIEW                                          */}
        {/* ---------------------------------------------------------------- */}
        {viewMode === "cards" && (
          <div className="mt-5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="size-8 text-primary-600" />
              </div>
            ) : filteredMachines.length === 0 ? (
              <Card className="p-12 text-center text-gray-400">
                <CpuChipIcon className="mx-auto size-12 text-gray-300 dark:text-dark-500 mb-2" />
                <p className="text-base font-bold text-gray-700 dark:text-dark-200">
                  કોઈ મશીન મળ્યું નથી
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ઉપર આપેલા &quot;+ નવું મશીન ઉમેરો&quot; બટન પર ક્લિક કરીને નવું મશીન દાખલ કરો.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMachines.map((m) => (
                  <Card
                    key={m._id}
                    className="p-5 transition-all hover:shadow-md border border-gray-100 hover:border-primary-200 dark:border-dark-600"
                  >
                    {/* Top Row: Code Badge & Status */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300 font-extrabold text-sm tracking-wider">
                          {m.code}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-800 dark:text-dark-50">
                            {m.name}
                          </h4>
                          <p className="text-xs text-gray-400">{m.machineType}</p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          m.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : m.status === "Under Maintenance"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                            : "bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-300"
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            m.status === "Active"
                              ? "bg-emerald-500"
                              : m.status === "Under Maintenance"
                              ? "bg-amber-500"
                              : "bg-gray-400"
                          }`}
                        />
                        {m.status === "Active"
                          ? "સક્રિય"
                          : m.status === "Under Maintenance"
                          ? "મેઇન્ટેનન્સ"
                          : "બંધ"}
                      </span>
                    </div>

                    {/* Middle Details: Head Count & Machine Type */}
                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-gray-50/70 p-3 text-xs dark:bg-dark-750">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          હેડ કાઉન્ટ (Heads)
                        </p>
                        <p className="mt-0.5 text-sm font-extrabold text-purple-600 dark:text-purple-400">
                          {m.headCount} હેડ
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          ડિફોલ્ટ કારીગર
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-gray-800 dark:text-dark-100 truncate">
                          {m.defaultOperatorName || "નથી રાખેલ"}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Actions: Edit, Delete, Production */}
                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-600">
                      <Button
                        size="sm"
                        variant="flat"
                        className="text-xs gap-1 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300"
                        onClick={() => navigate("/machine-production")}
                      >
                        <span>પ્રોડક્શન જુઓ</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title="મશીન સુધારો (Edit)"
                        >
                          <PencilSquareIcon className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(m)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="મશીન કાઢી નાખો (Delete)"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* VIEW 2: TABLE VIEW                                               */}
        {/* ---------------------------------------------------------------- */}
        {viewMode === "table" && (
          <Card className="mt-5 overflow-hidden">
            <div className="overflow-x-auto">
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-500 dark:bg-dark-800">
                    <Th className="w-12 px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">#</Th>
                    <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">મશીન કોડ & નામ</Th>
                    <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">હેડ કાઉન્ટ (Heads)</Th>
                    <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">મશીન પ્રકાર (Type)</Th>
                    <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">સ્થિતિ (Status)</Th>
                    <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase">ડિફોલ્ટ કારીગર</Th>
                    <Th className="w-28 px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase">એક્શન્સ</Th>
                  </Tr>
                </THead>
                <TBody>
                  {loading ? (
                    <Tr>
                      <Td colSpan={7} className="py-12 text-center">
                        <Spinner className="size-8 text-primary-600" />
                      </Td>
                    </Tr>
                  ) : filteredMachines.length === 0 ? (
                    <Tr>
                      <Td colSpan={7} className="py-12 text-center text-gray-400">
                        કોઈ મશીન મળ્યું નથી.
                      </Td>
                    </Tr>
                  ) : (
                    filteredMachines.map((m, index) => (
                      <Tr key={m._id} className="border-b border-gray-100 hover:bg-gray-50/60 dark:border-dark-600">
                        <Td className="px-4 py-3.5 text-xs text-gray-400">{index + 1}</Td>
                        <Td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="rounded-lg bg-primary-50 px-2 py-1 text-xs font-bold text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                              {m.code}
                            </span>
                            <div>
                              <p className="font-bold text-gray-800 dark:text-dark-100 text-xs">{m.name}</p>
                            </div>
                          </div>
                        </Td>
                        <Td className="px-4 py-3.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                          {m.headCount} હેડ
                        </Td>
                        <Td className="px-4 py-3.5 text-xs font-medium text-gray-700 dark:text-dark-200">
                          {m.machineType}
                        </Td>
                        <Td className="px-4 py-3.5 text-xs">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              m.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : m.status === "Under Maintenance"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-300"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                m.status === "Active"
                                  ? "bg-emerald-500"
                                  : m.status === "Under Maintenance"
                                  ? "bg-amber-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            {m.status === "Active"
                              ? "સક્રિય"
                              : m.status === "Under Maintenance"
                              ? "મેઇન્ટેનન્સ"
                              : "બંધ"}
                          </span>
                        </Td>
                        <Td className="px-4 py-3.5 text-xs text-gray-600 dark:text-dark-300">
                          {m.defaultOperatorName || "-"}
                        </Td>
                        <Td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(m)}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="મશીન સુધારો"
                            >
                              <PencilSquareIcon className="size-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(m)}
                              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="મશીન કાઢી નાખો"
                            >
                              <TrashIcon className="size-4" />
                            </button>
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

        {/* ================================================================ */}
        {/* MODAL: ADD / EDIT MACHINE (Only Name, Head, Type, Status)         */}
        {/* ================================================================ */}
        <Transition appear show={isOpenModal}>
          <Dialog as="div" className="relative z-50" onClose={() => setIsOpenModal(false)}>
            <TransitionChild enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <TransitionChild enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-600">
                      <div>
                        <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                          {isEditing ? "મશીનની વિગતો સુધારો (Edit Machine)" : "નવું મશીન ઉમેરો (Add New Machine)"}
                        </h3>
                        <p className="text-xs text-gray-400">
                          મશીનનું નામ (Name), હેડ (Head) અને પ્રકાર (Type) દાખલ કરો
                        </p>
                      </div>
                      <button onClick={() => setIsOpenModal(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700">
                        <XMarkIcon className="size-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      {/* 1. Machine Name & Code */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <Input
                            label="મશીનનું નામ (Machine Name) *"
                            placeholder="દા.ત. Machine #04"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            error={formErrors.name}
                            required
                          />
                        </div>

                        <div>
                          <Input
                            label="મશીન કોડ (Machine Code)"
                            placeholder="દા.ત. M-04 (ઓટોમેટિક)"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </div>

                      {/* 2. Machine Head & Machine Type */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-primary-50/40 dark:bg-primary-950/20 p-3 rounded-xl border border-primary-100 dark:border-primary-900/40">
                        <div>
                          <Input
                            label="મશીન હેડ (Machine Head) *"
                            type="number"
                            placeholder="દા.ત. 24, 30, 32"
                            value={formData.headCount}
                            onChange={(e) => setFormData({ ...formData, headCount: e.target.value })}
                            error={formErrors.headCount}
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                            મશીનનો પ્રકાર (Machine Type) *
                          </label>
                          <select
                            className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 outline-hidden focus:border-primary-600 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                            value={formData.machineType}
                            onChange={(e) => setFormData({ ...formData, machineType: e.target.value })}
                            required
                          >
                            {MACHINE_TYPE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* 3. Status & Default Operator */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                            સ્થિતિ (Status)
                          </label>
                          <select
                            className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 outline-hidden dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          >
                            <option value="Active">સક્રિય (Active)</option>
                            <option value="Under Maintenance">મેઇન્ટેનન્સ (Maintenance)</option>
                            <option value="Idle">બંધ (Idle)</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                            ડિફોલ્ટ કારીગર (Operator)
                          </label>
                          <select
                            className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-semibold text-gray-800 outline-hidden dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100"
                            value={formData.defaultOperator}
                            onChange={(e) => {
                              const wId = e.target.value;
                              const wObj = workersList.find((w) => w._id === wId);
                              setFormData({
                                ...formData,
                                defaultOperator: wId,
                                defaultOperatorName: wObj ? wObj.name : "",
                              });
                            }}
                          >
                            <option value="">-- કારીગર પસંદ કરો --</option>
                            {workersList.map((w) => (
                              <option key={w._id} value={w._id}>
                                {w.name} ({w.role || "કારીગર"})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-dark-600">
                        <Button type="button" variant="outlined" onClick={() => setIsOpenModal(false)}>
                          રદ કરો
                        </Button>
                        <Button type="submit" color="primary" className="gap-2" disabled={submitting}>
                          {submitting && <Spinner className="size-4" />}
                          <span>{isEditing ? "અપડેટ કરો" : "મશીન સેવ કરો"}</span>
                        </Button>
                      </div>
                    </form>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>

        {/* ================================================================ */}
        {/* MODAL: DELETE CONFIRMATION                                       */}
        {/* ================================================================ */}
        <Transition appear show={isDeleteModalOpen}>
          <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
            <TransitionChild enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
            </TransitionChild>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <TransitionChild enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800">
                    <div className="flex items-center space-x-3 text-rose-600">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40">
                        <TrashIcon className="size-6" />
                      </div>
                      <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                        મશીન ડિલીટ કરવાની ખાતરી
                      </h3>
                    </div>

                    <p className="mt-3 text-xs text-gray-500 dark:text-dark-300 leading-relaxed">
                      શું તમે ખરેખર{" "}
                      <span className="font-bold text-gray-800 dark:text-dark-100">
                        {machineToDelete?.name} ({machineToDelete?.code})
                      </span>{" "}
                      કાઢી નાખવા માંગો છો? આ મશીન સાથે જોડાયેલ તમામ પ્રોડક્શન માહિતી હટાવી દેવામાં આવશે.
                    </p>

                    <div className="mt-6 flex items-center justify-end space-x-3 pt-3 border-t border-gray-100 dark:border-dark-600">
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setIsDeleteModalOpen(false)}
                        disabled={deleting}
                      >
                        રદ કરો
                      </Button>
                      <Button
                        type="button"
                        color="error"
                        className="gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={handleConfirmDelete}
                        disabled={deleting}
                      >
                        {deleting && <Spinner className="size-4" />}
                        <span>હા, ડિલીટ કરો</span>
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
