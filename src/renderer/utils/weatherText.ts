type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function abbreviateWeatherDescription(description?: string, t?: TranslateFn): string {
  const text = (description ?? '').trim();
  if (!text) return '';

  const lower = text.toLowerCase();

  const tr = (key: string, fallback: string): string => t?.(key, { defaultValue: fallback }) ?? fallback;

  if (text.includes('雷') || lower.includes('thunder')) return tr('weatherAbbr.thunder', '雷');
  if (text.includes('雪') || lower.includes('snow') || lower.includes('sleet') || lower.includes('hail')) return tr('weatherAbbr.snow', '雪');
  if (text.includes('冻雨') || lower.includes('freezing rain')) return tr('weatherAbbr.freezingRain', '冻雨');
  if (text.includes('雨') || lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) return tr('weatherAbbr.rain', '雨');
  if (text.includes('雾') || text.includes('霾') || text.includes('沙') || lower.includes('fog') || lower.includes('mist') || lower.includes('haze') || lower.includes('dust') || lower.includes('sand')) return tr('weatherAbbr.fog', '雾');
  if (text.includes('阴') || lower.includes('overcast')) return tr('weatherAbbr.overcast', '阴');
  if (text.includes('多云') || text.includes('云') || lower.includes('cloud')) return tr('weatherAbbr.cloudy', '云');
  if (text.includes('晴') || lower.includes('sunny') || lower.includes('clear')) return tr('weatherAbbr.sunny', '晴');

  return text;
}
