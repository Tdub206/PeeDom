import { RegionBounds } from '@/types';

export const REGION_COMPARISON_EPSILON = 0.00001;

export function areRegionBoundsEqual(
  leftRegion: RegionBounds,
  rightRegion: RegionBounds,
  epsilon: number = REGION_COMPARISON_EPSILON
): boolean {
  return (
    Math.abs(leftRegion.latitude - rightRegion.latitude) <= epsilon &&
    Math.abs(leftRegion.longitude - rightRegion.longitude) <= epsilon &&
    Math.abs(leftRegion.latitudeDelta - rightRegion.latitudeDelta) <= epsilon &&
    Math.abs(leftRegion.longitudeDelta - rightRegion.longitudeDelta) <= epsilon
  );
}
