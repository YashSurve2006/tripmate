import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';

export interface PickedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export type DocumentPickerResult = PickedFile;

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

export async function pickImageFromGallery(): Promise<PickedFile | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed to select bills and receipts.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const size = asset.fileSize || 500000;
    if (size > MAX_FILE_SIZE) {
      Alert.alert('File Too Large', 'Please select a bill or receipt smaller than 15MB.');
      return null;
    }

    const filename = asset.fileName || `receipt_${Date.now()}.jpg`;
    return {
      uri: asset.uri,
      name: filename,
      size,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.warn('Error picking image from gallery:', error);
    Alert.alert('Error', 'Could not open photo gallery. Please try again.');
    return null;
  }
}

export async function capturePhotoFromCamera(): Promise<PickedFile | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos of bills and receipts.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const filename = `receipt_camera_${Date.now()}.jpg`;
    return {
      uri: asset.uri,
      name: filename,
      size: asset.fileSize || 500000,
      mimeType: asset.mimeType || 'image/jpeg',
    };
  } catch (error) {
    console.warn('Error launching camera:', error);
    Alert.alert('Error', 'Could not open camera on this device.');
    return null;
  }
}

export async function pickDocumentFile(): Promise<PickedFile | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const doc = result.assets[0];
    const size = doc.size || 200000;
    if (size > MAX_FILE_SIZE) {
      Alert.alert('File Too Large', 'Document size exceeds 15MB limit.');
      return null;
    }

    return {
      uri: doc.uri,
      name: doc.name || `document_${Date.now()}.pdf`,
      size,
      mimeType: doc.mimeType || (doc.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
    };
  } catch (error) {
    console.warn('Error picking document:', error);
    Alert.alert('Error', 'Could not open document picker.');
    return null;
  }
}
