import { Stack } from 'expo-router';

export default function BusinessStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="locations" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="coupons" />
      <Stack.Screen name="claims" />
      <Stack.Screen name="featured" />
      <Stack.Screen name="location/[id]" />
    </Stack>
  );
}
