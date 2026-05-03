const { isSchoolDueForAccreditation } = require('./src/lib/utils.ts'); // Wait, require can't load ts directly without ts-node.

// I'll just copy the logic.
function isSchoolDueForAccreditation(school, states, zones, currentState) {
  let isForeign = false;
  if (currentState) {
    const zone = zones.find(z => z.code === currentState.zone_code);
    isForeign = !!(zone?.name?.toLowerCase().includes('foreign') || zone?.name?.toLowerCase().includes('foriegn'));
  } else {
    const schoolState = states.find(s => s.code === school.state_code);
    const zone = zones.find(z => z.code === schoolState?.zone_code);
    isForeign = !!(zone?.name?.toLowerCase().includes('foreign') || zone?.name?.toLowerCase().includes('foriegn'));
  }

  if (isForeign) {
    if (!school.accredited_date) return false;
    const accreditedDate = new Date(school.accredited_date);
    const expiryDate = new Date(accreditedDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 10);
    
    const today = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(today.getMonth() + 6);
    
    return expiryDate <= sixMonthsFromNow;
  }

  const status = (school.accreditation_status || '').toLowerCase();
  if (status === 'failed') return true;
  if (!school.accredited_date || !['full', 'partial', 'passed', 'accredited'].includes(status)) {
    return false;
  }
  
  const accreditedDate = new Date(school.accredited_date);
  const yearsToAdd = status === 'partial' ? 1 : 5;

  const expiryDate = new Date(accreditedDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + yearsToAdd);
  
  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(today.getMonth() + 6);
  
  return expiryDate <= sixMonthsFromNow;
}

const zones = [{ code: 'Z1', name: 'Foreign Zone' }, { code: 'Z2', name: 'Local Zone' }];
const states = [{ code: 'S1', zone_code: 'Z1' }, { code: 'S2', zone_code: 'Z2' }];

const school1 = { state_code: 'S2', accreditation_status: 'Full', accredited_date: '2020-01-01' }; // Local, full, 2020 -> Due in 2025 -> True
const school2 = { state_code: 'S2', accreditation_status: 'Partial', accredited_date: '2025-01-01' }; // Local, partial, 2025 -> Due in 2026 -> True
const school3 = { state_code: 'S1', accreditation_status: 'Failed', accredited_date: '2020-01-01' }; // Foreign, failed, 2020 -> Due in 2030 -> False
const school4 = { state_code: 'S2', accreditation_status: 'Failed', accredited_date: null }; // Local, failed -> True
const school5 = { state_code: 'S2', accreditation_status: 'Failed', accredited_date: '2025-01-01' }; // Local, failed -> True

console.log('School 1 Local Full 2020 (Expected: true):', isSchoolDueForAccreditation(school1, states, zones));
console.log('School 2 Local Partial 2025 (Expected: true):', isSchoolDueForAccreditation(school2, states, zones));
console.log('School 3 Foreign Failed 2020 (Expected: false):', isSchoolDueForAccreditation(school3, states, zones));
console.log('School 4 Local Failed Null Date (Expected: true):', isSchoolDueForAccreditation(school4, states, zones));
console.log('School 5 Local Failed Recent (Expected: true):', isSchoolDueForAccreditation(school5, states, zones));

