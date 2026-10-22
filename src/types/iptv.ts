export interface IptvChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  country: string; // e.g. 'BO', 'AR', 'CO', 'MX', 'ES', 'INT', 'US', etc.
  countryName: string;
  streamUrl: string;
  sourceType?: 'hls' | 'iframe';
  resolution?: string;
  isFavorite?: boolean;
  isDemoFeed?: boolean;
  notes?: string;
  isCustom?: boolean;
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  originalStreamUrl?: string;
}

export type IptvCountryCode = 'ALL' | 'BO' | 'AR' | 'CO' | 'MX' | 'ES' | 'INT';

export interface IptvCountryOption {
  code: IptvCountryCode;
  label: string;
  flag: string;
}

export const IPTV_COUNTRIES: IptvCountryOption[] = [
  { code: 'ALL', label: 'Todos los Deportes', flag: '🌍' },
  { code: 'BO', label: 'Bolivia', flag: '🇧🇴' },
  { code: 'AR', label: 'Argentina', flag: '🇦🇷' },
  { code: 'CO', label: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', label: 'México', flag: '🇲🇽' },
  { code: 'ES', label: 'España', flag: '🇪🇸' },
  { code: 'INT', label: 'Internacional', flag: '🌐' },
];
