// Import Dependencies
import { useState, useEffect, useCallback } from "react";
import {
  BuildingStorefrontIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  PhoneIcon,
  MapPinIcon,
  XMarkIcon,
  UserIcon,
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
  Badge,
  Spinner,
} from "components/ui";
import { Page } from "components/shared/Page";
import axios from "utils/axios";

// ----------------------------------------------------------------------

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal State for Add / Edit
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobileNumber: "",
    address: "",
  });
  const [formErrors, setFormErrors] = useState({});

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [merchantToDelete, setMerchantToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch Merchants List
  const fetchMerchants = useCallback(async (searchQuery = "") => {
    try {
      setLoading(true);
      const url = searchQuery
        ? `/merchants?search=${encodeURIComponent(searchQuery)}`
        : "/merchants";
      const response = await axios.get(url);
      if (response.data?.success) {
        setMerchants(response.data.merchants || []);
      }
    } catch (err) {
      console.error("Error fetching merchants:", err);
      toast.error(err?.message || "વેપારીઓ લાવવામાં ભૂલ આવી (Failed to fetch merchants)");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // Handle Search input with Debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchMerchants(val);
  };

  // Open Modal for Create
  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ name: "", mobileNumber: "", address: "" });
    setFormErrors({});
    setIsOpenModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (merchant) => {
    setIsEditing(true);
    setCurrentId(merchant._id);
    setFormData({
      name: merchant.name || "",
      mobileNumber: merchant.mobileNumber || "",
      address: merchant.address || "",
    });
    setFormErrors({});
    setIsOpenModal(true);
  };

  // Validate Form
  const validate = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = "વેપારીનું નામ જરૂરી છે (Merchant name required)";
    }
    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = "મોબાઇલ નંબર જરૂરી છે (Mobile number required)";
    } else if (!/^[0-9]{10}$/.test(formData.mobileNumber.trim())) {
      errors.mobileNumber = "૧૦ આંકડાનો સાચો મોબાઇલ નંબર દાખલ કરો (Valid 10-digit number required)";
    }
    if (!formData.address.trim()) {
      errors.address = "સરનામું જરૂરી છે (Address is required)";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      if (isEditing) {
        const res = await axios.put(`/merchants/${currentId}`, formData);
        if (res.data?.success) {
          toast.success("વેપારીની વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ! (Merchant updated!)");
          setIsOpenModal(false);
          fetchMerchants(search);
        }
      } else {
        const res = await axios.post("/merchants", formData);
        if (res.data?.success) {
          toast.success("નવો વેપારી સફળતાપૂર્વક ઉમેરાઈ ગયો! (Merchant added!)");
          setIsOpenModal(false);
          fetchMerchants(search);
        }
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error(err?.message || "ભૂલ આવી. ફરી પ્રયાસ કરો.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (merchant) => {
    setMerchantToDelete(merchant);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!merchantToDelete?._id) return;

    try {
      setDeleting(true);
      const res = await axios.delete(`/merchants/${merchantToDelete._id}`);
      if (res.data?.success) {
        toast.success("વેપારી સફળતાપૂર્વક ડિલીટ થઈ ગયો! (Merchant deleted!)");
        setIsDeleteModalOpen(false);
        setMerchantToDelete(null);
        fetchMerchants(search);
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err?.message || "ડિલીટ કરવામાં ભૂલ આવી");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Page title="Merchants - Swastik Art">
      <div className="transition-content w-full px-(--margin-x) pt-5 pb-8 lg:pt-6">
        {/* Page Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-600/10 text-primary-600 dark:bg-primary-400/10 dark:text-primary-400">
              <BuildingStorefrontIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-dark-50">
                વેપારીઓ (Merchants)
              </h2>
              <p className="text-xs text-gray-400 dark:text-dark-300">
                સ્વાસ્તિક આર્ટ - તમામ વેપારી અને પાર્ટીઓની યાદી તથા મેનેજમેન્ટ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="flat"
              className="gap-2"
              onClick={() => {
                setIsRefreshing(true);
                fetchMerchants(search);
              }}
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
              onClick={handleOpenCreate}
            >
              <PlusIcon className="size-4.5" />
              <span>નવો વેપારી ઉમેરો (Add Merchant)</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase dark:text-dark-300">
                  કુલ વેપારીઓ (Total Merchants)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-gray-800 dark:text-dark-50">
                  {loading ? "-" : merchants.length}
                </h3>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <BuildingStorefrontIcon className="size-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase dark:text-dark-300">
                  એક્ટિવ એકાઉન્ટ્સ (Active)
                </p>
                <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {loading ? "-" : merchants.length}
                </h3>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Badge color="success" className="size-3 p-0" />
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase dark:text-dark-300">
                  સૌથી છેલ્લે ઉમેરાયેલ (Recently Added)
                </p>
                <h4 className="mt-1 truncate text-sm font-semibold text-gray-700 dark:text-dark-100">
                  {merchants[0]?.name || "હજી સુધી કોઈ નથી"}
                </h4>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <UserIcon className="size-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Actions Bar */}
        <Card className="mt-5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Input
                placeholder="વેપારીનું નામ, નંબર કે સરનામું શોધો... (Search)..."
                value={search}
                onChange={handleSearchChange}
                prefix={<MagnifyingGlassIcon className="size-4.5 text-gray-400" />}
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    fetchMerchants("");
                  }}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="size-4" />
                </button>
              )}
            </div>

            <div className="text-xs text-gray-400 dark:text-dark-300">
              દર્શાવેલ: <span className="font-semibold text-gray-700 dark:text-dark-100">{merchants.length}</span> વેપારીઓ
            </div>
          </div>
        </Card>

        {/* Table View */}
        <Card className="mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <Table hoverable className="w-full text-left">
              <THead>
                <Tr className="border-b border-gray-200 bg-gray-50/75 dark:border-dark-500 dark:bg-dark-800">
                  <Th className="w-12 px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    #
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    વેપારીનું નામ (Name)
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    મોબાઇલ નંબર (Mobile)
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    સરનામું (Address)
                  </Th>
                  <Th className="px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    તારીખ (Created At)
                  </Th>
                  <Th className="w-28 px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase dark:text-dark-300">
                    એક્શન (Actions)
                  </Th>
                </Tr>
              </THead>
              <TBody>
                {loading ? (
                  <Tr>
                    <Td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Spinner className="size-8 text-primary-600" />
                        <span className="text-sm text-gray-500 dark:text-dark-300">
                          વેપારીઓ લોડ થઈ રહ્યા છે... (Loading Merchants...)
                        </span>
                      </div>
                    </Td>
                  </Tr>
                ) : merchants.length === 0 ? (
                  <Tr>
                    <Td colSpan={6} className="py-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center justify-center text-center">
                        <div className="flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-dark-700">
                          <BuildingStorefrontIcon className="size-7" />
                        </div>
                        <h4 className="mt-3 text-base font-semibold text-gray-800 dark:text-dark-100">
                          કોઈ વેપારી મળ્યા નથી
                        </h4>
                        <p className="mt-1 text-xs text-gray-400 dark:text-dark-300">
                          {search
                            ? "તમે શોધેલ વિગતો સાથે કોઈ વેપારી મળ્યા નથી."
                            : "હજી સુધી કોઈ વેપારી ઉમેરવામાં આવ્યા નથી. નીચે આપેલા બટનથી નવો વેપારી ઉમેરો."}
                        </p>
                        {!search && (
                          <Button
                            color="primary"
                            className="mt-4 gap-2"
                            onClick={handleOpenCreate}
                          >
                            <PlusIcon className="size-4" />
                            <span>નવો વેપારી ઉમેરો</span>
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ) : (
                  merchants.map((merchant, index) => (
                    <Tr
                      key={merchant._id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-dark-600 dark:hover:bg-dark-750"
                    >
                      <Td className="px-4 py-3.5 text-xs text-gray-400 dark:text-dark-400">
                        {index + 1}
                      </Td>
                      <Td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-sm font-bold text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                            {merchant.name ? merchant.name.charAt(0).toUpperCase() : "M"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-dark-50">
                              {merchant.name}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-dark-300">
                              ID: {merchant._id.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </Td>
                      <Td className="px-4 py-3.5 text-sm text-gray-700 dark:text-dark-200">
                        <a
                          href={`tel:${merchant.mobileNumber}`}
                          className="inline-flex items-center gap-1.5 font-medium text-primary-600 hover:underline dark:text-primary-400"
                        >
                          <PhoneIcon className="size-3.5" />
                          <span>{merchant.mobileNumber}</span>
                        </a>
                      </Td>
                      <Td className="px-4 py-3.5 text-sm text-gray-600 dark:text-dark-300">
                        <div className="flex items-start gap-1.5 max-w-xs">
                          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                          <span className="line-clamp-2">{merchant.address}</span>
                        </div>
                      </Td>
                      <Td className="px-4 py-3.5 text-xs text-gray-500 dark:text-dark-300">
                        {merchant.createdAt
                          ? dayjs(merchant.createdAt).format("DD-MM-YYYY, hh:mm A")
                          : "-"}
                      </Td>
                      <Td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="flat"
                            className="size-8 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            onClick={() => handleOpenEdit(merchant)}
                            title="Edit Merchant"
                          >
                            <PencilSquareIcon className="size-4" />
                          </Button>
                          <Button
                            variant="flat"
                            className="size-8 p-0 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
                            onClick={() => handleOpenDelete(merchant)}
                            title="Delete Merchant"
                          >
                            <TrashIcon className="size-4" />
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
      </div>

      {/* Add / Edit Merchant Modal */}
      <Transition appear show={isOpenModal}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsOpenModal(false)}>
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-600">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-dark-50">
                      {isEditing
                        ? "વેપારીની વિગતો સુધારો (Edit Merchant)"
                        : "નવો વેપારી ઉમેરો (Add New Merchant)"}
                    </h3>
                    <button
                      onClick={() => setIsOpenModal(false)}
                      className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-700"
                    >
                      <XMarkIcon className="size-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {/* Merchant Name */}
                    <div>
                      <Input
                        label="વેપારી / પેઢીનું નામ (Merchant / Firm Name) *"
                        placeholder="દા.ત. Rajeshbhai Patel અથવા Shree Radhe Textiles"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        error={formErrors.name}
                      />
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <Input
                        label="મોબાઇલ નંબર (Mobile Number) *"
                        placeholder="દા.ત. 9876543210"
                        maxLength={10}
                        value={formData.mobileNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            mobileNumber: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        error={formErrors.mobileNumber}
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <Textarea
                        label="સરનામું (Address) *"
                        placeholder="દા.ત. Ring Road, Surat, Gujarat"
                        rows={3}
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        error={formErrors.address}
                      />
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-dark-600">
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setIsOpenModal(false)}
                        disabled={submitting}
                      >
                        રદ કરો (Cancel)
                      </Button>
                      <Button
                        type="submit"
                        color="primary"
                        className="gap-2"
                        disabled={submitting}
                      >
                        {submitting && <Spinner className="size-4" />}
                        <span>{isEditing ? "અપડેટ કરો (Update)" : "સેવ કરો (Save Merchant)"}</span>
                      </Button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Modal */}
      <Transition appear show={isDeleteModalOpen}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsDeleteModalOpen(false)}
        >
          <TransitionChild
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-dark-800">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                      <TrashIcon className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800 dark:text-dark-50">
                        વેપારી ડિલીટ કરવો છે?
                      </h3>
                      <p className="text-xs text-gray-400 dark:text-dark-300">
                        આ પ્રક્રિયા પછી ડેટા પાછો નહીં મેળવી શકાય.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-gray-50 p-3 dark:bg-dark-700/60">
                    <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                      {merchantToDelete?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      મોબાઇલ: {merchantToDelete?.mobileNumber}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={deleting}
                    >
                      ના, રદ કરો
                    </Button>
                    <Button
                      type="button"
                      color="error"
                      className="gap-2 bg-rose-600 hover:bg-rose-700"
                      onClick={handleConfirmDelete}
                      disabled={deleting}
                    >
                      {deleting && <Spinner className="size-4" />}
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

