import React, { memo, ReactNode, useCallback, useMemo } from 'react';
import GorhomBottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: string[];
  children: ReactNode;
}

function renderBackdrop(props: BottomSheetBackdropProps) {
  return <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.2} />;
}

function BottomSheetComponent({ isOpen, onClose, snapPoints, children }: BottomSheetProps) {
  const sheetSnapPoints = useMemo(() => snapPoints ?? ['38%', '62%'], [snapPoints]);

  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <GorhomBottomSheet
      animateOnMount
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#ffffff' }}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: '#b5c1d0', width: 48 }}
      index={isOpen ? 0 : -1}
      onChange={handleChange}
      snapPoints={sheetSnapPoints}
    >
      <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
    </GorhomBottomSheet>
  );
}

export const BottomSheet = memo(BottomSheetComponent);
