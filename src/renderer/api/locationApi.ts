/**
 * @file locationApi.ts
 * @description 地理位置接口模块
 * @author 鸡哥
 */

/** 位置信息接口 */
export interface LocationInfo {
  latitude: number;
  longitude: number;
  city: string;
  regionName: string;
  country: string;
}

/**
 * 获取当前设备位置（精确坐标）
 * @returns 包含经纬度及城市/地区/国家信息的 LocationInfo
 */
export async function fetchLocation(): Promise<LocationInfo> {
  const res = await fetch(
    'http://ip-api.com/json/?fields=lat,lon,city,regionName,country&lang=zh-CN'
  );
  const data = await res.json();

  return {
    latitude: data.lat,
    longitude: data.lon,
    city: data.city,
    regionName: data.regionName,
    country: data.country
  };
}
