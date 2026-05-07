import type { JsonObject } from './public-restroom-import';
import { parseGovernmentOpenDataGeoJson, sanitizeFileName } from './government-open-data';

export interface SocrataCatalogFieldMetadata {
  key: string;
  value: string;
}

export interface SocrataCatalogResource {
  name: string;
  id: string;
  description?: string | null;
  attribution?: string | null;
  attribution_link?: string | null;
  type?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  metadata_updated_at?: string | null;
  data_updated_at?: string | null;
  columns_name?: string[] | null;
  columns_field_name?: string[] | null;
  columns_datatype?: string[] | null;
  provenance?: string | null;
  download_count?: number | null;
}

export interface SocrataCatalogClassification {
  categories?: string[] | null;
  tags?: string[] | null;
  domain_category?: string | null;
  domain_tags?: string[] | null;
  domain_metadata?: SocrataCatalogFieldMetadata[] | null;
}

export interface SocrataCatalogUser {
  id?: string;
  user_type?: string;
  display_name?: string | null;
}

export interface SocrataCatalogResult {
  resource: SocrataCatalogResource;
  classification?: SocrataCatalogClassification | null;
  metadata?: {
    domain?: string | null;
    license?: string | null;
  } | null;
  permalink?: string | null;
  link?: string | null;
  owner?: SocrataCatalogUser | null;
  creator?: SocrataCatalogUser | null;
}

const RESTROOM_TERMS = [
  'public restroom',
  'restroom',
  'bathroom',
  'toilet',
  'comfort station',
  'washroom',
  'lavatory',
];
const NEGATIVE_TERMS = [
  'parcel',
  'zoning',
  'stormwater',
  'wastewater',
  'hydrant',
  'manhole',
  'sewer',
  'assessment',
];

function buildSearchText(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function containsTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function buildPortalKey(domain: string): string {
  return `socrata-${sanitizeFileName(domain)}`;
}

function getAgencyName(item: SocrataCatalogResult): string | null {
  const agencyMetadata = item.classification?.domain_metadata?.find((metadataItem) =>
    metadataItem.key.toLowerCase().includes('agency')
  );

  return agencyMetadata?.value?.trim() || null;
}

function hasLocationSignal(item: SocrataCatalogResult): boolean {
  const datatypes = (item.resource.columns_datatype ?? []).map((value) => value.toLowerCase());
  const fieldNames = (item.resource.columns_field_name ?? []).map((value) => value.toLowerCase());

  return (
    datatypes.includes('point') ||
    datatypes.includes('location') ||
    fieldNames.includes('location') ||
    fieldNames.includes('location_1') ||
    (fieldNames.includes('latitude') && fieldNames.includes('longitude')) ||
    fieldNames.includes('the_geom')
  );
}

export function scoreSocrataDatasetRelevance(item: SocrataCatalogResult): number {
  const titleText = buildSearchText([item.resource.name]);
  const descriptionText = buildSearchText([item.resource.description ?? null]);
  const tagText = buildSearchText([
    ...(item.classification?.tags ?? []),
    ...(item.classification?.domain_tags ?? []),
    ...(item.resource.columns_name ?? []),
    ...(item.resource.columns_field_name ?? []),
  ]);
  let score = 0;

  if (containsTerm(titleText, RESTROOM_TERMS)) {
    score += 8;
  }

  if (containsTerm(descriptionText, RESTROOM_TERMS)) {
    score += 4;
  }

  if (containsTerm(tagText, RESTROOM_TERMS)) {
    score += 4;
  }

  if (item.resource.provenance?.toLowerCase() === 'official') {
    score += 2;
  }

  if (hasLocationSignal(item)) {
    score += 3;
  }

  if ((item.resource.download_count ?? 0) >= 100) {
    score += 1;
  }

  if (
    !containsTerm(buildSearchText([titleText, descriptionText, tagText]), RESTROOM_TERMS) &&
    containsTerm(buildSearchText([titleText, descriptionText, tagText]), NEGATIVE_TERMS)
  ) {
    score -= 4;
  }

  return score;
}

export function buildSocrataDatasetPageUrl(item: SocrataCatalogResult): string {
  const domain = item.metadata?.domain?.trim();

  if (item.link?.trim()) {
    return item.link.trim();
  }

  if (item.permalink?.trim()) {
    return item.permalink.trim();
  }

  if (!domain) {
    throw new Error(`Unable to build Socrata dataset page URL for ${item.resource.id}.`);
  }

  return `https://${domain}/d/${encodeURIComponent(item.resource.id)}`;
}

export function buildSocrataGeoJsonUrl(
  item: SocrataCatalogResult,
  limit: number,
  offset: number
): string {
  const domain = item.metadata?.domain?.trim();

  if (!domain) {
    throw new Error(`Socrata dataset ${item.resource.id} does not expose a domain.`);
  }

  const requestUrl = new URL(`https://${domain}/resource/${encodeURIComponent(item.resource.id)}.geojson`);
  requestUrl.searchParams.set('$limit', String(limit));
  requestUrl.searchParams.set('$offset', String(offset));
  return requestUrl.toString();
}

export function parseSocrataRestroomGeoJson(raw: string, item: SocrataCatalogResult) {
  const domain = item.metadata?.domain?.trim();

  if (!domain) {
    throw new Error(`Socrata dataset ${item.resource.id} does not expose a domain.`);
  }

  const sourceProvider =
    item.resource.attribution?.trim() ||
    getAgencyName(item) ||
    item.owner?.display_name?.trim() ||
    null;
  const sourceUrl = buildSocrataDatasetPageUrl(item);
  const domainTags = item.classification?.domain_tags ?? [];
  const metadata: JsonObject = {
    source_domain: domain,
    source_download_count: item.resource.download_count ?? null,
    source_provenance: item.resource.provenance ?? null,
    source_domain_category: item.classification?.domain_category ?? null,
    source_domain_tags: domainTags,
    source_columns: item.resource.columns_field_name ?? [],
  };

  return parseGovernmentOpenDataGeoJson(raw, {
    sourceKey: 'socrata-open-data',
    portalKey: buildPortalKey(domain),
    portalName: domain,
    portalUrl: `https://${domain}`,
    queryMatchStrategy: 'socrata_catalog_search',
    sourceDatasetId: item.resource.id,
    sourceDataset: item.resource.name,
    sourceDatasetUrl: sourceUrl,
    sourceOwner: item.owner?.display_name?.trim() || null,
    sourceProvider,
    sourceResourceId: `${item.resource.id}:geojson`,
    sourceResourceName: `${item.resource.name} GeoJSON`,
    sourceResourceUrl: sourceUrl,
    sourceResourceDownloadUrl: buildSocrataGeoJsonUrl(item, 1, 0).replace(/[?&]\$limit=1/, '').replace(/[?&]\$offset=0/, ''),
    sourceAttributionText: item.resource.attribution?.trim() || sourceProvider,
    sourceLicenseText: item.metadata?.license?.trim() || null,
    sourceLicenseKey: null,
    sourceDescription: item.resource.description?.trim() || null,
    sourceResourceDescription: 'Socrata GeoJSON dataset resource',
    sourceUpdatedAt:
      item.resource.data_updated_at?.trim() ||
      item.resource.updatedAt?.trim() ||
      item.resource.metadata_updated_at?.trim() ||
      null,
    importFormat: 'geojson',
    countryCode: 'US',
    websiteUrl: item.resource.attribution_link?.trim() || sourceUrl,
    extraMetadata: metadata,
  });
}
