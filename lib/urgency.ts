import { ICategoryThreshold } from './models/CategoryThreshold';
import { UrgencyColor } from './models/Batch';

/**
 * Calculates the urgency color based on the number of days until expiry and category thresholds.
 * @param expiryDate Expiry date of the batch
 * @param threshold CategoryThreshold object containing green, yellow, orange, and red day thresholds
 * @returns UrgencyColor ('green' | 'yellow' | 'orange' | 'red' | 'maroon')
 */
export function calculateUrgencyColor(
  expiryDate: Date,
  threshold: ICategoryThreshold
): UrgencyColor {
  const today = new Date();
  
  // Normalize dates to midnight to avoid time-of-day offsets
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const expiryMs = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  
  const diffTime = expiryMs - todayMs;
  const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    return 'maroon'; // Expired
  }
  if (daysUntilExpiry < threshold.redMinDays) {
    return 'red';
  }
  if (daysUntilExpiry < threshold.orangeMinDays) {
    return 'orange';
  }
  if (daysUntilExpiry < threshold.yellowMinDays) {
    return 'yellow';
  }
  return 'green'; // >= greenMinDays or yellowMinDays (depending on greenMinDays)
}
