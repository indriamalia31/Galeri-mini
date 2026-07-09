import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Alert, 
  SafeAreaView, 
  StatusBar,
  Dimensions,
  Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function App() {
  const [photos, setPhotos] = useState([]);
  const [showPriming, setShowPriming] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'camera' atau 'gallery'

  // Fungsi pengecekan izin internal
  const checkAndRequestPermissions = async () => {
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
    const libraryStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
    const locationStatus = await Location.getForegroundPermissionsAsync();

    // Jika ada salah satu izin yang belum diberikan, tampilkan Priming Screen dahulu
    if (
      cameraStatus.status !== 'granted' || 
      libraryStatus.status !== 'granted' || 
      locationStatus.status !== 'granted'
    ) {
      return false;
    }
    return true;
  };

  // Trigger ketika user menekan tombol tambah foto
  const handleAddPhotoPress = async (actionType) => {
    const hasPermission = await checkAndRequestPermissions();
    if (hasPermission) {
      // Jika izin sudah aman, langsung eksekusi
      if (actionType === 'camera') pickFromCamera();
      if (actionType === 'gallery') pickFromGallery();
    } else {
      // Jika belum ada izin, simpan aksi yang tertunda dan munculkan Priming Screen
      setPendingAction(actionType);
      setShowPriming(true);
    }
  };

  // Dieksekusi dari dalam Priming Screen (Layar Edukasi)
  const grantSystemPermissions = async () => {
    setShowPriming(false);
    
    const cameraReq = await ImagePicker.requestCameraPermissionsAsync();
    const libraryReq = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const locationReq = await Location.requestForegroundPermissionsAsync();

    if (
      cameraReq.status === 'granted' && 
      libraryReq.status === 'granted' && 
      locationReq.status === 'granted'
    ) {
      // Jalankan aksi yang sempat tertunda
      if (pendingAction === 'camera') pickFromCamera();
      if (pendingAction === 'gallery') pickFromGallery();
    } else {
      Alert.alert(
        'Akses Ditolak',
        'Aplikasi memerlukan izin native untuk menyusun galeri estetik beserta lokasinya.',
        [
          { text: 'Buka Pengaturan', onPress: () => Location.openSettingLinkAsync().catch(() => Alert.alert('Error', 'Gagal membuka pengaturan.')) },
          { text: 'Batal', style: 'cancel' }
        ]
      );
    }
    setPendingAction(null);
  };

  // LEVEL 3 BONUS: Ambil koordinat GPS DAN ubah jadi Nama Tempat (Reverse Geocoding)
  const getLocationAndAddress = async () => {
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let latitude = location.coords.latitude;
      let longitude = location.coords.longitude;

      // Reverse Geocoding
      let reverseGeo = await Location.reverseGeocodeAsync({ latitude, longitude });
      let addressString = "Lokasi Tidak Diketahui";
      
      if (reverseGeo && reverseGeo.length > 0) {
        const place = reverseGeo[0];
        // Menyusun nama tempat misal: "Medan, North Sumatra" atau nama jalan
        addressString = `${place.city || place.subregion || ''}, ${place.region || ''}`.trim();
        if (addressString.startsWith(',')) addressString = addressString.substring(1).trim();
      }

      return {
        coords: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        address: addressString || "Lokasi Misterius"
      };
    } catch (error) {
      return { coords: "0.0000, 0.0000", address: "Gagal memuat lokasi" };
    }
  };

  // Mengambil foto dari Kamera
  const pickFromCamera = async () => {
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const locationInfo = await getLocationAndAddress();
      const newPhoto = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        date: new Date().toLocaleDateString('id-ID'),
        location: locationInfo
      };
      setPhotos([newPhoto, ...photos]);
    }
  };

  // Mengambil foto dari Galeri HP
  const pickFromGallery = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const locationInfo = await getLocationAndAddress();
      const newPhoto = {
        id: Date.now().toString(),
        uri: result.assets[0].uri,
        date: new Date().toLocaleDateString('id-ID'),
        location: locationInfo
      };
      setPhotos([newPhoto, ...photos]);
    }
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      'Tambah Karya Foto',
      'Silakan pilih sumber media penangkapan gambar:',
      [
        { text: '📸 Kamera', onPress: () => handleAddPhotoPress('camera') },
        { text: '🖼️ Galeri HP', onPress: () => handleAddPhotoPress('gallery') },
        { text: 'Batal', style: 'cancel' }
      ]
    );
  };

  // LEVEL 3 BONUS: Fitur Hapus Foto Individu
  const deletePhoto = (id) => {
    Alert.alert(
      'Hapus Foto', 
      'Apakah kamu yakin ingin melenyapkan foto ini dari galeri estetikmu?', 
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive', 
          onPress: () => setPhotos(photos.filter(photo => photo.id !== id)) 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aesthetic Gallery</Text>
        <Text style={styles.headerSubtitle}>Sistem Informasi • Native App v2</Text>
      </View>

      {/* Grid Multi-Foto via FlatList */}
      {photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#333333" />
          <Text style={styles.emptyText}>Belum ada memori yang diabadikan.</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.uri }} style={styles.image} />
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => deletePhoto(item.id)}
              >
                <Ionicons name="trash-outline" size={14} color="#FFF" />
              </TouchableOpacity>
              <View style={styles.cardInfo}>
                <Text style={styles.dateText}>{item.date}</Text>
                <Text style={styles.addressText} numberOfLines={1}>
                  📍 {item.location.address}
                </Text>
                <Text style={styles.coordsText}>{item.location.coords}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={showImageSourceOptions}>
        <Ionicons name="add" size={32} color="#FFF" />
      </TouchableOpacity>

      {/* LEVEL 3 BONUS: MODAL PRIMING SCREEN (Edukasi UX Izin) */}
      <Modal visible={showPriming} animationType="slide" transparent={true}>
        <View style={styles.primingOverlay}>
          <View style={styles.primingContainer}>
            <Ionicons name="shield-checkmark-outline" size={60} color="#007AFF" />
            <Text style={styles.primingTitle}>Izin Akses Hardware</Text>
            <Text style={styles.primingDesc}>
              Aesthetic Gallery memerlukan akses ke Kamera, Galeri Foto, dan GPS handphone-mu untuk dapat menangkap gambar, menyimpan memori, dan menandai lokasi secara otomatis.
            </Text>
            <TouchableOpacity style={styles.primingButton} onPress={grantSystemPermissions}>
              <Text style={styles.primingButtonText}>Saya Mengerti & Izinkan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primingCancel} onPress={() => setShowPriming(false)}>
              <Text style={styles.primingCancelText}>Nanti Saja</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A', // Ultra dark theme
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContainer: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#444444',
    marginTop: 15,
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#121212',
    width: (width - 30) / 2,
    margin: 5,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 2,
    borderColor: '#1C1C1E',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 170,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.85)',
    padding: 6,
    borderRadius: 50,
  },
  cardInfo: {
    padding: 12,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addressText: {
    color: '#E5E5EA',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
  },
  coordsText: {
    color: '#666666',
    fontSize: 9,
    marginTop: 2,
    fontFamily: 'Platform' ? 'monospace' : 'Courier',
  },
  fab: {
    position: 'absolute',
    right: 25,
    bottom: 35,
    backgroundColor: '#007AFF',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  // Style khusus Priming Screen
  primingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  primingContainer: {
    backgroundColor: '#1C1C1E',
    width: '100%',
    borderRadius: 24,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  primingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 15,
    marginBottom: 10,
  },
  primingDesc: {
    color: '#AEAEB2',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  primingButton: {
    backgroundColor: '#007AFF',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primingButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primingCancel: {
    paddingVertical: 10,
  },
  primingCancelText: {
    color: '#666',
    fontSize: 14,
  },
});