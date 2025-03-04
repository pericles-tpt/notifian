import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faArrowLeft, faBan, faBell, faRotate, faStar, faVault } from "@fortawesome/free-solid-svg-icons";

// Zero
export const ZERO_TIME = new Date(-62135596800000);
export const PAST_TIME_YEAR = 2150;

// Units
export const KILOBYTE = 1024;
export const MEGABYTE = 1024 * 1024;

// Color
export const C_GRAY = 'dimgray';
export const C_LGRAY = '#f1f1f1';
export const C_BLUE = '#0000ff';
export const PURPLE = '#9131cc';

// Conversion
export const MIN_TO_MILLI = 60 * 1000;
export const HOUR_TO_SEC = 60 * 60;

// Limits
// NOTE: This is the android limit, ios is more but better to keep consistent
export const SCHEDULED_NOTIFICATIONS_LIMIT = 50;
export const MAX_FRONTMATTER_SIZE_TO_CHECK = 5000;
export const CONTENT_PREVIEW_LIMIT = 100;
export const MAX_SHOW_FOLDER_LEN = 45;
export const MAX_ERROR_LOG_SIZE = 9 * MEGABYTE;

// Calendar
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
// NOTE: 'sun' is the start of the week here, to match the JS implementation of getDay()
export const DAY_OF_WEEK = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
export const FUTURE_DATE = new Date(2150, 1, 1, 1, 1, 1, 0);
export const MAX_DATE = new Date(8640000000000000);

// Icon
export const ICONS_IN_USE: IconDefinition[] = [faArrowLeft, faVault, faBell, faBan, faRotate, faStar];

// Interval
export const INTERVAL_OPTIONS = [
  {
    label: '15 minutes',
    value: 15,
  },
  {
    label: '20 minutes',
    value: 20,
  },
  {
    label: '30 minutes',
    value: 30,
  },
  {
    label: '45 minutes',
    value: 45,
  },
  {
    label: '1 hour',
    value: 1 * 60,
  },
  {
    label: '2 hours',
    value: 2 * 60,
  },
  {
    label: '4 hours',
    value: 4 * 60,
  },
  {
    label: '8 hours',
    value: 8 * 60,
  },
  {
    label: '24 hours',
    value: 24 * 60,
  },
];

export const NINE_AM = new Date(2000, 1, 1, 9, 0, 0, 0);
