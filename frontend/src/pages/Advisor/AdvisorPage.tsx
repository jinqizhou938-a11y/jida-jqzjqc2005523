import { useCallback, useState } from 'react';
import {
  RefreshCw,
  Thermometer,
  Droplets,
  Wind,
  CloudSun,
  Shirt,
  Search,
  MapPin,
} from '../../components/Icons/Icons';
import PageTitle from '../../components/PageTitle/PageTitle';
import {
  fetchWeather,
  recommendClothing,
  searchCities,
  type WeatherData,
  type ClothingRecommendation,
  type CitySearchResult,
} from '../../services/weather';

const PRIORITY_STYLE = {
  high: 'border-brand bg-brand-muted text-brand-dark',
  medium: 'border-brand-light bg-white/90 text-gray-700',
  low: 'border-gray-200 bg-white/80 text-gray-600',
};

export default function AdvisorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [recommendations, setRecommendations] = useState<ClothingRecommendation[]>([]);
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CitySearchResult[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CitySearchResult | null>(null);

  const loadByCity = useCallback(async (city: CitySearchResult) => {
    setLoading(true);
    setError(null);
    setSelectedCity(city);
    setCityResults([]);
    try {
      const cityHint = [city.name, city.admin1, city.country].filter(Boolean).join(' · ');
      const data = await fetchWeather(city.latitude, city.longitude, {
        cityHint,
        locationSource: 'city',
      });
      setWeather(data);
      setRecommendations(recommendClothing(data));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '获取天气失败，请稍后重试');
      setWeather(null);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCitySearch = async () => {
    if (!cityQuery.trim()) return;
    setSearchingCity(true);
    setError(null);
    try {
      const results = await searchCities(cityQuery);
      setCityResults(results);
      if (results.length === 0) {
        setError('未找到该城市，请换个关键词试试');
      } else if (results.length === 1) {
        await loadByCity(results[0]);
      }
    } catch {
      setError('城市搜索失败，请检查网络');
      setCityResults([]);
    } finally {
      setSearchingCity(false);
    }
  };

  const handleRefresh = () => {
    if (selectedCity) loadByCity(selectedCity);
  };

  return (
    <div className="pb-6 px-4">
      <header className="pt-4 pb-5">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CloudSun className="text-brand shrink-0" size={26} />
          <PageTitle size="2xl" className="!text-gray-900">穿搭顾问</PageTitle>
        </div>
        <p className="text-sm text-gray-500">搜索城市，根据当地天气与湿度推荐适合的衣物</p>
      </header>

      <div className="rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-sm p-4">
        <p className="text-sm font-medium text-gray-800 mb-2">选择城市</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCitySearch()}
            placeholder="输入城市，如 北京、上海、杭州"
            className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={handleCitySearch}
            disabled={searchingCity || loading || !cityQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1"
          >
            {searchingCity || loading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            查询
          </button>
        </div>

        {cityResults.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-400 mb-2">请选择匹配的城市：</p>
            {cityResults.map((city) => (
              <li key={`${city.name}-${city.latitude}`}>
                <button
                  type="button"
                  onClick={() => loadByCity(city)}
                  className="w-full text-left text-sm px-3 py-2.5 rounded-lg hover:bg-brand-muted/60 border border-transparent hover:border-brand-light"
                >
                  {[city.name, city.admin1, city.country].filter(Boolean).join(' · ')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">{error}</div>
      )}

      {weather && (
        <section className="mt-5 space-y-4">
          <div className="rounded-2xl bg-white/90 backdrop-blur border border-white/60 shadow-sm p-4">
            <div className="flex items-center justify-between gap-2 text-sm text-gray-500 mb-3">
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                {weather.city}
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="text-xs text-brand flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                刷新
              </button>
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-5xl font-black text-gray-900">{weather.temperature}°</span>
              <div className="pb-1">
                <p className="text-sm font-medium text-gray-700">{weather.weatherLabel}</p>
                <p className="text-xs text-gray-400">体感 {weather.feelsLike}°C</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-brand-muted/60 px-3 py-2 text-center">
                <Thermometer size={16} className="mx-auto text-brand mb-1" />
                <p className="text-xs text-gray-500">气温</p>
                <p className="text-sm font-semibold">{weather.temperature}°C</p>
              </div>
              <div className="rounded-xl bg-brand-muted/60 px-3 py-2 text-center">
                <Droplets size={16} className="mx-auto text-brand mb-1" />
                <p className="text-xs text-gray-500">湿度</p>
                <p className="text-sm font-semibold">{weather.humidity}%</p>
              </div>
              <div className="rounded-xl bg-brand-muted/60 px-3 py-2 text-center">
                <Wind size={16} className="mx-auto text-brand mb-1" />
                <p className="text-xs text-gray-500">风速</p>
                <p className="text-sm font-semibold">{weather.windSpeed} km/h</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shirt size={18} className="text-brand" />
              <h2 className="page-title text-lg text-gray-900">今日穿搭建议</h2>
            </div>
            <div className="space-y-2">
              {recommendations.map((item) => (
                <div
                  key={item.category}
                  className={`rounded-xl border px-4 py-3 ${PRIORITY_STYLE[item.priority]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{item.category}</span>
                    {item.priority === 'high' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand text-white">推荐</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 opacity-80">{item.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!weather && !loading && !error && (
        <p className="text-center text-sm text-gray-400 mt-8">
          输入城市名称并查询，即可获取穿搭建议
        </p>
      )}
    </div>
  );
}
