const PINCODE_API_BASE = 'https://api.postalpincode.in/pincode';

/**
 * Retrieves state, district, and post office localities for a valid 6-digit Indian PIN code.
 * @param {string} pincode - 6-digit PIN code
 * @returns {Promise<{state: string, district: string, postOffices: string[]}>}
 */
export async function lookupPincode(pincode) {
  const sanitizedPincode = pincode?.trim();

  if (!sanitizedPincode || sanitizedPincode.length !== 6 || isNaN(sanitizedPincode)) {
    throw new Error('Please provide a valid 6-digit numeric Indian PIN code.');
  }

  try {
    const response = await fetch(`${PINCODE_API_BASE}/${sanitizedPincode}`);
    if (!response.ok) {
      throw new Error('Network error while retrieving PIN code details.');
    }

    const data = await response.json();
    if (!data || !data[0] || data[0].Status !== 'Success' || !data[0].PostOffice) {
      throw new Error('Invalid PIN code or no postal records found.');
    }

    const postOfficesList = data[0].PostOffice;
    const primaryRecord = postOfficesList[0];

    return {
      state: primaryRecord.State || '',
      district: primaryRecord.District || '',
      postOffices: postOfficesList.map((po) => po.Name).filter(Boolean),
    };
  } catch (error) {
    throw new Error(error.message || 'Failed to fetch postal details.');
  }
}