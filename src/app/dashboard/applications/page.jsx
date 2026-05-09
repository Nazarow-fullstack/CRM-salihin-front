'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
    Search,
    Plus,
    Download,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2,
    Save,
    Upload,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import api from '@/lib/axios';
import { formatFormDisplayName } from '@/lib/formDisplayName';
import {
    FORMS_PAGE_SIZE,
    parseFormsListPayload,
    buildFormsListQuery,
    fetchAllFormsPages,
} from '@/lib/formsListApi';
import { uploadFormsExcel } from '@/lib/formsExcelUpload';

// --- CONFIGURATION ---
const STATUS_CONFIG = {
    new_message: { label: 'Паёми нав', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
    submitted: { label: 'Пуркардани анкета', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
    under_review: { label: 'Кумита', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
    to_accountant: { label: 'Бухгалтерия', color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400' },
    rejected: { label: 'Рад', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
    approved: { label: 'Кумакшуда', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
    family_video: { label: 'Видеои', color: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400' },
    help_later: { label: 'Баъдтар', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
    bank_card: { label: 'Ҳуҷҷат', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' },
    deleted: { label: 'Удалит', color: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-500' },
};

const REGIONS = ['НТМ', 'ХАТЛОН', 'СУҒД', 'ВМКБ', 'БЕРУН АЗ ТҶК'];
const PURPOSES = ['Пешниҳод дорам', 'Кӯмак лозим'];
const YARIM_REASON_OPTIONS = [
    { value: 'Табобат', label: 'Табобат' },
    { value: 'Таҳсилот', label: 'Таҳсилот' },
    { value: 'Хӯрок', label: 'Хӯрок' },
    { value: 'Таъмири хона', label: 'Таъмири хона' },
    { value: 'Дастгирии тиҷорат', label: 'Дастгирии тиҷорат' },
    { value: 'Ниёзи аввали', label: 'Ниёзи аввали' },
];

/** Рӯйхат API гоҳ `status`, гоҳ `status_code` / ғ. мефиристад — бо ключҳои филтр яксон кунед */
function getFormListItemStatusKey(item) {
    const raw =
        item?.status ??
        item?.status_code ??
        item?.form_status ??
        item?.application_status ??
        item?.state;
    if (raw == null || raw === '') return '';
    return String(raw).trim().toLowerCase();
}

function formMatchesFilters(item, { search, statusFilter, regionFilter, purposeFilter, yarimReasonFilter }) {
    const searchLower = search.toLowerCase();
    const nameMatch =
        formatFormDisplayName(item).toLowerCase().includes(searchLower) ||
        item.full_name?.toLowerCase().includes(searchLower) ||
        item.first_name?.toLowerCase().includes(searchLower) ||
        item.last_name?.toLowerCase().includes(searchLower) ||
        item.father_name?.toLowerCase().includes(searchLower);
    const phoneMatch = item.phone_number?.includes(searchLower);
    const itemStatus = getFormListItemStatusKey(item);
    const wantStatus = String(statusFilter ?? '').trim().toLowerCase();
    const statusMatch = wantStatus === 'all' || itemStatus === wantStatus;
    const regionMatch = regionFilter === 'all' || item.address_region === regionFilter;
    const purposeMatch = purposeFilter === 'all' || item.application_purpose === purposeFilter;
    const yarimMatch = yarimReasonFilter === 'all' || item.polls?.[0]?.yarim_reason === yarimReasonFilter;
    return (nameMatch || phoneMatch) && statusMatch && regionMatch && purposeMatch && yarimMatch;
}

export default function ApplicationsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [dataMode, setDataMode] = useState('server');
    const [accumulatedForms, setAccumulatedForms] = useState([]);
    const [plainFullList, setPlainFullList] = useState([]);
    /** Сервер ҳамеша ҳамаи рӯйхатро як JSON мефиристад — як бор гиред, дар UI 10-10 намоиш диҳед */
    const [bulkForms, setBulkForms] = useState(null);
    const [listTotal, setListTotal] = useState(0);
    /** count бевосита аз API; агар набошад, саҳифабандӣ танҳо аз `hasNext` */
    const [listTotalExact, setListTotalExact] = useState(true);
    const [listHasNext, setListHasNext] = useState(false);
    const [listPage, setListPage] = useState(() => {
        const p = Number(searchParams.get('page'));
        return Number.isFinite(p) && p >= 1 ? p : 1;
    });
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);
    const excelFileInputRef = useRef(null);
    const [excelUploading, setExcelUploading] = useState(false);
    const [excelUploadResult, setExcelUploadResult] = useState(null);

    // Filters
    const [search, setSearch] = useState(() => searchParams.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') || '');
    const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
    const [regionFilter, setRegionFilter] = useState(() => searchParams.get('region') || 'all');
    const [purposeFilter, setPurposeFilter] = useState(() => searchParams.get('purpose') || 'all');
    const [yarimReasonFilter, setYarimReasonFilter] = useState(() => searchParams.get('yarim_reason') || 'all');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Application State
    const [formData, setFormData] = useState({
        full_name: '',
        last_name: '',
        first_name: '',
        father_name: '',
        phone_number: '',
        application_purpose: '',
        address_region: '',
        detailed_address: '',
        description: ''
    });

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    const listFilterArgs = useMemo(
        () => ({
            status: statusFilter,
            region: regionFilter,
            purpose: purposeFilter,
            search: debouncedSearch,
        }),
        [statusFilter, regionFilter, purposeFilter, debouncedSearch]
    );

    const listFilterKey = useMemo(() => JSON.stringify(listFilterArgs), [listFilterArgs]);

    const prevListFilterKeyForFetchRef = useRef(null);
    const bulkDataFilterKeyRef = useRef('');
    const bulkFormsRef = useRef(null);
    bulkFormsRef.current = bulkForms;

    useEffect(() => {
        const filterKey = `${listFilterKey}|${refreshKey}`;
        const fkChanged =
            prevListFilterKeyForFetchRef.current != null &&
            prevListFilterKeyForFetchRef.current !== listFilterKey;
        prevListFilterKeyForFetchRef.current = listFilterKey;

        const pageToLoad = fkChanged ? 1 : listPage;
        if (fkChanged && listPage !== 1) {
            setListPage(1);
        }

        if (
            bulkFormsRef.current != null &&
            bulkDataFilterKeyRef.current === filterKey &&
            !fkChanged
        ) {
            return;
        }

        const ac = new AbortController();
        setLoading(true);
        setListTotal(0);
        setListTotalExact(true);
        setListHasNext(false);
        setBulkForms(null);
        setPlainFullList([]);
        setAccumulatedForms([]);

        (async () => {
            try {
                // Status seçiləndə: hər səhifədə eyni `status` parametri ilə birləşdirilmiş siyahı (DRF ilk səhifədə filter tətbiq etmirsə belə düz nəticə)
                if (statusFilter !== 'all') {
                    const all = await fetchAllFormsPages(api, listFilterArgs, { signal: ac.signal });
                    if (ac.signal.aborted) return;
                    bulkDataFilterKeyRef.current = filterKey;
                    setDataMode('server');
                    setBulkForms(Array.isArray(all) ? all : []);
                    setPlainFullList([]);
                    setAccumulatedForms([]);
                    const n = Array.isArray(all) ? all.length : 0;
                    setListTotal(n);
                    setListTotalExact(true);
                    setListHasNext(false);
                } else {
                    const params = buildFormsListQuery(pageToLoad, listFilterArgs);
                    const response = await api.get('/forms/', { params, signal: ac.signal });
                    const parsed = parseFormsListPayload(response.data);
                    if (parsed.bulkLocalPaging && parsed.bulkDataset) {
                        bulkDataFilterKeyRef.current = filterKey;
                        setDataMode('server');
                        setBulkForms(parsed.bulkDataset);
                        setListTotal(parsed.total);
                        setListTotalExact(true);
                        setListHasNext(false);
                    } else if (parsed.isPlainArray) {
                        bulkDataFilterKeyRef.current = '';
                        setDataMode('plain');
                        setPlainFullList(parsed.items);
                        setListTotal(parsed.items.length);
                        setListTotalExact(true);
                        setListHasNext(false);
                    } else {
                        bulkDataFilterKeyRef.current = '';
                        setDataMode('server');
                        setAccumulatedForms(parsed.items);
                        setListTotal(parsed.total);
                        setListTotalExact(parsed.totalExact !== false);
                        setListHasNext(Boolean(parsed.hasNext ?? parsed.next));
                    }
                }
            } catch (error) {
                if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return;
                console.error('Failed to fetch forms', error);
            } finally {
                if (!ac.signal.aborted) setLoading(false);
            }
        })();

        return () => ac.abort();
    }, [listFilterKey, listPage, refreshKey, listFilterArgs]);

    useEffect(() => {
        const params = new URLSearchParams();

        if (search) params.set('search', search);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (regionFilter !== 'all') params.set('region', regionFilter);
        if (purposeFilter !== 'all') params.set('purpose', purposeFilter);
        if (yarimReasonFilter !== 'all') params.set('yarim_reason', yarimReasonFilter);
        if (listPage > 1) params.set('page', String(listPage));

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [search, statusFilter, regionFilter, purposeFilter, yarimReasonFilter, listPage, pathname, router]);

    // 2. EXPORT LOGIC (Excel - filtered data)
    const handleExport = async () => {
        setExportLoading(true);
        try {
            const all = await fetchAllFormsPages(api, {
                status: statusFilter,
                region: regionFilter,
                purpose: purposeFilter,
                search,
            });
            const rows = all.filter((item) =>
                formMatchesFilters(item, {
                    search,
                    statusFilter,
                    regionFilter,
                    purposeFilter,
                    yarimReasonFilter,
                })
            );
            if (rows.length === 0) return;

            const headers = [
                'Фио',
                'Номер телефон',
                'Мақсади ариза',
                'Санаи воридшуда',
                'Минтақа',
                'Суроға',
                'Матни ариза',
                'Статус (вазъият)',
                'Аъзои оила',
                'Санаи таваллуд',
                'Ҷойи кор',
                'Музди маош',
                'Вазъи оилавӣ',
                'Мақсади кумак',
                'Ҷойи зист',
            ];
            const poll = (f) => f.polls?.[0];
            const excelRows = rows.map((f) => [
                formatFormDisplayName(f) || (f.full_name ?? ''),
                f.phone_number ?? '',
                f.application_purpose ?? '',
                f.created_at ? new Date(f.created_at).toLocaleDateString() : '',
                f.address_region ?? '',
                f.detailed_address ?? '',
                f.description ?? '',
                STATUS_CONFIG[f.status]?.label ?? f.status ?? '',
                poll(f)?.family_members ?? '',
                poll(f)?.data_of_birth ? new Date(poll(f).data_of_birth).toLocaleDateString() : '',
                poll(f)?.profession_jobs ?? '',
                poll(f)?.monthly_income ?? '',
                poll(f)?.financial_status ?? '',
                poll(f)?.yarim_reason ?? '',
                poll(f)?.place_of_residence ?? '',
            ]);

            const wsData = [headers, ...excelRows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Дархостҳо');
            const fileName = `applications_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (error) {
            console.error('Export failed', error);
        } finally {
            setExportLoading(false);
        }
    };

    // 3. CREATE APPLICATION LOGIC
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                full_name: formData.full_name.trim() || null,
            };
            await api.post('/forms/', payload);
            setIsModalOpen(false);
            setFormData({
                full_name: '',
                last_name: '',
                first_name: '',
                father_name: '',
                phone_number: '',
                application_purpose: '',
                address_region: '',
                detailed_address: '',
                description: ''
            });
            setListPage(1);
            setRefreshKey((k) => k + 1);
        } catch (error) {
            console.error("Failed to create application", error);
            alert('Хатогӣ ҳангоми сабт. Майдонҳоро санҷед.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const listSource = bulkForms ?? (dataMode === 'plain' ? plainFullList : accumulatedForms);

    const filteredData = useMemo(() => {
        return listSource.filter((item) =>
            formMatchesFilters(item, {
                search,
                statusFilter,
                regionFilter,
                purposeFilter,
                yarimReasonFilter,
            })
        );
    }, [listSource, search, statusFilter, regionFilter, purposeFilter, yarimReasonFilter]);

    const sliceClientSide = bulkForms != null || dataMode === 'plain';

    const totalForPaging = useMemo(() => {
        if (sliceClientSide) return filteredData.length;
        return listTotal;
    }, [sliceClientSide, filteredData.length, listTotal]);

    const totalPages = useMemo(() => {
        if (sliceClientSide) {
            return Math.max(1, Math.ceil(totalForPaging / FORMS_PAGE_SIZE));
        }
        if (listTotalExact && listTotal > 0) {
            return Math.max(1, Math.ceil(listTotal / FORMS_PAGE_SIZE));
        }
        return Math.max(1, listHasNext ? listPage + 1 : listPage);
    }, [
        sliceClientSide,
        totalForPaging,
        listTotal,
        listTotalExact,
        listHasNext,
        listPage,
    ]);

    const displayRows = useMemo(() => {
        if (sliceClientSide) {
            const start = (listPage - 1) * FORMS_PAGE_SIZE;
            return filteredData.slice(start, start + FORMS_PAGE_SIZE);
        }
        return filteredData;
    }, [sliceClientSide, filteredData, listPage]);

    const canGoPrev = listPage > 1;
    const canGoNext = listPage < totalPages;

    useEffect(() => {
        if (!listTotalExact || listTotal <= 0) return;
        const tp = Math.max(1, Math.ceil(listTotal / FORMS_PAGE_SIZE));
        if (listPage > tp) setListPage(tp);
    }, [listPage, listTotal, listTotalExact]);

    const handleRowNavigation = (event, itemId) => {
        const href = `/dashboard/applications/${itemId}`;

        if (event.metaKey || event.ctrlKey || event.button === 1) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return;
        }

        router.push(href);
    };

    const handleExcelPickClick = () => {
        excelFileInputRef.current?.click();
    };

    const handleExcelFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!/\.(xlsx|xls)$/i.test(file.name)) {
            alert('Фақат Excel (.xlsx, .xls) интихоб кунед.');
            return;
        }
        setExcelUploading(true);
        setExcelUploadResult(null);
        try {
            const res = await uploadFormsExcel(api, file);
            setExcelUploadResult(res.data ?? null);
            setRefreshKey((k) => k + 1);
        } catch (err) {
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.detail ||
                err?.message ||
                'Excel боргузорӣ нашуд';
            alert(String(msg));
        } finally {
            setExcelUploading(false);
        }
    };

    return (
        <div className="applications-page-theme space-y-6">

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                     Дархостҳо
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                     Дархостҳои кӯмак ва пешниҳодҳо
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <input
                        ref={excelFileInputRef}
                        type="file"
                        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        className="hidden"
                        onChange={handleExcelFileChange}
                    />
                    <button
                        type="button"
                        onClick={handleExcelPickClick}
                        disabled={excelUploading || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        title="Excel (.xlsx) — сутунҳо: Ном ва насаб, телефон, минтақа, ..."
                    >
                        {excelUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}{' '}
                        Excel
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exportLoading || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        {exportLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}{' '}
                        Export
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-4 h-4" /> Дархости Нав
                    </button>
                </div>
            </div>

            {excelUploadResult?.success && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/90 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <p className="font-medium">{excelUploadResult.message || 'Боргузорӣ анҷом ёфт'}</p>
                            <p className="mt-1 text-emerald-800/90 dark:text-emerald-200/90">
                                Сатрҳо: {excelUploadResult.total_rows ?? '—'} · Эҷод:{' '}
                                <span className="font-semibold">{excelUploadResult.created ?? 0}</span>
                                {Number(excelUploadResult.failed) > 0 && (
                                    <>
                                        {' '}
                                        · Хато: <span className="font-semibold">{excelUploadResult.failed}</span>
                                    </>
                                )}
                            </p>
                            {excelUploadResult.error_message && (
                                <p className="mt-1 text-xs opacity-90">{excelUploadResult.error_message}</p>
                            )}
                            {Array.isArray(excelUploadResult.errors) && excelUploadResult.errors.length > 0 && (
                                <ul className="mt-2 max-h-32 overflow-y-auto text-xs list-disc pl-4 space-y-0.5 text-emerald-900/80 dark:text-emerald-100/80">
                                    {excelUploadResult.errors.map((line, i) => (
                                        <li key={i}>{line}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setExcelUploadResult(null)}
                            className="shrink-0 p-1 rounded-lg hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200"
                            aria-label="Пӯшидан"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* FILTERS BAR */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Ном ё телефонро ҷустуҷӯ кунед..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Ҳама (вазъият)</option>
                    {Object.entries(STATUS_CONFIG).map(([key, conf]) => (
                        <option key={key} value={key}>{conf.label}</option>
                    ))}
                </select>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={regionFilter}
                    onChange={(e) => setRegionFilter(e.target.value)}
                >
                    <option value="all">Ҳамаи минтақаҳо</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={purposeFilter}
                    onChange={(e) => setPurposeFilter(e.target.value)}
                >
                    <option value="all">Мақсади ариза</option>
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
                    value={yarimReasonFilter}
                    onChange={(e) => setYarimReasonFilter(e.target.value)}
                >
                    <option value="all">Мақсади кӯмак (ҳама)</option>
                    {YARIM_REASON_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* TABLE */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4 font-semibold">ID</th>
                                <th className="px-6 py-4 font-semibold">Ном ва насаб</th>
                                <th className="px-6 py-4 font-semibold">Мақсади ариза</th>
                                <th className="px-6 py-4 font-semibold">Минтақа</th>
                                <th className="px-6 py-4 font-semibold">Санаи иловашуда</th>
                                <th className="px-6 py-4 font-semibold">Статус</th>
                                <th className="px-6 py-4 font-semibold text-right">Амал</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500" />
                                    </td>
                                </tr>
                            ) : displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                     Приложения, соответствующие вашим фильтрам, не найдены.
                                    </td>
                                </tr>
                            ) : (
                                displayRows.map((item) => (
                                    <tr
                                        key={item.id}
                                        onClick={(e) => handleRowNavigation(e, item.id)}
                                        onMouseDown={(e) => {
                                            if (e.button === 1) {
                                                e.preventDefault();
                                                handleRowNavigation(e, item.id);
                                            }
                                        }}
                                        className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-500">#{item.id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900 dark:text-slate-100">{formatFormDisplayName(item) || item.full_name || 'Номаълум'}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.phone_number}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.application_purpose || '-'}</td>
                                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{item.address_region || '-'}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[item.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                                                {STATUS_CONFIG[item.status]?.label || item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRowNavigation(e, item.id);
                                                }}
                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-purple-600 transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {(filteredData.length > 0 || listTotal > 0) && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-sm text-slate-500">
                            Саҳифа{' '}
                            <span className="font-medium text-slate-900 dark:text-slate-100">{listPage}</span>
                            {' / '}
                            <span className="font-medium text-slate-900 dark:text-slate-100">{totalPages}</span>
                            {sliceClientSide ? (
                                <>
                                    {' '}
                                    — филтр:{' '}
                                    <span className="font-medium text-slate-900 dark:text-slate-100">{filteredData.length}</span>
                                </>
                            ) : listTotal ? (
                                <>
                                    {' '}
                                    — ҷамъ: <span className="font-medium text-slate-900 dark:text-slate-100">{listTotal}</span>
                                </>
                            ) : null}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                                    disabled={!canGoPrev || loading}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Қаблӣ
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setListPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={!canGoNext || loading}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                >
                                    Баъдӣ <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* NEW APPLICATION MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50"
                        >
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Дархости Нав</h2>
                                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-500">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateSubmit} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Номи пурра</label>
                                            <input
                                                type="text"
                                                maxLength={255}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.full_name}
                                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Рақами телефон</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.phone_number}
                                                onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Насаб</label>
                                            <input
                                                type="text"
                                                maxLength={255}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.last_name}
                                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Ном</label>
                                            <input
                                                type="text"
                                                maxLength={255}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.first_name}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Номи падар</label>
                                            <input
                                                type="text"
                                                maxLength={255}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.father_name}
                                                onChange={e => setFormData({ ...formData, father_name: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Мақсад ариза</label>
                                            <select
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.application_purpose}
                                                onChange={e => setFormData({ ...formData, application_purpose: e.target.value })}
                                            >
                                                <option value="">Интихоб кунед</option>
                                                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 uppercase">Минтақа</label>
                                            <select
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                                value={formData.address_region}
                                                onChange={e => setFormData({ ...formData, address_region: e.target.value })}
                                            >
                                                <option value="">Интихоб кунед</option>
                                                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase">Суроғаи муфассал</label>
                                        <textarea
                                            rows={3}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-y min-h-[4.5rem]"
                                            value={formData.detailed_address}
                                            onChange={e => setFormData({ ...formData, detailed_address: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-slate-500 uppercase">Матни ариза</label>
                                        <textarea
                                            rows={4}
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-y min-h-[5rem]"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Илова кардан</>}
                                    </button>
                                </form>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}