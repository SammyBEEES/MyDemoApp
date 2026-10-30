import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Button, ActivityIndicator, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <ActivityIndicator color={colors.primary} />
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
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.title}>Scan Barcode</Text>
          <Button title="Close" onPress={onClose} />
        </View>
        {renderContent()}
      </View>
    </Modal>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    message: { textAlign: 'center', marginVertical: 12, color: colors.muted },
    cameraWrap: { flex: 1, backgroundColor: '#000' },
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
