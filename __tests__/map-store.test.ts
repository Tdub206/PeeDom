import { useMapStore } from '@/store/useMapStore';

describe('useMapStore', () => {
  beforeEach(() => {
    useMapStore.getState().reset();
  });

  it('skips region updates when the next region is effectively unchanged', () => {
    const initialRegion = useMapStore.getState().region;

    useMapStore.getState().setRegion({
      ...initialRegion,
      latitude: initialRegion.latitude + 0.000001,
      longitudeDelta: initialRegion.longitudeDelta + 0.000001,
    });

    expect(useMapStore.getState().region).toBe(initialRegion);
  });

  it('updates region when the user moves the map meaningfully', () => {
    const initialRegion = useMapStore.getState().region;
    const updatedRegion = {
      ...initialRegion,
      latitude: initialRegion.latitude + 0.01,
      longitude: initialRegion.longitude - 0.01,
    };

    useMapStore.getState().setRegion(updatedRegion);

    expect(useMapStore.getState().region).toEqual(updatedRegion);
    expect(useMapStore.getState().region).not.toBe(initialRegion);
  });
});
