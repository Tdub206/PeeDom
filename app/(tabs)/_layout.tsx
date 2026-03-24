import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type TabIconName = 'index' | 'search' | 'favorites' | 'profile' | 'business' | 'admin';

const TAB_ICON_MAP: Record<TabIconName, keyof typeof Ionicons.glyphMap> = {
  index: 'map-outline',
  search: 'search-outline',
  favorites: 'heart-outline',
  profile: 'person-circle-outline',
  business: 'briefcase-outline',
  admin: 'shield-checkmark-outline',
};

export default function TabLayout() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand[600],
        tabBarInactiveTintColor: colors.ink[500],
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () =>
          Platform.OS === 'ios' ? <BlurView intensity={100} style={StyleSheet.absoluteFill} /> : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabBarIcon routeName="index" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <TabBarIcon routeName="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarIcon: ({ color }) => <TabBarIcon routeName="favorites" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon routeName="profile" color={color} />,
        }}
      />
      <Tabs.Screen
        name="business"
        options={{
          title: 'Business',
          tabBarIcon: ({ color }) => <TabBarIcon routeName="business" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color }) => <TabBarIcon routeName="admin" color={color} />,
          href: isAdmin ? ('/admin' as never) : null,
        }}
      />
    </Tabs>
  );
}

function TabBarIcon({ routeName, color }: { routeName: TabIconName; color: string }) {
  return <Ionicons color={color} name={TAB_ICON_MAP[routeName]} size={22} />;
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: Platform.OS === 'android' ? colors.surface.card : 'transparent',
    height: Platform.OS === 'ios' ? 88 : 60,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
