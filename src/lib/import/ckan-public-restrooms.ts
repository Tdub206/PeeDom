import type { JsonObject } from './public-restroom-import.ts';
import { parseGovernmentOpenDataGeoJson, sanitizeFileName } from './government-open-data.ts';

export interface CkanPortalConfig {
  key: string;
  name: string;
  apiBaseUrl: string;
  portalUrl: string;
  countryCode: string;
}

export interface CkanTag {
  display_name?: string | null;
  name: string;
}

export interface CkanOrganization {
  name?: string | null;
  title?: string | null;
}

export interface CkanResource {
  id: string;
  name?: string | null;
  format?: string | null;
  mimetype?: string | null;
  description?: string | null;
  url?: string | null;
  download_url?: string | null;
  access_url?: string | null;
  state?: string | null;
  last_modified?: string | null;
}

export interface CkanPackage {
  id: string;
  title?: string | null;
  name?: string | null;
  notes?: string | null;
  url?: string | null;
  author?: string | null;
  maintainer?: string | null;
  license_id?: string | null;
  license_title?: string | null;
  license_url?: string | null;
  metadata_modified?: string | null;
  updated?: string | null;
  state?: string | null;
  tags?: CkanTag[] | null;
  resources?: CkanResource[] | null;
  organization?: CkanOrganization | null;
}

const RESTROOM_TERMS = [
  'public toilet',
  'public toilets',
  'public restroom',
  'restroom',
  'bathroom',
  'toilet',
  'toilets',
  'washroom',
  'comfort station',
];
const NEGATIVE_TERMS = [
  'parcel',
  'zoning',
  'stormwater',
  'wastewater',
  'hydrant',
  'sewer',
  'manhole',
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

function isGeoJsonResource(resource: CkanResource): boolean {
  const formatText = buildSearchText([resource.format ?? null, resource.mimetype ?? null, resource.name ?? null]);
  const urlText = buildSearchText([
    resource.download_url ?? null,
    resource.access_url ?? null,
    resource.url ?? null,
  ]);

  return (
    formatText.includes('geojson') ||
    formatText.includes('geo+json') ||
    urlText.includes('.geojson') ||
    urlText.includes('/geojson')
  );
}

function buildResourceScore(resource: CkanResource): number {
  const formatText = buildSearchText([resource.format ?? null, resource.mimetype ?? null]);
  const nameText = buildSearchText([resource.name ?? null, resource.description ?? null]);
  let score = 0;

  if (isGeoJsonResource(resource)) {
    score += 8;
  }

  if (containsTerm(nameText, RESTROOM_TERMS)) {
    score += 3;
  }

  if (resource.download_url?.trim()) {
    score += 2;
  }

  if (formatText.includes('geojson')) {
    score += 1;
  }

  return score;
}

export function selectBestCkanGeoJsonResource(dataset: CkanPackage): CkanResource | null {
  return [...(dataset.resources ?? [])]
    .filter((resource) => (resource.state ?? 'active').toLowerCase() === 'active')
    .filter((resource) => isGeoJsonResource(resource))
    .sort((leftItem, rightItem) => buildResourceScore(rightItem) - buildResourceScore(leftItem))[0] ?? null;
}

export function scoreCkanDatasetRelevance(dataset: CkanPackage): number {
  const titleText = buildSearchText([dataset.title ?? null, dataset.name ?? null]);
  const notesText = buildSearchText([dataset.notes ?? null]);
  const tagText = buildSearchText((dataset.tags ?? []).map((tag) => tag.display_name ?? tag.name));
  const resourceText = buildSearchText(
    (dataset.resources ?? []).flatMap((resource) => [
      resource.name ?? null,
      resource.format ?? null,
      resource.description ?? null,
    ])
  );
  let score = 0;

  if (containsTerm(titleText, RESTROOM_TERMS)) {
    score += 8;
  }

  if (containsTerm(notesText, RESTROOM_TERMS)) {
    score += 4;
  }

  if (containsTerm(tagText, RESTROOM_TERMS)) {
    score += 4;
  }

  if (containsTerm(resourceText, RESTROOM_TERMS)) {
    score += 3;
  }

  if (selectBestCkanGeoJsonResource(dataset)) {
    score += 4;
  }

  if (
    !containsTerm(buildSearchText([titleText, notesText, tagText, resourceText]), RESTROOM_TERMS) &&
    containsTerm(buildSearchText([titleText, notesText, tagText, resourceText]), NEGATIVE_TERMS)
  ) {
    score -= 4;
  }

  return score;
}

export function buildCkanDatasetPageUrl(portal: CkanPortalConfig, dataset: CkanPackage): string {
  if (dataset.url?.trim()) {
    return dataset.url.trim();
  }

  if (dataset.name?.trim()) {
    return `${portal.portalUrl.replace(/\/$/, '')}/dataset/${encodeURIComponent(dataset.name.trim())}`;
  }

  throw new Error(`Unable to build CKAN dataset page URL for ${dataset.id}.`);
}

function buildResourceDownloadUrl(resource: CkanResource): string | null {
  return resource.download_url?.trim() || resource.access_url?.trim() || resource.url?.trim() || null;
}

export function parseCkanRestroomGeoJson(
  raw: string,
  portal: CkanPortalConfig,
  dataset: CkanPackage,
  resource: CkanResource
) {
  const datasetTitle = dataset.title?.trim() || dataset.name?.trim() || dataset.id;
  const datasetUrl = buildCkanDatasetPageUrl(portal, dataset);
  const downloadUrl = buildResourceDownloadUrl(resource);
  const sourceProvider =
    dataset.organization?.title?.trim() ||
    dataset.author?.trim() ||
    dataset.maintainer?.trim() ||
    null;
  const metadata: JsonObject = {
    source_tags: (dataset.tags ?? []).map((tag) => tag.display_name ?? tag.name),
    source_license_url: dataset.license_url ?? null,
    source_package_name: dataset.name ?? null,
    source_resource_format: resource.format ?? null,
    source_resource_mimetype: resource.mimetype ?? null,
  };

  return parseGovernmentOpenDataGeoJson(raw, {
    sourceKey: 'ckan-open-data',
    portalKey: portal.key,
    portalName: portal.name,
    portalUrl: portal.portalUrl,
    queryMatchStrategy: 'ckan_package_search',
    sourceDatasetId: dataset.id,
    sourceDataset: datasetTitle,
    sourceDatasetUrl: datasetUrl,
    sourceOwner: dataset.organization?.title?.trim() || null,
    sourceProvider,
    sourceResourceId: resource.id,
    sourceResourceName: resource.name?.trim() || `${datasetTitle} GeoJSON`,
    sourceResourceUrl: resource.url?.trim() || downloadUrl,
    sourceResourceDownloadUrl: downloadUrl,
    sourceAttributionText: sourceProvider,
    sourceLicenseText: dataset.license_title?.trim() || null,
    sourceLicenseKey: dataset.license_id?.trim() || null,
    sourceDescription: dataset.notes?.trim() || null,
    sourceResourceDescription: resource.description?.trim() || null,
    sourceUpdatedAt:
      resource.last_modified?.trim() ||
      dataset.updated?.trim() ||
      dataset.metadata_modified?.trim() ||
      null,
    importFormat: 'geojson',
    countryCode: portal.countryCode,
    websiteUrl: datasetUrl,
    extraMetadata: metadata,
  });
}

export function buildCkanPortalKey(portalUrl: string): string {
  return `ckan-${sanitizeFileName(portalUrl)}`;
}
