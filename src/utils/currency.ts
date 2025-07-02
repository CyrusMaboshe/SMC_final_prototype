/**
 * Currency formatting utilities for Zambian Kwacha (ZMW)
 */

/**
 * Formats a number as Zambian Kwacha currency
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "ZMW 1,234.56")
 */
export const formatCurrency = (amount: number): string => {
  return `ZMW ${new Intl.NumberFormat('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)}`;
};

/**
 * Formats a number as Zambian Kwacha currency without the currency symbol
 * @param amount - The amount to format
 * @returns Formatted number string (e.g., "1,234.56")
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Parses a currency string and returns the numeric value
 * @param currencyString - The currency string to parse (e.g., "ZMW 1,234.56" or "1,234.56")
 * @returns The numeric value
 */
export const parseCurrency = (currencyString: string): number => {
  // Remove currency symbol and any non-numeric characters except decimal point
  const numericString = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(numericString) || 0;
};

/**
 * Validates if a currency amount is valid
 * @param amount - The amount to validate
 * @returns True if valid, false otherwise
 */
export const isValidCurrencyAmount = (amount: number): boolean => {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
};

/**
 * Rounds a currency amount to 2 decimal places
 * @param amount - The amount to round
 * @returns Rounded amount
 */
export const roundCurrency = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};
