import { Redirect } from 'expo-router';
import { routes } from '@/constants/routes';

export default function BusinessTab() {
  return <Redirect href={routes.tabs.profile} />;
}
