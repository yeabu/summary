export type CurrencyCode = 'CNY' | 'LAK' | 'THB';

export function getCurrency(): CurrencyCode {
  const code = (import.meta.env.VITE_CURRENCY || 'CNY').toUpperCase();
  if (code === 'LAK' || code === 'THB' || code === 'CNY') return code as CurrencyCode;
  return 'CNY';
}

export function getCurrencyLabel(code: CurrencyCode = getCurrency()): string {
  switch (code) {
    case 'CNY': return '人民币 CNY';
    case 'LAK': return '老挝基普 LAK';
    case 'THB': return '泰铢 THB';
    default: return code;
  }
}

export function formatCurrency(amount: number, code: CurrencyCode = getCurrency()): string {
  const locale = code === 'CNY' ? 'zh-CN' : code === 'THB' ? 'th-TH' : 'lo-LA';
  // LAK：按“万”为单位显示，并保留两位小数
  if (code === 'LAK') {
    const opts: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    };
    const scaled = (amount ?? 0) / 10000; // 转换为“万”单位
    try {
      return `${scaled.toLocaleString(locale, opts)}万`;
    } catch {
      return `${code} ${(scaled).toFixed(2)}万`;
    }
  }

  // 其它币种按常规两位小数显示
  const opts: Intl.NumberFormatOptions = { style: 'currency', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 };
  try {
    return (amount ?? 0).toLocaleString(locale, opts);
  } catch {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
}

// 不缩放显示金额（LAK 不除以1万，不加“万”）
export function formatCurrencyExact(amount: number, code: CurrencyCode = getCurrency()): string {
  const locale = code === 'CNY' ? 'zh-CN' : code === 'THB' ? 'th-TH' : 'lo-LA';
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  try {
    return (amount ?? 0).toLocaleString(locale, opts);
  } catch {
    return `${code} ${Number(amount || 0).toFixed(2)}`;
  }
}
