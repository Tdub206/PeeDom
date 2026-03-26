import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { exportMyData } from '@/api/data-export';
import { useToast } from '@/hooks/useToast';

export function useDataExport() {
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const exportData = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const { data, error } = await exportMyData();

      if (error || !data?.data) {
        showToast({
          title: 'Export failed',
          message: error ?? 'Unable to export your data right now.',
          variant: 'error',
        });
        return;
      }

      const jsonString = JSON.stringify(data.data, null, 2);

      await Share.share({
        message: jsonString,
        title: 'StallPass Data Export',
      });

      showToast({
        title: 'Data exported',
        message: 'Your personal data has been prepared for sharing.',
        variant: 'success',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('dismissed')) {
        return;
      }
      showToast({
        title: 'Export failed',
        message: 'Unable to export your data right now.',
        variant: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, showToast]);

  return { exportData, isExporting };
}
