/**
 * Номи намоишӣ: агар насаб/ном/номи падар пур бошанд, бо тартиб пайваст мешаванд;
 * вагарна `full_name` истифода мешавад (формҳои кӯҳна).
 */
export function formatFormDisplayName(formLike) {
    if (!formLike) return '';
    const last = (formLike.last_name || '').trim();
    const first = (formLike.first_name || '').trim();
    const father = (formLike.father_name || '').trim();
    const fio = [last, first, father].filter(Boolean).join(' ');
    if (fio) return fio;
    return (formLike.full_name || '').trim();
}
