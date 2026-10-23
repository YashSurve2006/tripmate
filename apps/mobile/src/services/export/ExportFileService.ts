import { Platform } from 'react-native';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface FileExportResult {
  success: boolean;
  filePath?: string;
  filename: string;
  error?: string;
}

export class ExportFileService {
  /**
   * Sanitizes a group name into a safe, filesystem-friendly string.
   */
  static sanitizeFilename(groupName: string): string {
    const safeName = groupName
      .trim()
      .replace(/[^a-zA-Z0-9_\-\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');

    const dateStr = new Date().toISOString().split('T')[0];
    return `TripMate_${safeName || 'Group'}_Expense_Report_${dateStr}.xlsx`;
  }

  /**
   * Generates genuine binary Excel file and presents native Android/iOS share sheet or browser download.
   */
  static async exportAndShareWorkbook(
    workbook: XLSX.WorkBook,
    groupName: string
  ): Promise<FileExportResult> {
    const filename = ExportFileService.sanitizeFilename(groupName);

    try {
      if (Platform.OS === 'web') {
        // Direct browser file download for web
        XLSX.writeFile(workbook, filename);
        return {
          success: true,
          filename,
        };
      }

      // 1. Generate Base64 binary xlsx payload
      const base64Data = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
      });

      // 2. Ensure target cache URI
      const targetUri = `${FileSystem.cacheDirectory}${filename}`;

      // 3. Write binary file to device storage
      await FileSystem.writeAsStringAsync(targetUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 4. Verify file was written
      const fileInfo = await FileSystem.getInfoAsync(targetUri);
      if (!fileInfo.exists) {
        throw new Error('Failed to verify written Excel workbook on device storage.');
      }

      // 5. Present native sharing sheet
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: `Share ${filename}`,
          UTI: 'com.microsoft.excel.xlsx',
        });
      }

      return {
        success: true,
        filePath: targetUri,
        filename,
      };
    } catch (err: any) {
      console.error('Failed to export and share Excel workbook:', err);
      return {
        success: false,
        filename,
        error: err?.message || 'An unexpected error occurred while writing or sharing the report.',
      };
    }
  }
}
