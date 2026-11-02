// Import Dependencies
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CheckCircleIcon,
  MapPinIcon,
  PhoneIcon,
  DocumentTextIcon,
  StarIcon,
  SparklesIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
  Squares2X2Icon,
  TableCellsIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { toast } from "sonner";
import clsx from "clsx";

// UI Component Imports
import {
  Button,
  Card,
  Input,
  Textarea,
  Select,
  Table,
  THead,
  TBody,
  Tr,
  Th,
  Td,
  Badge,
  Spinner,
} from "components/ui";
import { Page } from "components/shared/Page";
import axios from "utils/axios";

// ----------------------------------------------------------------------

const INITIAL_FORM = {
  firmName: "",
  businessType: "All Type of Sequence Embroidery Job Work",
  greeting: "Shree Ganeshay Namah",
  ownerName: "",
  mobileNumbers: "",
  address: "",
  gstin: "",
  panNo: "",
  stateCode: "24",
  bankName: "The Panchsheel Mercantile Co-Op. Bank LTD.",
  accountNo: "",
  ifscCode: "",
  branch: "Surat",
  termsAndConditions:
    "Interest 2% on the bill amount after due date.\nComplaint if any regarding this invoice must be settled with in 24 hours.\ndue date 7 days.\nSubject to SURAT Jurisdiction",
  templateType: "swastik",
  isDefault: false,
};

export default function FirmProfilesHome() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'
  const [copiedKey, setCopiedKey] = useState(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Seeding State
  const [seeding, setSeeding] = useState(false);

  // Fetch all profiles from backend API
  const fetchProfiles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const res = await axios.get("/profiles");
      if (res.data?.success && Array.isArray(res.data.profiles)) {
        setProfiles(res.data.profiles);
      } else {
        toast.error("ફર્મ પ્રોફાઇલ ડેટા લોડ કરવામાં નિષ્ફળતા!");
      }
    } catch (err) {
      console.error("Error fetching profiles:", err);
      toast.error(err.message || "પ્રોફાઇલ્સ મેળવવામાં ભૂલ આવી");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Quick Copy Helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`"${text}" કોપી થઈ ગયું!`);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Filtered Profiles based on search query
  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      return (
        p.firmName?.toLowerCase().includes(q) ||
        p.ownerName?.toLowerCase().includes(q) ||
        p.businessType?.toLowerCase().includes(q) ||
        p.gstin?.toLowerCase().includes(q) ||
        p.panNo?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.bankDetails?.bankName?.toLowerCase().includes(q) ||
        p.bankDetails?.accountNo?.toLowerCase().includes(q) ||
        (Array.isArray(p.mobileNumbers) &&
          p.mobileNumbers.some((m) => m?.toLowerCase().includes(q)))
      );
    });
  }, [profiles, search]);

  // Default active profile for the letterhead showcase
  const defaultProfile = useMemo(() => {
    return profiles.find((p) => p.isDefault) || profiles[0] || null;
  }, [profiles]);

  // Open Modal to Add Firm
  const handleOpenAdd = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      ...INITIAL_FORM,
      isDefault: profiles.length === 0, // First profile defaults to true
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Modal to Edit Firm
  const handleOpenEdit = (p) => {
    setIsEditing(true);
    setCurrentId(p._id);
    setFormData({
      firmName: p.firmName || "",
      businessType: p.businessType || "",
      greeting: p.greeting || "",
      ownerName: p.ownerName || "",
      mobileNumbers: Array.isArray(p.mobileNumbers) ? p.mobileNumbers.join(", ") : "",
      address: p.address || "",
      gstin: p.gstin || "",
      panNo: p.panNo || "",
      stateCode: p.stateCode || "24",
      bankName: p.bankDetails?.bankName || "",
      accountNo: p.bankDetails?.accountNo || "",
      ifscCode: p.bankDetails?.ifscCode || "",
      branch: p.bankDetails?.branch || "",
      termsAndConditions: Array.isArray(p.termsAndConditions)
        ? p.termsAndConditions.join("\n")
        : "",
      templateType: p.templateType || "standard",
      isDefault: Boolean(p.isDefault),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Validate Form
  const validateForm = () => {
    const errors = {};
    if (!formData.firmName.trim()) {
      errors.firmName = "પેઢી/ફર્મનું નામ જરૂરી છે (Firm name is required)";
    }
    if (!formData.address.trim()) {
      errors.address = "ફર્મનું સરનામું જરૂરી છે (Firm address is required)";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        firmName: formData.firmName.trim(),
        businessType: formData.businessType.trim(),
        greeting: formData.greeting.trim(),
        ownerName: formData.ownerName.trim(),
        mobileNumbers: formData.mobileNumbers
          ? formData.mobileNumbers
              .split(/[,;\n]/)
              .map((m) => m.trim())
              .filter(Boolean)
          : [],
        address: formData.address.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        panNo: formData.panNo.trim().toUpperCase(),
        stateCode: formData.stateCode.trim() || "24",
        bankDetails: {
          bankName: formData.bankName.trim(),
          accountNo: formData.accountNo.trim(),
          ifscCode: formData.ifscCode.trim().toUpperCase(),
          branch: formData.branch.trim(),
        },
        termsAndConditions: formData.termsAndConditions
          ? formData.termsAndConditions
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        templateType: formData.templateType || "standard",
        isDefault: Boolean(formData.isDefault),
      };

      if (isEditing) {
        await axios.put(`/profiles/${currentId}`, payload);
        toast.success("ફર્મ પ્રોફાઇલ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
      } else {
        await axios.post("/profiles", payload);
        toast.success("નવી ફર્મ પ્રોફાઇલ સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
      }

      setIsModalOpen(false);
      await fetchProfiles();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.message || "ફર્મ સેવ કરવામાં ભૂલ આવી");
    } finally {
      setSubmitting(false);
    }
  };

  // Set Firm as Default
  const handleSetDefault = async (profile) => {
    if (profile.isDefault) return;
    try {
      await axios.put(`/profiles/${profile._id}`, { isDefault: true });
      toast.success(`"${profile.firmName}" હવે ડિફોલ્ટ પેઢી બની ગઈ છે!`);
      await fetchProfiles();
    } catch (err) {
      toast.error(err.message || "ડિફોલ્ટ સેટ કરવામાં ભૂલ આવી");
    }
  };

  // Confirm Delete
  const handleOpenDelete = (profile) => {
    setProfileToDelete(profile);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`/profiles/${profileToDelete._id}`);
      toast.success(`"${profileToDelete.firmName}" સફળતાપૂર્વક ડિલીટ થઈ ગઈ!`);
      setIsDeleteModalOpen(false);
      setProfileToDelete(null);
      await fetchProfiles();
    } catch (err) {
      toast.error(err.message || "ડિલીટ કરવામાં ભૂલ આવી");
    } finally {
      setDeleting(false);
    }
  };

  // Seed / Reset Default Profiles
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await axios.post("/profiles/seed");
      if (res.data?.success) {
        toast.success("બંને ડિફોલ્ટ ફર્મ્સ (Astha Fashion & Swastik Art) સીડ થઈ ગઈ!");
        await fetchProfiles();
      }
    } catch (err) {
      toast.error(err.message || "સીડ કરવામાં ભૂલ આવી");
    } finally {
      setSeeding(false);
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = profiles.length;
    const defaultFirm = profiles.find((p) => p.isDefault)?.firmName || "નથી સેટ";
    const gstRegistered = profiles.filter((p) => p.gstin && p.gstin.trim()).length;
    const bankLinked = profiles.filter(
      (p) => p.bankDetails?.accountNo && p.bankDetails?.bankName,
    ).length;
    return { total, defaultFirm, gstRegistered, bankLinked };
  }, [profiles]);

  return (
    <Page title="ફર્મ પ્રોફાઇલ મેનેજમેન્ટ (Firm Profiles)">
      <div className="transition-content w-full px-(--margin-x) pt-5 lg:pt-6 pb-12">
        {/* =================================================================== */}
        {/* HERO HEADER */}
        {/* =================================================================== */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                <BuildingOffice2Icon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                  ફર્મ પ્રોફાઇલ મેનેજમેન્ટ
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    (Firm Profiles)
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  સ્વસ્તિક આર્ટ અને આસ્થા ફેશન સહિતની વ્યવસાયિક પેઢીઓ, બેંક એકાઉન્ટ્સ અને બિલિંગ ટેમ્પલેટ્સ
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/dashboards/challans">
              <Button
                variant="filled"
                color="secondary"
                className="h-10 text-xs sm:text-sm bg-gradient-to-r from-primary-600 to-indigo-600 text-white font-semibold"
              >
                <DocumentTextIcon className="h-4 w-4 mr-1.5" />
                ચલાણ & બિલિંગ (Challans) &rarr;
              </Button>
            </Link>

            <Button
              variant="outlined"
              color="neutral"
              className="h-10 text-xs sm:text-sm"
              onClick={() => fetchProfiles(true)}
              disabled={isRefreshing}
            >
              <ArrowPathIcon
                className={clsx("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")}
              />
              રીફ્રેશ
            </Button>

            <Button
              variant="soft"
              color="primary"
              className="h-10 text-xs sm:text-sm"
              onClick={handleSeedDefaults}
              disabled={seeding}
              title="રીસેટ/ઓટો-સીડ બંને મૂળભૂત પેઢીઓ (Astha & Swastik)"
            >
              <SparklesIcon className={clsx("h-4 w-4 mr-1.5", seeding && "animate-spin")} />
              ડિફોલ્ટ સીડ (Seed Defaults)
            </Button>

            <Button
              variant="filled"
              color="primary"
              className="h-10 text-xs sm:text-sm shadow-sm"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="h-4 w-4 mr-1.5 stroke-[2.5]" />
              નવી ફર્મ ઉમેરો (Add Firm)
            </Button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* STATS METRIC CARDS */}
        {/* =================================================================== */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-6">
          {/* Card 1: Total Firms */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  કુલ પેઢીઓ (Total Firms)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </h3>
                <p className="mt-0.5 text-xs text-primary-600 dark:text-primary-400">
                  નોંધાયેલ સક્રિય ફર્મ્સ
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <BuildingOffice2Icon className="h-6 w-6" />
              </div>
            </div>
          </Card>

          {/* Card 2: Default Firm */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  મુખ્ય ડિફોલ્ટ ફર્મ
                </p>
                <h3 className="mt-1 text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {stats.defaultFirm}
                </h3>
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> પ્રાથમિક બિલિંગ
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <StarSolidIcon className="h-6 w-6" />
              </div>
            </div>
          </Card>

          {/* Card 3: GSTIN Registered */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  GST રજિસ્ટર્ડ
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.gstRegistered}
                  <span className="text-sm font-normal text-gray-400"> / {stats.total}</span>
                </h3>
                <p className="mt-0.5 text-xs text-purple-600 dark:text-purple-400">
                  GSTIN ધરાવતી ફર્મ્સ
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
            </div>
          </Card>

          {/* Card 4: Bank Configured */}
          <Card className="p-4 bg-white/70 dark:bg-dark-700/80 backdrop-blur-sm border border-gray-200/80 dark:border-dark-600/80 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  બેંક એકાઉન્ટ્સ
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.bankLinked}
                  <span className="text-sm font-normal text-gray-400"> / {stats.total}</span>
                </h3>
                <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                  ચલાણ/બિલ પેમેન્ટ લિંક્ડ
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <BanknotesIcon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* =================================================================== */}
        {/* ACTIVE DEFAULT FIRM LETTERHEAD SHOWCASE BANNER */}
        {/* =================================================================== */}
        {defaultProfile && (
          <div className="mb-6 rounded-2xl border border-primary-500/30 bg-gradient-to-r from-primary-950/20 via-primary-900/10 to-transparent p-5 sm:p-6 shadow-sm dark:border-primary-500/20 dark:bg-dark-700/60 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 -mt-6 -mr-6 h-36 w-36 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="soft" color="primary" className="text-xs font-semibold px-2.5 py-0.5">
                    ★ મુખ્ય સક્રિય પેઢી (Active Default Billing Firm)
                  </Badge>
                  {defaultProfile.templateType && (
                    <Badge variant="outlined" color="neutral" className="text-xs uppercase font-mono">
                      Template: {defaultProfile.templateType}
                    </Badge>
                  )}
                  {defaultProfile.greeting && (
                    <span className="text-xs italic text-amber-600 dark:text-amber-400 font-medium">
                      ॥ {defaultProfile.greeting} ॥
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-gray-900 dark:text-white uppercase font-sans">
                    {defaultProfile.firmName}
                  </h2>
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mt-0.5">
                    {defaultProfile.businessType || "All Types of Embroidery Job Work"}
                  </p>
                </div>

                {defaultProfile.ownerName && (
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <IdentificationIcon className="h-4 w-4 text-gray-400" />
                    પ્રોપ્રાઇટર / માલિક:{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {defaultProfile.ownerName}
                    </span>
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-600 dark:text-gray-300 pt-1">
                  {defaultProfile.address && (
                    <span className="flex items-center gap-1.5 max-w-xl">
                      <MapPinIcon className="h-4 w-4 text-gray-400 shrink-0" />
                      <span>{defaultProfile.address}</span>
                    </span>
                  )}
                  {Array.isArray(defaultProfile.mobileNumbers) &&
                    defaultProfile.mobileNumbers.length > 0 && (
                      <span className="flex items-center gap-1.5">
                        <PhoneIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>{defaultProfile.mobileNumbers.join(", ")}</span>
                      </span>
                    )}
                </div>
              </div>

              {/* Right Side Bank & Tax Pills */}
              <div className="shrink-0 bg-white/80 dark:bg-dark-800/80 rounded-xl p-4 border border-gray-200 dark:border-dark-600 max-w-md w-full lg:w-auto">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <BanknotesIcon className="h-4 w-4 text-emerald-500" /> બેંક ખાતા વિગત
                  </span>
                  <span className="text-[11px] font-mono text-gray-400">
                    રાજ્ય કોડ: {defaultProfile.stateCode || "24"}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                    {defaultProfile.bankDetails?.bankName || "બેંક વિગત સેટ નથી"}
                  </div>
                  {defaultProfile.bankDetails?.accountNo && (
                    <div className="flex items-center justify-between font-mono bg-gray-50 dark:bg-dark-700/60 px-2 py-1 rounded">
                      <span>A/C: {defaultProfile.bankDetails.accountNo}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            defaultProfile.bankDetails.accountNo,
                            `hero-ac-${defaultProfile._id}`,
                          )
                        }
                        className="text-gray-400 hover:text-primary-500 p-0.5 ml-2"
                        title="એકાઉન્ટ નંબર કોપી કરો"
                      >
                        {copiedKey === `hero-ac-${defaultProfile._id}` ? (
                          <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  {defaultProfile.bankDetails?.ifscCode && (
                    <div className="flex items-center justify-between font-mono bg-gray-50 dark:bg-dark-700/60 px-2 py-1 rounded">
                      <span>IFSC: {defaultProfile.bankDetails.ifscCode}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            defaultProfile.bankDetails.ifscCode,
                            `hero-ifsc-${defaultProfile._id}`,
                          )
                        }
                        className="text-gray-400 hover:text-primary-500 p-0.5 ml-2"
                        title="IFSC કોડ કોપી કરો"
                      >
                        {copiedKey === `hero-ifsc-${defaultProfile._id}` ? (
                          <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  {defaultProfile.bankDetails?.branch && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      શાખા: {defaultProfile.bankDetails.branch}
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-dark-600 flex items-center justify-between">
                  <div className="flex gap-2">
                    {defaultProfile.gstin ? (
                      <span className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                        GST: {defaultProfile.gstin}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">No GSTIN</span>
                    )}
                    {defaultProfile.panNo && (
                      <span className="text-[11px] font-mono font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/20">
                        PAN: {defaultProfile.panNo}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="flat"
                    color="primary"
                    className="h-7 text-xs px-2"
                    onClick={() => handleOpenEdit(defaultProfile)}
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5 mr-1" /> સુધારો
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* SEARCH & VIEW CONTROLS TOOLBAR */}
        {/* =================================================================== */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="પેઢીનું નામ, GST, PAN, બેંક કે મોબાઈલ શોધો..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-sm w-full bg-white dark:bg-dark-700 rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              કુલ પરિણામ: <strong className="text-gray-900 dark:text-white">{filteredProfiles.length}</strong>
            </span>

            {/* View Mode Switcher */}
            <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-dark-600 ml-2">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  viewMode === "cards"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                <Squares2X2Icon className="h-4 w-4" />
                કાર્ડ વ્યુ
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  viewMode === "table"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-dark-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                <TableCellsIcon className="h-4 w-4" />
                ટેબલ વ્યુ
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* LOADING STATE */}
        {/* =================================================================== */}
        {loading && profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner className="h-10 w-10 text-primary-500" />
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              ફર્મ પ્રોફાઇલ ડેટા લોડ થઈ રહ્યો છે...
            </p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-dark-600 p-12 text-center bg-white/50 dark:bg-dark-700/50">
            <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
              કોઈ ફર્મ પ્રોફાઇલ મળી નથી
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {search
                ? `"${search}" માટે કોઈ રેકોર્ડ મળ્યો નથી.`
                : "હજુ સુધી કોઈ પેઢી ઉમેરાયેલી નથી. નવી ફર્મ ઉમેરો અથવા ડિફોલ્ટ સીડ કરો."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              {search ? (
                <Button variant="outlined" color="neutral" onClick={() => setSearch("")}>
                  શોધ સાફ કરો
                </Button>
              ) : (
                <>
                  <Button variant="filled" color="primary" onClick={handleOpenAdd}>
                    <PlusIcon className="h-4 w-4 mr-1.5" /> નવી ફર્મ ઉમેરો
                  </Button>
                  <Button variant="soft" color="primary" onClick={handleSeedDefaults}>
                    <SparklesIcon className="h-4 w-4 mr-1.5" /> ડિફોલ્ટ સીડ કરો
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : viewMode === "cards" ? (
          /* =================================================================== */
          /* CARDS GRID VIEW */
          /* =================================================================== */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProfiles.map((p) => {
              const isDefault = Boolean(p.isDefault);
              return (
                <Card
                  key={p._id}
                  className={clsx(
                    "flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-md",
                    isDefault
                      ? "border-primary-500/40 bg-gradient-to-br from-white via-white to-primary-50/30 dark:from-dark-700 dark:via-dark-700 dark:to-primary-950/20"
                      : "border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-700",
                  )}
                >
                  {/* Card Header */}
                  <div className="p-5 sm:p-6 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isDefault ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20">
                              <StarSolidIcon className="h-3.5 w-3.5 text-emerald-500" />
                              ડિફોલ્ટ પેઢી (Default)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-dark-600 dark:text-gray-300">
                              સેકન્ડરી પેઢી
                            </span>
                          )}

                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 uppercase">
                            {p.templateType || "swastik"}
                          </span>

                          {p.greeting && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 italic">
                              ॥ {p.greeting} ॥
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white uppercase font-sans">
                          {p.firmName}
                        </h3>

                        <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                          {p.businessType || "All Types of Embroidery Job Work"}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="flat"
                          color="neutral"
                          isIcon
                          className="h-8 w-8 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                          onClick={() => handleOpenEdit(p)}
                          title="પેઢી વિગત સુધારો (Edit)"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="flat"
                          color="neutral"
                          isIcon
                          className="h-8 w-8 text-gray-500 hover:text-error dark:hover:text-error-light"
                          onClick={() => handleOpenDelete(p)}
                          title="પેઢી ડિલીટ કરો (Delete)"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {p.ownerName && (
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                        <IdentificationIcon className="h-3.5 w-3.5 text-gray-400" />
                        પ્રોપ્રાઇટર:{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {p.ownerName}
                        </span>
                      </p>
                    )}

                    {/* Address & Contact */}
                    <div className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-dark-600 pt-3">
                      {p.address && (
                        <div className="flex items-start gap-1.5">
                          <MapPinIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                          <span>{p.address}</span>
                        </div>
                      )}

                      {Array.isArray(p.mobileNumbers) && p.mobileNumbers.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <PhoneIcon className="h-4 w-4 text-gray-400 shrink-0" />
                          <span className="font-medium">મોબાઇલ:</span>
                          {p.mobileNumbers.map((m, idx) => (
                            <span
                              key={idx}
                              className="font-mono bg-gray-100 dark:bg-dark-600 px-2 py-0.5 rounded text-[11px]"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tax Pills: GSTIN & PAN */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {p.gstin ? (
                        <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-xs font-mono">
                          <span className="font-bold text-[10px] uppercase text-emerald-600 dark:text-emerald-400">
                            GSTIN:
                          </span>
                          <span>{p.gstin}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.gstin, `gst-${p._id}`)}
                            className="ml-1 text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200"
                            title="GSTIN કોપી કરો"
                          >
                            {copiedKey === `gst-${p._id}` ? (
                              <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic bg-gray-50 dark:bg-dark-600/50 px-2 py-0.5 rounded">
                          GST લાગુ નથી
                        </span>
                      )}

                      {p.panNo && (
                        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-500/20 px-2.5 py-1 rounded-lg text-xs font-mono">
                          <span className="font-bold text-[10px] uppercase text-blue-600 dark:text-blue-400">
                            PAN:
                          </span>
                          <span>{p.panNo}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.panNo, `pan-${p._id}`)}
                            className="ml-1 text-blue-600 hover:text-blue-800 dark:hover:text-blue-200"
                            title="PAN કોપી કરો"
                          >
                            {copiedKey === `pan-${p._id}` ? (
                              <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      )}

                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto font-mono">
                        રાજ્ય: <strong>{p.stateCode || "24"}</strong>
                      </span>
                    </div>

                    {/* Bank Details Container */}
                    <div className="mt-4 rounded-xl bg-gray-50 p-3.5 dark:bg-dark-800/70 border border-gray-200/80 dark:border-dark-600">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <BanknotesIcon className="h-4 w-4 text-emerald-500" />
                          {p.bankDetails?.bankName || "બેંક ખાતા વિગત"}
                        </span>
                        {p.bankDetails?.branch && (
                          <span className="text-[11px] text-gray-400 font-normal">
                            શાખા: {p.bankDetails.branch}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center justify-between bg-white dark:bg-dark-700 px-2.5 py-1.5 rounded-lg border border-gray-200/60 dark:border-dark-600 font-mono">
                          <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                            A/C No:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {p.bankDetails?.accountNo || "-"}
                            </span>
                            {p.bankDetails?.accountNo && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(p.bankDetails.accountNo, `card-ac-${p._id}`)
                                }
                                className="text-gray-400 hover:text-primary-500"
                                title="A/C No કોપી કરો"
                              >
                                {copiedKey === `card-ac-${p._id}` ? (
                                  <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-white dark:bg-dark-700 px-2.5 py-1.5 rounded-lg border border-gray-200/60 dark:border-dark-600 font-mono">
                          <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                            IFSC:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {p.bankDetails?.ifscCode || "-"}
                            </span>
                            {p.bankDetails?.ifscCode && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopy(p.bankDetails.ifscCode, `card-ifsc-${p._id}`)
                                }
                                className="text-gray-400 hover:text-primary-500"
                                title="IFSC કોડ કોપી કરો"
                              >
                                {copiedKey === `card-ifsc-${p._id}` ? (
                                  <ClipboardDocumentCheckIcon className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Terms & Conditions preview */}
                    {Array.isArray(p.termsAndConditions) && p.termsAndConditions.length > 0 && (
                      <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          બિલ શરતો ({p.termsAndConditions.length}):
                        </span>{" "}
                        <span className="truncate inline-block max-w-[90%] align-bottom">
                          {p.termsAndConditions[0]}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 p-4 dark:border-dark-600 dark:bg-dark-750">
                    <div>
                      {isDefault ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircleIcon className="h-4 w-4" /> સક્રિય બિલિંગ ફર્મ
                        </span>
                      ) : (
                        <Button
                          variant="soft"
                          color="primary"
                          className="h-8 text-xs px-3"
                          onClick={() => handleSetDefault(p)}
                        >
                          <StarIcon className="h-3.5 w-3.5 mr-1" />
                          ડિફોલ્ટ બનાવો (Make Default)
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outlined"
                        color="neutral"
                        className="h-8 text-xs px-3"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5 mr-1" />
                        સુધારો
                      </Button>
                      <Button
                        variant="soft"
                        color="error"
                        className="h-8 text-xs px-3"
                        onClick={() => handleOpenDelete(p)}
                      >
                        <TrashIcon className="h-3.5 w-3.5 mr-1" />
                        ડિલીટ
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* =================================================================== */
          /* TABLE VIEW */
          /* =================================================================== */
          <Card className="overflow-hidden rounded-2xl border border-gray-200 dark:border-dark-600">
            <div className="overflow-x-auto">
              <Table className="w-full text-left">
                <THead className="bg-gray-50 dark:bg-dark-800 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <Tr>
                    <Th className="py-3.5 px-4 font-semibold">#</Th>
                    <Th className="py-3.5 px-4 font-semibold">ફર્મ નામ & ઓનર</Th>
                    <Th className="py-3.5 px-4 font-semibold">બિઝનેસ પ્રકાર</Th>
                    <Th className="py-3.5 px-4 font-semibold">સંપર્ક & સરનામું</Th>
                    <Th className="py-3.5 px-4 font-semibold">GSTIN / PAN</Th>
                    <Th className="py-3.5 px-4 font-semibold">બેંક વિગતો</Th>
                    <Th className="py-3.5 px-4 font-semibold">ટેમ્પલેટ</Th>
                    <Th className="py-3.5 px-4 font-semibold">સ્ટેટસ</Th>
                    <Th className="py-3.5 px-4 font-semibold text-right">એક્શન્સ</Th>
                  </Tr>
                </THead>
                <TBody className="divide-y divide-gray-150 dark:divide-dark-600 text-sm">
                  {filteredProfiles.map((p, idx) => {
                    const isDefault = Boolean(p.isDefault);
                    return (
                      <Tr
                        key={p._id}
                        className={clsx(
                          "transition-colors hover:bg-gray-50/70 dark:hover:bg-dark-600/40",
                          isDefault && "bg-primary-50/20 dark:bg-primary-950/10",
                        )}
                      >
                        <Td className="py-4 px-4 font-mono text-xs text-gray-400">
                          {idx + 1}
                        </Td>

                        {/* Firm & Owner */}
                        <Td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white uppercase">
                              {p.firmName}
                            </span>
                            {p.ownerName ? (
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                <IdentificationIcon className="h-3 w-3" />
                                {p.ownerName}
                              </span>
                            ) : null}
                            {p.greeting && (
                              <span className="text-[11px] italic text-amber-600 dark:text-amber-400">
                                {p.greeting}
                              </span>
                            )}
                          </div>
                        </Td>

                        {/* Business Type */}
                        <Td className="py-4 px-4 text-xs text-gray-600 dark:text-gray-300 max-w-xs">
                          {p.businessType || "-"}
                        </Td>

                        {/* Contact & Address */}
                        <Td className="py-4 px-4 max-w-xs">
                          <div className="text-xs space-y-1">
                            {Array.isArray(p.mobileNumbers) && p.mobileNumbers.length > 0 && (
                              <div className="font-mono text-gray-900 dark:text-white flex items-center gap-1">
                                <PhoneIcon className="h-3 w-3 text-gray-400" />
                                {p.mobileNumbers.join(", ")}
                              </div>
                            )}
                            {p.address && (
                              <div className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {p.address}
                              </div>
                            )}
                          </div>
                        </Td>

                        {/* Tax: GSTIN / PAN */}
                        <Td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 text-xs font-mono">
                            {p.gstin ? (
                              <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                                GST: {p.gstin}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">
                                No GSTIN
                              </span>
                            )}
                            {p.panNo && (
                              <span className="text-blue-700 dark:text-blue-300 font-medium">
                                PAN: {p.panNo}
                              </span>
                            )}
                          </div>
                        </Td>

                        {/* Bank Details */}
                        <Td className="py-4 px-4 max-w-xs">
                          <div className="text-xs space-y-0.5">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {p.bankDetails?.bankName || "-"}
                            </div>
                            {p.bankDetails?.accountNo && (
                              <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                A/C: {p.bankDetails.accountNo}
                              </div>
                            )}
                            {p.bankDetails?.ifscCode && (
                              <div className="font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                IFSC: {p.bankDetails.ifscCode}
                              </div>
                            )}
                          </div>
                        </Td>

                        {/* Template */}
                        <Td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 uppercase">
                            {p.templateType || "swastik"}
                          </span>
                        </Td>

                        {/* Status */}
                        <Td className="py-4 px-4 whitespace-nowrap">
                          {isDefault ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                              <CheckCircleIcon className="h-3.5 w-3.5" /> ડિફોલ્ટ
                            </span>
                          ) : (
                            <Button
                              variant="soft"
                              color="neutral"
                              className="h-7 text-xs px-2"
                              onClick={() => handleSetDefault(p)}
                            >
                              <StarIcon className="h-3 w-3 mr-1" />
                              ડિફોલ્ટ સેટ
                            </Button>
                          )}
                        </Td>

                        {/* Actions */}
                        <Td className="py-4 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="flat"
                              color="neutral"
                              isIcon
                              className="h-8 w-8 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400"
                              onClick={() => handleOpenEdit(p)}
                              title="સુધારો"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="flat"
                              color="neutral"
                              isIcon
                              className="h-8 w-8 text-gray-500 hover:text-error dark:hover:text-error-light"
                              onClick={() => handleOpenDelete(p)}
                              title="ડિલીટ કરો"
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

        {/* =================================================================== */}
        {/* ADD / EDIT FIRM MODAL */}
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
                  <DialogPanel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-dark-700 border border-gray-200 dark:border-dark-600">
                    <div className="flex items-center justify-between border-b border-gray-150 pb-4 dark:border-dark-600">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                          <BuildingOffice2Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {isEditing ? "ફર્મ પ્રોફાઇલ સુધારો (Edit Firm Profile)" : "નવી ફર્મ ઉમેરો (Add New Firm)"}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            બિલિંગ, ચલાણ અને બેંક એકાઉન્ટ માટે પેઢીની વિગતો દાખલ કરો
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        disabled={submitting}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-dark-600 dark:hover:text-dark-200"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmitForm} className="mt-5 space-y-5">
                      {/* Section 1: Firm Identity */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-3 flex items-center gap-1.5">
                          <BuildingOffice2Icon className="h-4 w-4" /> પેઢીની સામાન્ય વિગતો (General Information)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Input
                              label="પેઢી / ફર્મનું નામ *"
                              placeholder="દા.ત. Swastik Art અથવા Astha Fashion"
                              value={formData.firmName}
                              onChange={(e) =>
                                setFormData({ ...formData, firmName: e.target.value })
                              }
                              error={formErrors.firmName}
                              required
                            />
                          </div>

                          <div>
                            <Input
                              label="બિઝનેસ પ્રકાર (Business Type)"
                              placeholder="દા.ત. All Type of Sequence Embroidery Job Work"
                              value={formData.businessType}
                              onChange={(e) =>
                                setFormData({ ...formData, businessType: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="માલિક / પ્રોપ્રાઇટરનું નામ (Owner Name)"
                              placeholder="દા.ત. Maheshbhai L. Sutariya"
                              value={formData.ownerName}
                              onChange={(e) =>
                                setFormData({ ...formData, ownerName: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="શુભેચ્છા સૂત્ર (Greeting / Header)"
                              placeholder="દા.ત. Shree Ganeshay Namah અથવા શ્રી ગણેશાય નમઃ"
                              value={formData.greeting}
                              onChange={(e) =>
                                setFormData({ ...formData, greeting: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              ટેમ્પલેટ પ્રકાર (Template Type)
                            </label>
                            <Select
                              value={formData.templateType}
                              onChange={(e) =>
                                setFormData({ ...formData, templateType: e.target.value })
                              }
                              className="w-full text-sm"
                            >
                              <option value="swastik">Swastik Art Template (GST Format)</option>
                              <option value="astha">Astha Fashion Template (PAN Format)</option>
                              <option value="standard">Standard Template</option>
                            </Select>
                          </div>

                          <div className="flex items-center pt-5">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={formData.isDefault}
                                onChange={(e) =>
                                  setFormData({ ...formData, isDefault: e.target.checked })
                                }
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-500"
                              />
                              <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
                                <StarSolidIcon className="h-4 w-4 text-amber-500" />
                                આ ફર્મને ડિફોલ્ટ પેઢી બનાવો (Make Default Firm)
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Contact & Tax Information */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-3 flex items-center gap-1.5">
                          <MapPinIcon className="h-4 w-4" /> સંપર્ક અને ટેક્સ વિગતો (Contact & Tax Details)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <Textarea
                              label="ફર્મનું પૂરું સરનામું (Address) *"
                              placeholder="દા.ત. 66,67, 3rd Floor, R.K. Industries, Kapodra, Varachha Road, Surat"
                              rows={2}
                              value={formData.address}
                              onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                              }
                              error={formErrors.address}
                              required
                            />
                          </div>

                          <div>
                            <Input
                              label="મોબાઇલ નંબર(s) (અલ્પવિરામથી અલગ કરો)"
                              placeholder="દા.ત. 98255 85058, 99045 84177"
                              value={formData.mobileNumbers}
                              onChange={(e) =>
                                setFormData({ ...formData, mobileNumbers: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="રાજ્ય કોડ (State Code)"
                              placeholder="24 (ગુજરાત)"
                              value={formData.stateCode}
                              onChange={(e) =>
                                setFormData({ ...formData, stateCode: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="GSTIN (GST નંબર)"
                              placeholder="દા.ત. 24BKJPS1499H1ZP"
                              value={formData.gstin}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  gstin: e.target.value.toUpperCase(),
                                })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="PAN નંબર"
                              placeholder="દા.ત. DFQPS3042G"
                              value={formData.panNo}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  panNo: e.target.value.toUpperCase(),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Bank Details */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-3 flex items-center gap-1.5">
                          <BanknotesIcon className="h-4 w-4" /> બેંક ખાતાની વિગતો (Bank Account Information)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Input
                              label="બેંકનું નામ (Bank Name)"
                              placeholder="The Panchsheel Mercantile Co-Op. Bank LTD."
                              value={formData.bankName}
                              onChange={(e) =>
                                setFormData({ ...formData, bankName: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="એકાઉન્ટ નંબર (Account No)"
                              placeholder="1002021012299"
                              value={formData.accountNo}
                              onChange={(e) =>
                                setFormData({ ...formData, accountNo: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="IFSC કોડ"
                              placeholder="YESB0PMCB02"
                              value={formData.ifscCode}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  ifscCode: e.target.value.toUpperCase(),
                                })
                              }
                            />
                          </div>

                          <div>
                            <Input
                              label="શાખા (Branch)"
                              placeholder="Ring Road, Surat / Varachha Road, Surat"
                              value={formData.branch}
                              onChange={(e) =>
                                setFormData({ ...formData, branch: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Terms & Conditions */}
                      <div className="border-t border-gray-150 pt-4 dark:border-dark-600">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-2 flex items-center gap-1.5">
                          <DocumentTextIcon className="h-4 w-4" /> બિલિંગ શરતો & નિયમો (Terms and Conditions)
                        </h4>
                        <Textarea
                          label="શરતો (દરેક લાઈન એક શરત ગણાશે)"
                          placeholder="Interest 2% on bill amount after due date..."
                          rows={3}
                          value={formData.termsAndConditions}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              termsAndConditions: e.target.value,
                            })
                          }
                        />
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
                          {isEditing ? "અપડેટ કરો (Update Firm)" : "સેવ કરો (Save Firm)"}
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
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error dark:bg-error/20 dark:text-error-light">
                        <TrashIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          પેઢી ડિલીટ કરવી છે?
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          શું તમે ખરેખર{" "}
                          <strong className="text-gray-900 dark:text-white">
                            &ldquo;{profileToDelete?.firmName}&rdquo;
                          </strong>{" "}
                          ને સિસ્ટમમાંથી ડિલીટ કરવા માંગો છો? આ ક્રિયા રદ કરી શકાશે નહીં.
                        </p>

                        {profileToDelete?.isDefault && (
                          <div className="mt-2.5 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            ⚠️ <strong>ચેતવણી:</strong> આ હાલની મુખ્ય ડિફોલ્ટ ફર્મ છે! આને ડિલીટ કર્યા પછી અન્ય ફર્મને ડિફોલ્ટ બનાવવી પડશે.
                          </div>
                        )}
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
                        હા, ડિલીટ કરો (Delete)
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
