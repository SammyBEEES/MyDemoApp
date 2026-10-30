import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button, TextInput, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDB } from '../db/init';
import { getAllBoxes, addBox } from '../services/inventoryRepo';
import { importEbayListingsToUnsorted } from '../services/ebayImport';
import { useTheme } from '../theme/ThemeProvider';

export default function BoxesScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [importing, setImporting] = useState(false);

  const load = async () => {
    try {
      await initDB();
      const data = await getAllBoxes();
      setBoxes(data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation]);

  const createBox = async () => {
    if (!name.trim()) return;
    try {
      await addBox({ name: name.trim(), description: desc.trim() });
      setName('');
      setDesc('');
      setModalVisible(false);
      load();
    } catch (e) {
      console.log(e);
    }
  };

  const importEbay = async () => {
    if (importing) return;
    setImporting(true);
    try {
      const result = await importEbayListingsToUnsorted();
      if (result.total === 0) {
        Alert.alert('No listings', 'No active eBay listings were found.');
      } else {
        const skipped = result.skipped ? ` ${result.skipped} already imported.` : '';
        Alert.alert('Imported', `${result.imported} item(s) added to "${result.box.name}".${skipped}`);
      }
      await load();
    } catch {
      Alert.alert('eBay import failed', 'Make sure the eBay proxy is running and reachable.');
    } finally {
      setImporting(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.75}
      onPress={() => navigation.navigate('BoxItems', { box: item })}
    >
      <Text style={styles.name}>{item.name}</Text>
      {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <Button title="Create Box" onPress={() => setModalVisible(true)} />
          </View>
          <View style={styles.actionButton}>
            <Button
              title={importing ? 'Importing...' : 'Import eBay'}
              onPress={importEbay}
              disabled={importing}
            />
          </View>
          <View style={styles.actionButton}>
            <Button
              title="eBay Sales Orders"
              onPress={() => navigation.navigate('CompletedOrders')}
            />
          </View>
          <View style={styles.actionButton}>
            <Button
              title="Purchases"
              onPress={() => navigation.navigate('Purchases')}
            />
          </View>
        </View>
      </View>
      {loading ? (
        <Text style={styles.message}>Loading...</Text>
      ) : boxes.length === 0 ? (
        <Text style={styles.empty}>No boxes yet. Create one to start adding items.</Text>
      ) : (
        <FlatList
          data={boxes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.title}>New Box</Text>
            <TextInput
              style={styles.input}
              placeholder="Box name"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Description (optional)"
              placeholderTextColor={colors.muted}
              value={desc}
              onChangeText={setDesc}
            />
            <View style={styles.row}>
              <Button title="Cancel" onPress={() => setModalVisible(false)} />
              <Button title="Create" onPress={createBox} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 12 },
    actions: { flexDirection: 'row', gap: 10 },
    actionButton: { flex: 1 },
    list: { paddingHorizontal: 16, paddingTop: 12 },
    item: {
      backgroundColor: colors.card,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    name: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
    meta: { color: colors.muted, fontSize: 14 },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: 24, marginHorizontal: 24, color: colors.muted },
    modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 },
    modal: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      padding: 10,
      marginBottom: 10,
      borderRadius: 8,
    },
    row: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  });
