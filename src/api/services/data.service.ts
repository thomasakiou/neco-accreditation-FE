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

    updateState: async (code: string, state: components['schemas']['StateCreate']): Promise<State> => {
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

    getSchools: async (params?: { state_code?: string; lga_code?: string; custodian_code?: string }): Promise<School[]> => {
        const response = await client.get<School[]>('/api/v1/data/schools', { params });
        return response.data;
    },

    createSchool: async (school: components['schemas']['SchoolCreate']): Promise<School> => {
        const response = await client.post<School>('/api/v1/data/schools', school);
        return response.data;
    },

    updateSchool: async (code: string, school: components['schemas']['SchoolCreate']): Promise<School> => {
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

    exportSchools: async () => {
        const response = await client.get('/api/v1/data/export/schools', {
            responseType: 'blob',
        });
        return response.data;
    },

    deleteAllSchools: async () => {
        const response = await client.delete('/api/v1/data/schools/all');
        return response.data;
    },

    exportStates: async () => {
        const response = await client.get('/api/v1/data/export/states', {
            responseType: 'blob',
        });
        return response.data;
    },

    exportLGAs: async () => {
        const response = await client.get('/api/v1/data/export/lgas', {
            responseType: 'blob',
        });
        return response.data;
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

    updateBeceSchool: async (code: string, school: components['schemas']['SchoolCreate']): Promise<School> => {
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

    exportBeceSchools: async () => {
        const response = await client.get('/api/v1/data/export/bece-schools', {
            responseType: 'blob',
        });
        return response.data;
    },

    deleteAllBeceSchools: async () => {
        const response = await client.delete('/api/v1/data/bece-schools/all');
        return response.data;
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
};

export default DataService;
