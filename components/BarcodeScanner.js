import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Button, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

const BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
  'code93',
  'itf14',
  'codabar',
  'qr',
];

export default function BarcodeScanner({ visible, onClose, onScanned }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const lastScan = useRef({ data: null, at: 0 });
  const requestedPermission = useRef(false);

  useEffect(() => {
    if (!visible) {
      requestedPermission.current = false;
      return;
    }
    if (permission && !permission.granted && permission.canAskAgain && !requestedPermission.current) {
      requestedPermission.current = true;
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleScanned = ({ data }) => {
    if (scanned || !data) return;
    const now = Date.now();
    if (lastScan.current.data === data && now - lastScan.current.at < 2000) return;
    lastScan.current = { data, at: now };
    setScanned(true);
    if (onScanned) onScanned(data);
  };

  if (!visible) return null;

  const renderContent = () => {
    if (!permission) {
      return (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.message}>Checking camera permission...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.message}>Camera access is needed to scan barcodes.</Text>
          {permission.canAskAgain ? (
            <Button title="Allow Camera" onPress={requestPermission} />
          ) : (
            <Text style={styles.message}>Enable camera access in system settings.</Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={scanned ? undefined : handleScanned}
        />
        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.hint}>
            {scanned ? 'Barcode captured' : 'Point the camera at a barcode'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Barcode</Text>
          <Button title="Close" onPress={onClose} />
        </View>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#fff',
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  message: { textAlign: 'center', marginVertical: 12, color: '#333' },
  cameraWrap: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: '75%',
    height: 180,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hint: { color: '#fff', marginTop: 16, fontSize: 16, textAlign: 'center' },
});
