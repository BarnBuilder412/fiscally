declare module 'expo-image-picker' {
  export const MediaTypeOptions: any;
  export const requestCameraPermissionsAsync: () => Promise<{ granted: boolean }>;
  export const requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  export const launchCameraAsync: (options?: any) => Promise<any>;
  export const launchImageLibraryAsync: (options?: any) => Promise<any>;
}

declare module 'expo-document-picker' {
  export const getDocumentAsync: (options?: any) => Promise<any>;
}

declare module 'expo-location' {
  export enum Accuracy {
    Balanced = 3,
  }
  export const requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  export const getCurrentPositionAsync: (options?: any) => Promise<{ coords: { latitude: number; longitude: number } }>;
  export const reverseGeocodeAsync: (coords: { latitude: number; longitude: number }) => Promise<any[]>;
}

declare module 'react-native-get-sms-android';
