/** Sayfalanmış /forms/ yanıtlarını tek formatta işler (DRF veya düz dizi). */

export const FORMS_PAGE_SIZE = 10;

/** Büdcə / export: hər sorğuda daha çox sətir — HTTP turu və gözləmə azalır (DRF max_page_size ilə uyğunlaşdırın). */
export const FORMS_BULK_FETCH_PAGE_SIZE = 100;

export function parseFormsListPayload(data) {
    if (Array.isArray(data)) {
        if (data.length > FORMS_PAGE_SIZE) {
            return {
                items: data.slice(0, FORMS_PAGE_SIZE),
                total: data.length,
                totalExact: true,
                next: null,
                hasNext: false,
                isPlainArray: false,
                bulkLocalPaging: true,
                bulkDataset: data,
            };
        }
        return {
            items: data,
            total: data.length,
            totalExact: true,
            next: null,
            hasNext: false,
            isPlainArray: true,
            bulkLocalPaging: false,
        };
    }
    if (data && Array.isArray(data.results)) {
        const results = data.results;
        const countRaw = data.count ?? data.total;
        const totalExact = typeof countRaw === 'number' && countRaw >= 0;
        const total = totalExact ? countRaw : 0;
        const next = data.next || null;
        const hasNext = Boolean(next);

        return {
            items: results,
            total,
            totalExact,
            next,
            hasNext,
            isPlainArray: false,
        };
    }
    return {
        items: [],
        total: 0,
        totalExact: true,
        next: null,
        hasNext: false,
        isPlainArray: false,
        bulkLocalPaging: false,
    };
}

export function buildFormsListQuery(page, { status, region, purpose, search } = {}) {
    const p = { page, page_size: FORMS_PAGE_SIZE };
    if (status && status !== 'all') p.status = status;
    if (region && region !== 'all') p.address_region = region;
    if (purpose && purpose !== 'all') p.application_purpose = purpose;
    const q = (search || '').trim();
    if (q) p.search = q;
    return p;
}

/** Экспорт / филтрҳо: ҳамаи саҳифаҳоро пайваст мекунад (агар сервер `next` диҳад ё саҳифабандӣ дошта бошад). */
export async function fetchAllFormsPages(api, filterArgs) {
    const params = {
        ...buildFormsListQuery(1, filterArgs),
        page_size: FORMS_BULK_FETCH_PAGE_SIZE,
    };
    const first = await api.get('/forms/', { params });
    let parsed = parseFormsListPayload(first.data);
    if (parsed.bulkLocalPaging && parsed.bulkDataset) {
        return parsed.bulkDataset;
    }
    const out = [...parsed.items];
    if (parsed.isPlainArray) return out;
    let next = parsed.next;
    let guard = 0;
    while (next && guard++ < 250) {
        const res = await api.get(next);
        parsed = parseFormsListPayload(res.data);
        out.push(...parsed.items);
        next = parsed.next;
    }
    return out;
}

/**
 * Мисли fetchAllFormsPages, вале params-и хоҳишӣ (масалан status__in) — бухгалтерия ва ғ.
 */
export async function fetchAllFormsPagesWithParams(api, baseParams = {}) {
    const params = { ...baseParams, page: 1, page_size: FORMS_BULK_FETCH_PAGE_SIZE };
    const first = await api.get('/forms/', { params });
    let parsed = parseFormsListPayload(first.data);
    if (parsed.bulkLocalPaging && parsed.bulkDataset) {
        return parsed.bulkDataset;
    }
    const out = [...parsed.items];
    if (parsed.isPlainArray) return out;
    let next = parsed.next;
    let guard = 0;
    while (next && guard++ < 250) {
        const res = await api.get(next);
        parsed = parseFormsListPayload(res.data);
        out.push(...parsed.items);
        next = parsed.next;
    }
    return out;
}
