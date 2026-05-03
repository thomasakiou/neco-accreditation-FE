import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility to merge tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared utility to determine if a school is due for accreditation.
 * Exempts schools in Foreign zones from standard logic (5yrs full, 1yr partial, 0yr failed)
 * and grants them a flat 10-year validity period.
 */
export function isSchoolDueForAccreditation(
  school: any,
  states: any[],
  zones: any[],
  currentState?: any
): boolean {
  // Determine if foreign zone
  let isForeign = false;
  if (currentState) {
    // State portal context
    const zone = zones.find(z => z.code === currentState.zone_code);
    isForeign = !!(zone?.name?.toLowerCase().includes('foreign') || zone?.name?.toLowerCase().includes('foriegn'));
  } else {
    // Head office context
    const schoolState = states.find(s => s.code === school.state_code);
    const zone = zones.find(z => z.code === schoolState?.zone_code);
    isForeign = !!(zone?.name?.toLowerCase().includes('foreign') || zone?.name?.toLowerCase().includes('foriegn'));
  }

  const status = (school.accreditation_status || '').toUpperCase();
  const today = new Date();

  if (status === 'FAILED') return true;

  if (!school.accredited_date) return false;

  // Determine the expiry date
  const expiry = new Date(school.accredited_date);
  
  if (isForeign) {
    expiry.setFullYear(expiry.getFullYear() + 10);
  } else {
    if (!['FULL', 'PARTIAL', 'PASSED', 'ACCREDITED'].includes(status)) {
        return false;
    }
    const yearsToAdd = status === 'PARTIAL' ? 1 : 5;
    expiry.setFullYear(expiry.getFullYear() + yearsToAdd);
  }

  return today >= expiry;
}
