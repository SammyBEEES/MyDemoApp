import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Button, StyleSheet, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDB } from '../db/init';
import { getItemsByBoxId, getAllBoxes, moveAllItemsFromBox } from '../services/inventoryRepo';
import { useTheme } from '../theme/ThemeProvider';

export default function BoxItemsScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { box } = route.params || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [boxes, setBoxes] = useState([]);

  const load = async () => {
    try {
      await initDB();
      if (box?.id) {
        const data = await getItemsByBoxId(box.id);
        setItems(data || []);
      }
      const allBoxes = await getAllBoxes();
      setBoxes((allBoxes || []).filter((b) => b.id !== box?.id));
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

  const moveAll = async (targetBox) => {
    try {
      await moveAllItemsFromBox(box?.id, targetBox.id);
      setModalVisible(false);
      Alert.alert('Moved', `All items moved to ${targetBox.name}`);
      load();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to move items');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.75}
      onPress={() => navigation.navigate('ItemDetail', { item })}
    >
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.thumb} />
      ) : (
        <View style={styles.thumbPlaceholder} />
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>Qty: {item.quantity}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <Button
              title="Add Item to this Box"
              onPress={() => navigation.navigate('AddItem', { boxId: box?.id })}
            />
          </View>
        </View>
        {items.length > 0 ? (
          <View style={styles.actions}>
            <View style={styles.actionButton}>
              <Button title="Move all items" onPress={() => setModalVisible(true)} />
            </View>
          </View>
        ) : null}
      </View>
      {loading ? (
        <Text style={styles.message}>Loading...</Text>
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No items in this box yet.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.title}>Move all items to</Text>
            {boxes.length === 0 ? (
              <Text style={styles.empty}>No other boxes. Create one first.</Text>
            ) : (
              <FlatList
                data={boxes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.boxItem}
                    activeOpacity={0.75}
                    onPress={() => moveAll(item)}
                  >
                    <Text style={styles.name}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <Button title="Cancel" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
    actions: { flexDirection: 'row', gap: 10 },
    actionButton: { flex: 1 },
    list: { paddingHorizontal: 16, paddingTop: 12 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    thumb: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
    thumbPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 12,
      backgroundColor: colors.thumb,
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: colors.text },
    meta: { color: colors.muted, marginTop: 2 },
    message: { color: colors.muted, marginTop: 20, textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: 24, marginHorizontal: 24, color: colors.muted },
    modalBg: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 20 },
    modal: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      maxHeight: '60%',
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
    boxItem: {
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      marginBottom: 8,
      backgroundColor: colors.cardAlt,
    },
  });
