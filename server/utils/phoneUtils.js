/**
 * Centralized utility for cleaning and validating Indian phone numbers.
 */

function cleanIndianPhone(rawPhone) {
    if (!rawPhone) {
        return {
            original: '',
            cleaned: '',
            formatted: '',
            isValid: false,
            isWhatsapp: false
        };
    }

    // Safely cast to string
    const phoneStr = String(rawPhone).trim();
    
    // Remove all non-digit characters
    let digitsOnly = phoneStr.replace(/\D/g, '');

    // Handle country code prefixes
    if (digitsOnly.startsWith('91') && digitsOnly.length >= 12) {
        digitsOnly = digitsOnly.substring(2);
    }
    // Always strip leading 0 for normalization
    if (digitsOnly.startsWith('0')) {
        digitsOnly = digitsOnly.substring(1);
    }

    // Validate standard Indian numbers
    const isMobile = digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly);
    // Landlines in India (without leading 0) can be 8 to 10 digits
    const isLandline = (digitsOnly.length >= 8 && digitsOnly.length <= 10) && !isMobile;
    const isValid = isMobile || isLandline;

    let formatted = phoneStr;
    if (isValid) {
        if (isMobile) {
            formatted = `+91 ${digitsOnly.substring(0, 5)} ${digitsOnly.substring(5)}`;
        } else {
            formatted = `0${digitsOnly}`;
        }
    }

    return {
        original: phoneStr,
        cleaned: digitsOnly, // Store without 0 to prevent DB bigint truncation issues
        formatted: formatted,
        isValid: isValid,
        isWhatsapp: isMobile
    };
}

module.exports = {
    cleanIndianPhone
};
