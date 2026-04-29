/**
 * POST /forms/upload_excel/ — multipart, maydə `excel_file` (.xlsx, .xls).
 * @param {import('axios').AxiosInstance} api
 * @param {File} file
 * @param {{ signal?: AbortSignal }} [opts]
 */
export function uploadFormsExcel(api, file, { signal } = {}) {
    const body = new FormData();
    body.append('excel_file', file);
    const config = signal ? { signal } : {};
    return api.post('/forms/upload_excel/', body, config);
}
