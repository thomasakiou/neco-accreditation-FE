import client from '../client';
import { components } from '../types';

export type School = components['schemas']['School'];
export type BECESchool = components['schemas']['BECESchool'];
export type State = components['schemas']['State'];
export type Zone = components['schemas']['Zone'];
export type LGA = components['schemas']['LGA'];
export type Custodian = components['schemas']['Custodian'];
type BECECustodian = components['schemas']['BECECustodian'];

let statesCache: State[] | null = null;
let zonesCache: Zone[] | null = null;
let lgasCache: Record<string, LGA[]> = {}; // Key: state_code or 'all'
let schoolsCache: School[] | null = null;
let beceSchoolsCache: BECESchool[] | null = null;
let custodiansCache: Custodian[] | null = null;
let beceCustodiansCache: BECECustodian[] | null = null;

export const clearStaticCache = () => {
    statesCache = null;
    zonesCache = null;
    lgasCache = {};
    schoolsCache = null;
    beceSchoolsCache = null;
    custodiansCache = null;
    beceCustodiansCache = null;
};

const DataService = {
    getStates: async (): Promise<State[]> => {
        if (statesCache) return statesCache;
        const response = await client.get<State[]>('/api/v1/data/states');
        statesCache = response.data.sort((a, b) => a.name.localeCompare(b.name));
        return statesCache;
    },

    getZones: async (): Promise<Zone[]> => {
        if (zonesCache) return zonesCache;
        const response = await client.get<Zone[]>('/api/v1/data/zones');
        zonesCache = response.data;
        return zonesCache;
    },

    createZone: async (zone: components['schemas']['ZoneCreate']): Promise<Zone> => {
        const response = await client.post<Zone>('/api/v1/data/zones', zone);
        zonesCache = null; // Invalidate cache
        return response.data;
    },

    updateZone: async (code: string, zone: components['schemas']['ZoneUpdate']): Promise<Zone> => {
        const response = await client.put<Zone>(`/api/v1/data/zones/${code}`, zone);
        zonesCache = null; // Invalidate cache
        return response.data;
    },

    createState: async (state: components['schemas']['StateCreate']): Promise<State> => {
        const response = await client.post<State>('/api/v1/data/states', state);
        statesCache = null; // Invalidate cache
        return response.data;
    },

    updateState: async (code: string, state: components['schemas']['StateUpdate']): Promise<State> => {
        const response = await client.put<State>(`/api/v1/data/states/${code}`, state);
        statesCache = null; // Invalidate cache
        return response.data;
    },

    uploadStates: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post('/api/v1/data/upload/states', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        statesCache = null; // Invalidate cache
        return response.data;
    },

    deleteAllStates: async () => {
        const response = await client.delete('/api/v1/data/states/all');
        statesCache = null; // Invalidate cache
        return response.data;
    },

    sendStateReport: async (stateCode: string): Promise<any> => {
        const response = await client.post(`/api/v1/data/states/${stateCode}/send-report`);
        return response.data;
    },

    lockStates: async (request: components['schemas']['LockRequest']) => {
        const response = await client.post('/api/v1/data/states/lock', request);
        statesCache = null;
        return response.data;
    },

    unlockStates: async (request: components['schemas']['LockRequest']) => {
        const response = await client.post('/api/v1/data/states/unlock', request);
        statesCache = null;
        return response.data;
    },

    exportStates: async (format: string = 'excel') => {
        const response = await client.get('/api/v1/data/export/states', {
            params: { format },
            responseType: 'blob',
        });
        DataService.downloadBlob(response.data, 'states', format);
    },

    deleteState: async (code: string) => {
        await client.delete(`/api/v1/data/states/${code}`);
        statesCache = null; // Invalidate cache
    },

    getSchools: async (params?: { state_code?: string; lga_code?: string; custodian_code?: string }): Promise<School[]> => {
        // Only cache when fetching all schools (no filter params)
        const hasParams = params && Object.values(params).some(v => v !== undefined);
        if (!hasParams && schoolsCache) return schoolsCache;
        const response = await client.get<School[]>('/api/v1/data/schools', { params });
        if (!hasParams) schoolsCache = response.data;
        return response.data;
    },

    createSchool: async (school: components['schemas']['SchoolCreate']): Promise<School> => {
        const response = await client.post<School>('/api/v1/data/schools', school);
        schoolsCache = null;
        return response.data;
    },

    updateSchool: async (code: string, school: components['schemas']['SchoolUpdate'], accrd_year?: string | number): Promise<School> => {
        const response = await client.put<School>(`/api/v1/data/schools/${code}`, school, {
            params: { accrd_year }
        });
        schoolsCache = null;
        return response.data;
    },

    uploadSchools: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post('/api/v1/data/upload/schools', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        schoolsCache = null;
        return response.data;
    },

    // Helper for downloading blobs
    downloadBlob: (data: any, fileName: string, format: string) => {
        const extension = format === 'excel' ? 'xlsx' : format;
        const blob = new Blob([data]);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    exportSchools: async (format: string = 'excel', params?: { state_code?: string; zone_code?: string; category?: string; accreditation_status?: string }) => {
        const response = await client.get('/api/v1/data/export/schools', {
            params: { format, ...params },
            responseType: 'blob',
        });
        DataService.downloadBlob(response.data, 'ssce_schools', format);
    },

    deleteSchool: async (code: string, accrd_year?: string | number) => {
        await client.delete(`/api/v1/data/schools/${code}`, {
            params: { accrd_year }
        });
        schoolsCache = null;
    },

    deleteAllSchools: async () => {
        await client.delete('/api/v1/data/schools/all');
        schoolsCache = null;
    },

    // BECE Schools
    getBeceSchools: async (params?: { state_code?: string; lga_code?: string; custodian_code?: string }): Promise<BECESchool[]> => {
        const hasParams = params && Object.values(params).some(v => v !== undefined);
        if (!hasParams && beceSchoolsCache) return beceSchoolsCache;
        const response = await client.get<BECESchool[]>('/api/v1/data/bece-schools', { params });
        if (!hasParams) beceSchoolsCache = response.data;
        return response.data;
    },

    createBeceSchool: async (school: components['schemas']['BECESchoolCreate']): Promise<BECESchool> => {
        const response = await client.post<BECESchool>('/api/v1/data/bece-schools', school);
        beceSchoolsCache = null;
        return response.data;
    },

    updateBeceSchool: async (code: string, school: components['schemas']['BECESchoolUpdate'], accrd_year?: string | number): Promise<BECESchool> => {
        const response = await client.put<BECESchool>(`/api/v1/data/bece-schools/${code}`, school, {
            params: { accrd_year }
        });
        beceSchoolsCache = null;
        return response.data;
    },

    uploadBeceSchools: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post('/api/v1/data/upload/bece-schools', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        beceSchoolsCache = null;
        return response.data;
    },

    exportBeceSchools: async (format: string = 'excel', params?: { state_code?: string; zone_code?: string; category?: string; accreditation_status?: string }) => {
        const response = await client.get('/api/v1/data/export/bece-schools', {
            params: { format, ...params },
            responseType: 'blob',
        });
        DataService.downloadBlob(response.data, 'bece_schools', format);
    },

    deleteBeceSchool: async (code: string, accrd_year?: string | number) => {
        await client.delete(`/api/v1/data/bece-schools/${code}`, {
            params: { accrd_year }
        });
        beceSchoolsCache = null;
    },

    deleteAllBeceSchools: async () => {
        await client.delete('/api/v1/data/bece-schools/all');
        beceSchoolsCache = null;
    },

    uploadSchoolPaymentProof: async (code: string, file: File, accrd_year?: string | number): Promise<School> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post<School>(`/api/v1/data/schools/${code}/upload-payment-proof`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            params: { accrd_year }
        });
        return response.data;
    },

    uploadBeceSchoolPaymentProof: async (code: string, file: File, accrd_year?: string | number): Promise<BECESchool> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post<BECESchool>(`/api/v1/data/bece-schools/${code}/upload-payment-proof`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            params: { accrd_year }
        });
        return response.data;
    },

    approveSchool: async (code: string, accrd_year?: string | number): Promise<School> => {
        const response = await client.post<School>(`/api/v1/data/schools/${code}/approve`, null, {
            params: { accrd_year }
        });
        schoolsCache = null;
        return response.data;
    },

    approveBeceSchool: async (code: string, accrd_year?: string | number): Promise<BECESchool> => {
        const response = await client.post<BECESchool>(`/api/v1/data/bece-schools/${code}/approve`, null, {
            params: { accrd_year }
        });
        return response.data;
    },

    // LGAs
    getLGAs: async (params?: { state_code?: string }): Promise<LGA[]> => {
        const cacheKey = params?.state_code || 'all';
        if (lgasCache[cacheKey]) return lgasCache[cacheKey];

        const response = await client.get<LGA[]>('/api/v1/data/lgas', { params });
        lgasCache[cacheKey] = response.data;
        return lgasCache[cacheKey];
    },

    createLGA: async (lga: components['schemas']['LGACreate']): Promise<LGA> => {
        const response = await client.post<LGA>('/api/v1/data/lgas', lga);
        lgasCache = {}; // Invalidate cache entirely to be safe
        return response.data;
    },

    updateLGA: async (code: string, lga: components['schemas']['LGAUpdate']): Promise<LGA> => {
        const response = await client.put<LGA>(`/api/v1/data/lgas/${code}`, lga);
        lgasCache = {}; // Invalidate cache entirely to be safe
        return response.data;
    },

    uploadLGAs: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post('/api/v1/data/upload/lgas', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    exportLGAs: async (format: string = 'excel', params?: { state_code?: string }) => {
        const response = await client.get('/api/v1/data/export/lgas', {
            params: { format, ...params },
            responseType: 'blob',
        });
        DataService.downloadBlob(response.data, 'lgas', format);
    },

    deleteLGA: async (code: string) => {
        await client.delete(`/api/v1/data/lgas/${code}`);
    },

    // Custodians
    getCustodians: async (params?: { state_code?: string; lga_code?: string }): Promise<Custodian[]> => {
        const hasParams = params && Object.values(params).some(v => v !== undefined);
        if (!hasParams && custodiansCache) return custodiansCache;
        const response = await client.get<Custodian[]>('/api/v1/data/custodians', { params });
        if (!hasParams) custodiansCache = response.data;
        return response.data;
    },

    createCustodian: async (custodian: components['schemas']['CustodianCreate']): Promise<Custodian> => {
        const response = await client.post<Custodian>('/api/v1/data/custodians', custodian);
        custodiansCache = null;
        return response.data;
    },

    updateCustodian: async (code: string, custodian: components['schemas']['CustodianUpdate']): Promise<Custodian> => {
        const response = await client.put<Custodian>(`/api/v1/data/custodians/${code}`, custodian);
        custodiansCache = null;
        return response.data;
    },

    exportCustodians: async (format: string = 'excel', params?: { state_code?: string; lga_code?: string }) => {
        const response = await client.get('/api/v1/data/export/custodians', {
            params: { format, ...params },
            responseType: 'blob',
        });
        DataService.downloadBlob(response.data, 'custodians', format);
    },

    deleteCustodian: async (code: string) => {
        await client.delete(`/api/v1/data/custodians/${code}`);
    },

    // BECE Custodians
    getBeceCustodians: async (params?: { state_code?: string; lga_code?: string }): Promise<BECECustodian[]> => {
        const hasParams = params && Object.values(params).some(v => v !== undefined);
        if (!hasParams && beceCustodiansCache) return beceCustodiansCache;
        const response = await client.get<BECECustodian[]>('/api/v1/data/bece-custodians', { params });
        if (!hasParams) beceCustodiansCache = response.data;
        return response.data;
    },

    createBeceCustodian: async (custodian: components['schemas']['BECECustodianCreate']): Promise<BECECustodian> => {
        const response = await client.post<BECECustodian>('/api/v1/data/bece-custodians', custodian);
        beceCustodiansCache = null;
        return response.data;
    },

    updateBeceCustodian: async (code: string, custodian: components['schemas']['BECECustodianUpdate']): Promise<BECECustodian> => {
        const response = await client.put<BECECustodian>(`/api/v1/data/bece-custodians/${code}`, custodian);
        beceCustodiansCache = null;
        return response.data;
    },

    exportBeceCustodians: async (format: string = 'excel', params?: { state_code?: string; lga_code?: string }) => {
        const response = await client.get('/api/v1/data/export/bece-custodians', {
            params: { format, ...params },
            responseType: 'blob',
        });
        DataService.downloadBlob(response.data, 'bece_custodians', format);
    },

    deleteBeceCustodian: async (code: string) => {
        await client.delete(`/api/v1/data/bece-custodians/${code}`);
    },

    uploadBeceCustodians: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post('/api/v1/data/upload/bece-custodians', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        beceCustodiansCache = null;
        return response.data;
    },

    // Accreditation Applications
    submitApplication: async (school_code: string, school_type: string, proof_urls: string[]): Promise<any> => {
        const response = await client.post('/api/v1/data/applications', proof_urls, {
            params: { school_code, school_type }
        });
        return response.data;
    },

    getApplications: async (): Promise<any[]> => {
        const response = await client.get('/api/v1/data/applications');
        return response.data;
    },

    approveApplication: async (application_id: number, status_update: 'Passed' | 'Partial' | 'Failed'): Promise<any> => {
        const response = await client.put(`/api/v1/data/applications/${application_id}/approve`, null, {
            params: { status_update }
        });
        return response.data;
    },

    uploadProof: async (file: File): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await client.post<{ url: string }>('/api/v1/data/upload/proof', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    downloadTemplate: async (tableName: string) => {
        const response = await client.get(`/api/v1/data/upload/templates/${tableName}`, {
            responseType: 'blob',
        });
        DataService.downloadBlob(response.data, `${tableName}_template`, 'csv');
    },

    // Audit Logs
    getAuditLogs: async (params?: {
        user_id?: number;
        action?: string;
        resource_type?: string;
        days?: number;
        limit?: number;
        offset?: number;
    }): Promise<any[]> => {
        const response = await client.get<any[]>('/api/v1/audit/audit-logs', { params });
        return response.data;
    },

    deleteAuditLog: async (logId: number): Promise<any> => {
        const response = await client.delete(`/api/v1/audit/audit-logs/${logId}`);
        return response.data;
    },

    bulkDeleteAuditLogs: async (logIds: number[]): Promise<any> => {
        const response = await client.delete('/api/v1/audit/audit-logs/bulk/delete', {
            data: { log_ids: logIds },
        });
        return response.data;
    },

    duplicateSchoolsForYear: async (targetYear: string, fromYear?: string): Promise<any> => {
        const params: any = { target_year: targetYear };
        if (fromYear) params.from_year = fromYear;
        const response = await client.post('/api/v1/data/schools/duplicate-for-year', null, {
            params
        });
        schoolsCache = null; // Invalidate cache
        return response.data;
    },

    sendManualEmails: async (data: {
        schools: { code: string; type: string }[];
        interval: string;
    }): Promise<any> => {
        const response = await client.post('/api/v1/data/schools/send-manual-emails', data);
        return response.data;
    },
};

export default DataService;
