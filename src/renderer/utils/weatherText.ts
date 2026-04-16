type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export function abbreviateWeatherDescription(description?: string, t?: TranslateFn): string {
  const text = (description ?? '').trim();
  if (!text) return '';

  const lower = text.toLowerCase();

  const tr = (key: string, fallback: string): string => t?.(key, { defaultValue: fallback }) ?? fallback;

  if (text.includes('雷') || lower.includes('thunder') || lower.includes('storm')) return tr('weatherAbbr.thunder', '雷');
  if (text.includes('冰雹') || text.includes('雹') || lower.includes('hail')) return tr('weatherAbbr.hail', '雹');
  if (text.includes('雨夹雪') || lower.includes('sleet') || lower.includes('wintry mix')) return tr('weatherAbbr.sleet', '雨雪');
  if (text.includes('冻雨') || lower.includes('freezing rain')) return tr('weatherAbbr.freezingRain', '冻雨');
  if (text.includes('暴雪') || lower.includes('blizzard')) return tr('weatherAbbr.snow', '雪');
  if (text.includes('雪') || lower.includes('snow')) return tr('weatherAbbr.snow', '雪');
  if (text.includes('特大暴雨') || text.includes('暴雨') || lower.includes('torrential rain') || lower.includes('heavy rain') || lower.includes('downpour')) return tr('weatherAbbr.heavyRain', '暴');
  if (text.includes('阵雨') || lower.includes('shower')) return tr('weatherAbbr.shower', '阵');
  if (text.includes('毛毛雨') || text.includes('细雨') || lower.includes('drizzle')) return tr('weatherAbbr.drizzle', '毛');
  if (text.includes('雨') || lower.includes('rain')) return tr('weatherAbbr.rain', '雨');
  if (text.includes('沙尘暴') || text.includes('扬沙') || lower.includes('sandstorm') || lower.includes('blowing sand')) return tr('weatherAbbr.sandstorm', '沙');
  if (text.includes('霾') || lower.includes('haze') || lower.includes('smog')) return tr('weatherAbbr.haze', '霾');
  if (text.includes('雾') || lower.includes('fog') || lower.includes('mist') || lower.includes('dust') || lower.includes('sand')) return tr('weatherAbbr.fog', '雾');
  if (text.includes('大风') || text.includes('强风') || lower.includes('wind') || lower.includes('breeze') || lower.includes('gale')) return tr('weatherAbbr.wind', '风');
  if (text.includes('高温') || text.includes('炎热') || lower.includes('hot')) return tr('weatherAbbr.hot', '热');
  if (text.includes('低温') || text.includes('寒冷') || lower.includes('cold') || lower.includes('freezing')) return tr('weatherAbbr.cold', '冷');
  if (text.includes('阴') || lower.includes('overcast')) return tr('weatherAbbr.overcast', '阴');
  if (text.includes('多云') || text.includes('云') || lower.includes('cloud')) return tr('weatherAbbr.cloudy', '云');
  if (text.includes('晴') || lower.includes('sunny') || lower.includes('clear')) return tr('weatherAbbr.sunny', '晴');
  if (text.includes('未知') || lower === 'unknown' || lower === 'n/a') return tr('weatherAbbr.unknown', '未知');

  return text;
}
