import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Button, TextInput, Modal } from 'react-native';
import { initDB } from '../db/init';
import { getAllBoxes, addBox } from '../services/inventoryRepo';

export default function BoxesScreen({ navigation }) {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

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

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.item}
      onPress={() => navigation.navigate('BoxItems', { box: item })}
    >
      <Text style={styles.name}>{item.name}</Text>
      {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Button title="Create Box" onPress={() => setModalVisible(true)} />
      {loading ? (
        <Text>Loading...</Text>
      ) : boxes.length === 0 ? (
        <Text style={styles.empty}>No boxes yet. Create one to start adding items.</Text>
      ) : (
        <FlatList data={boxes} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.title}>New Box</Text>
            <TextInput style={styles.input} placeholder="Box name" value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Description (optional)" value={desc} onChangeText={setDesc} />
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  list: { paddingTop: 10 },
  item: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 6, marginBottom: 8 },
  name: { fontSize: 18, fontWeight: 'bold' },
  meta: { color: '#666' },
  empty: { textAlign: 'center', marginTop: 20, color: '#666' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10, borderRadius: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
});
