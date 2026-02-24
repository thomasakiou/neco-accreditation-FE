import client from '../client';
import { components } from '../types';

export type School = components['schemas']['School'];
export type State = components['schemas']['State'];
export type Zone = components['schemas']['Zone'];
export type LGA = components['schemas']['LGA'];
export type Custodian = components['schemas']['Custodian'];

const DataService = {
    getStates: async (): Promise<State[]> => {
        const response = await client.get<State[]>('/api/v1/data/states');
        return response.data;
    },

    getZones: async (): Promise<Zone[]> => {
        const response = await client.get<Zone[]>('/api/v1/data/zones');
        return response.data;
    },

    createZone: async (zone: components['schemas']['ZoneCreate']): Promise<Zone> => {
        const response = await client.post<Zone>('/api/v1/data/zones', zone);
        return response.data;
    },

    updateZone: async (code: string, zone: components['schemas']['ZoneUpdate']): Promise<Zone> => {
        const response = await client.put<Zone>(`/api/v1/data/zones/${code}`, zone);
        return response.data;
    },

    createState: async (state: components['schemas']['StateCreate']): Promise<State> => {
        const response = await client.post<State>('/api/v1/data/states', state);
        return response.data;
    },

    updateState: async (code: string, state: components['schemas']['StateUpdate']): Promise<State> => {
        const response = await client.put<State>(`/api/v1/data/states/${code}`, state);
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
        return response.data;
    },

    deleteAllStates: async () => {
        const response = await client.delete('/api/v1/data/states/all');
        return response.data;
    },

    lockStates: async (request: components['schemas']['LockRequest']) => {
        const response = await client.post('/api/v1/data/states/lock', request);
        return response.data;
    },

    unlockStates: async (request: components['schemas']['LockRequest']) => {
        const response = await client.post('/api/v1/data/states/unlock', request);
        return response.data;
    },

    exportStates: async (format: string = 'excel') => {
        const response = await client.get('/api/v1/data/export/states', {
            params: { format },
            responseType: 'blob',
        });

        const extension = format === 'excel' ? 'xlsx' : format;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `states.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    deleteState: async (code: string) => {
        await client.delete(`/api/v1/data/states/${code}`);
    },

    getSchools: async (params?: { state_code?: string; lga_code?: string; custodian_code?: string }): Promise<School[]> => {
        const response = await client.get<School[]>('/api/v1/data/schools', { params });
        return response.data;
    },

    createSchool: async (school: components['schemas']['SchoolCreate']): Promise<School> => {
        const response = await client.post<School>('/api/v1/data/schools', school);
        return response.data;
    },

    updateSchool: async (code: string, school: components['schemas']['SchoolUpdate']): Promise<School> => {
        const response = await client.put<School>(`/api/v1/data/schools/${code}`, school);
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
        return response.data;
    },

    exportSchools: async (format: string = 'excel') => {
        const response = await client.get('/api/v1/data/export/schools', {
            params: { format },
            responseType: 'blob',
        });

        const extension = format === 'excel' ? 'xlsx' : format;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `ssce_schools.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    deleteSchool: async (code: string) => {
        await client.delete(`/api/v1/data/schools/${code}`);
    },

    deleteAllSchools: async () => {
        await client.delete('/api/v1/data/schools/all');
    },

    // BECE Schools
    getBeceSchools: async (params?: { state_code?: string; lga_code?: string; custodian_code?: string }): Promise<School[]> => {
        const response = await client.get<School[]>('/api/v1/data/bece-schools', { params });
        return response.data;
    },

    createBeceSchool: async (school: components['schemas']['SchoolCreate']): Promise<School> => {
        const response = await client.post<School>('/api/v1/data/bece-schools', school);
        return response.data;
    },

    updateBeceSchool: async (code: string, school: components['schemas']['SchoolUpdate']): Promise<School> => {
        const response = await client.put<School>(`/api/v1/data/bece-schools/${code}`, school);
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
        return response.data;
    },

    exportBeceSchools: async (format: string = 'excel') => {
        const response = await client.get('/api/v1/data/export/bece-schools', {
            params: { format },
            responseType: 'blob',
        });

        const extension = format === 'excel' ? 'xlsx' : format;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `bece_schools.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    deleteBeceSchool: async (code: string) => {
        await client.delete(`/api/v1/data/bece-schools/${code}`);
    },

    deleteAllBeceSchools: async () => {
        await client.delete('/api/v1/data/bece-schools/all');
    },

    // LGAs
    getLGAs: async (params?: { state_code?: string }): Promise<LGA[]> => {
        const response = await client.get<LGA[]>('/api/v1/data/lgas', { params });
        return response.data;
    },

    createLGA: async (lga: components['schemas']['LGACreate']): Promise<LGA> => {
        const response = await client.post<LGA>('/api/v1/data/lgas', lga);
        return response.data;
    },

    updateLGA: async (code: string, lga: components['schemas']['LGAUpdate']): Promise<LGA> => {
        const response = await client.put<LGA>(`/api/v1/data/lgas/${code}`, lga);
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

    exportLGAs: async (format: string = 'excel') => {
        const response = await client.get('/api/v1/data/export/lgas', {
            params: { format },
            responseType: 'blob',
        });

        const extension = format === 'excel' ? 'xlsx' : format;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `lgas.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    deleteLGA: async (code: string) => {
        await client.delete(`/api/v1/data/lgas/${code}`);
    },

    // Custodians
    getCustodians: async (params?: { state_code?: string; lga_code?: string }): Promise<Custodian[]> => {
        const response = await client.get<Custodian[]>('/api/v1/data/custodians', { params });
        return response.data;
    },

    createCustodian: async (custodian: components['schemas']['CustodianCreate']): Promise<Custodian> => {
        const response = await client.post<Custodian>('/api/v1/data/custodians', custodian);
        return response.data;
    },

    updateCustodian: async (code: string, custodian: components['schemas']['CustodianUpdate']): Promise<Custodian> => {
        const response = await client.put<Custodian>(`/api/v1/data/custodians/${code}`, custodian);
        return response.data;
    },

    exportCustodians: async (format: string = 'excel') => {
        const response = await client.get('/api/v1/data/export/custodians', {
            params: { format },
            responseType: 'blob',
        });

        const extension = format === 'excel' ? 'xlsx' : format;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `custodians.${extension}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    deleteCustodian: async (code: string) => {
        await client.delete(`/api/v1/data/custodians/${code}`);
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

        // Create a link and trigger the download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${tableName}_template.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};

export default DataService;
