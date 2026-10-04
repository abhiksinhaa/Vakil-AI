const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const FLASH_SALE_DATE = '2026-10-04';

function getIstNow(now: Date) {
  return new Date(now.getTime() + IST_OFFSET_MS);
}

export function isFlashSaleActive(now = new Date()) {
  const istNow = getIstNow(now);
  const saleDate = [
    istNow.getUTCFullYear(),
    String(istNow.getUTCMonth() + 1).padStart(2, '0'),
    String(istNow.getUTCDate()).padStart(2, '0'),
  ].join('-');
  const timeInMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();

  return saleDate === FLASH_SALE_DATE && timeInMinutes >= 18 * 60 && timeInMinutes <= 23 * 60 + 59;
}

export function getFlashSaleTimeRemaining(now = new Date()) {
  const [year, month, day] = FLASH_SALE_DATE.split('-').map(Number);
  const saleEnd = Date.UTC(year, month - 1, day + 1) - IST_OFFSET_MS;
  return Math.max(0, saleEnd - now.getTime());
}