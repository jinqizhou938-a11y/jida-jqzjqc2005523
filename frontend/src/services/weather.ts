export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherLabel: string;
  city: string;
  lat: number;
  lon: number;
  locationSource?: 'city';
}

export interface ClothingRecommendation {
  category: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const WMO_LABELS: Record<number, string> = {
  0: '晴朗',
  1: '大部晴朗',
  2: '局部多云',
  3: '阴天',
  45: '雾',
  48: '雾凇',
  51: '小毛毛雨',
  53: '毛毛雨',
  55: '大毛毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  80: '小阵雨',
  81: '阵雨',
  82: '大阵雨',
  95: '雷暴',
};

function weatherLabel(code: number): string {
  return WMO_LABELS[code] || '多变';
}

function isRain(code: number) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code === 95;
}

function isSnow(code: number) {
  return code >= 71 && code <= 77;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=zh&count=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('无法解析位置');
  const data = await res.json();
  const place = data.results?.[0];
  if (!place) return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  return [place.name, place.admin1].filter(Boolean).join(' · ') || place.country || '当前位置';
}

export async function fetchWeather(
  lat: number,
  lon: number,
  options: { cityHint?: string; locationSource?: WeatherData['locationSource'] } = {}
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    timezone: 'auto',
  });

  const city = options.cityHint || (await reverseGeocode(lat, lon));

  const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!weatherRes.ok) throw new Error('天气数据获取失败');
  const data = await weatherRes.json();
  const c = data.current;

  return {
    temperature: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m),
    weatherCode: c.weather_code,
    weatherLabel: weatherLabel(c.weather_code),
    city,
    lat,
    lon,
    locationSource: options.locationSource,
  };
}

export interface CitySearchResult {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  if (!query.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=zh`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('城市搜索失败');
  const data = await res.json();
  return (data.results || []).map((r: CitySearchResult) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export function recommendClothing(weather: WeatherData): ClothingRecommendation[] {
  const { feelsLike, humidity, weatherCode, windSpeed } = weather;
  const items: ClothingRecommendation[] = [];
  const push = (category: string, reason: string, priority: ClothingRecommendation['priority']) => {
    if (!items.some((i) => i.category === category)) items.push({ category, reason, priority });
  };

  if (feelsLike >= 30) {
    push('短袖/T恤', '体感炎热，优先透气', 'high');
    push('短裤/裙装', '便于散热', 'high');
    push('凉鞋/拖鞋', '脚部保持干爽', 'medium');
    push('遮阳帽', '防晒降温', 'medium');
  } else if (feelsLike >= 25) {
    push('短袖/薄衬衫', '温暖偏热，轻薄为主', 'high');
    push('九分裤/休闲裤', '舒适日常', 'high');
    push('薄款运动鞋', '透气轻便', 'medium');
  } else if (feelsLike >= 20) {
    push('长袖衬衫', '温度适宜，单层即可', 'high');
    push('薄针织/卫衣', '早晚温差可备', 'medium');
    push('休闲长裤', '百搭实用', 'high');
  } else if (feelsLike >= 15) {
    push('薄外套/风衣', '微凉天气需要外层', 'high');
    push('长袖T恤/衬衫', '内搭保暖', 'high');
    push('牛仔裤/长裤', '防风实用', 'medium');
  } else if (feelsLike >= 10) {
    push('夹克/薄羽绒服', '偏冷需加强保暖', 'high');
    push('毛衣/针织衫', '中层保暖', 'high');
    push('长裤', '腿部保暖', 'medium');
  } else if (feelsLike >= 0) {
    push('厚外套/大衣', '寒冷天气必备', 'high');
    push('保暖毛衣', '锁住体温', 'high');
    push('围巾', '保护颈项', 'medium');
  } else {
    push('羽绒服/棉服', '严寒需重型保暖', 'high');
    push('保暖内衣', '贴身防寒', 'high');
    push('帽子/手套', '防冻伤', 'high');
  }

  if (humidity >= 75) {
    push('速干/透气材质', `湿度 ${humidity}%，避免闷热`, 'medium');
  } else if (humidity <= 35) {
    push('保湿面料/润唇膏', `空气干燥（${humidity}%）`, 'low');
  }

  if (isRain(weatherCode)) {
    push('防水外套/雨衣', `${weather.weatherLabel}，需防雨`, 'high');
    push('防水鞋/雨靴', '避免鞋袜湿透', 'high');
  }

  if (isSnow(weatherCode)) {
    push('防滑保暖靴', '雪天路滑需防滑', 'high');
    push('加厚外套', '降雪天气加强保暖', 'high');
  }

  if (windSpeed >= 25) {
    push('防风外套', `风速 ${windSpeed} km/h，注意防风`, 'medium');
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
