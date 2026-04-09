import { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BusinessHeroHeader } from './BusinessHeroHeader';

interface BusinessScreenLayoutProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  iconName?: React.ComponentProps<typeof BusinessHeroHeader>['iconName'];
  variant?: React.ComponentProps<typeof BusinessHeroHeader>['variant'];
  onBack?: () => void;
  rightSlot?: ReactNode;
  children: ReactNode;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function BusinessScreenLayout({
  eyebrow,
  title,
  subtitle,
  iconName,
  variant = 'primary',
  onBack,
  rightSlot,
  children,
  isRefreshing,
  onRefresh,
}: BusinessScreenLayoutProps) {
  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={Boolean(isRefreshing)} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        <View className="px-5 pb-10 pt-6">
          <BusinessHeroHeader
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            iconName={iconName}
            variant={variant}
            onBack={onBack}
            rightSlot={rightSlot}
          />
          <View className="mt-6 gap-5">{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
