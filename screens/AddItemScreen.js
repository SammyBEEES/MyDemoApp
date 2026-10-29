import { useState } from 'react';
import { View, Text, TextInput, Button, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { addItem } from '../services/inventoryRepo';
import { lookupProduct } from '../services/barcodeLookup';
import BarcodeScanner from '../components/BarcodeScanner';

export default function AddItemScreen({ route, navigation }) {
  const { boxId } = route.params || {};
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      try {
        const dir = FileSystem.documentDirectory + 'images/';
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
        const filename = uri.split('/').pop() || 'img.jpg';
        const dest = dir + Date.now() + '_' + filename;
        await FileSystem.copyAsync({ from: uri, to: dest });
        setImageUri(dest);
      } catch (e) {
        setImageUri(uri);
      }
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      try {
        const dir = FileSystem.documentDirectory + 'images/';
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
        }
        const filename = uri.split('/').pop() || 'photo.jpg';
        const dest = dir + Date.now() + '_' + filename;
        await FileSystem.copyAsync({ from: uri, to: dest });
        setImageUri(dest);
      } catch (e) {
        setImageUri(uri);
      }
    }
  };

  const fillFromBarcode = async (code) => {
    const trimmed = String(code || '').trim();
    if (!trimmed) return;
    setLookingUp(true);
    setLookupStatus('Looking up product...');
    try {
      const product = await lookupProduct(trimmed);
      if (!product) {
        setLookupStatus('No product info found. You can fill in the details manually.');
        return;
      }
      setName((current) => (current.trim() ? current : product.name || ''));
      setDescription((current) => (current.trim() ? current : product.description || ''));
      setCategory((current) => (current.trim() ? current : product.category || ''));
      setImageUri((current) => current || product.imageUrl || null);
      setLookupStatus(product.source ? `Filled in details from ${product.source}.` : 'Filled in details.');
    } catch {
      setLookupStatus('Product lookup failed. You can fill in the details manually.');
    } finally {
      setLookingUp(false);
    }
  };

  const handleScanned = (code) => {
    setBarcode(code);
    setScannerVisible(false);
    fillFromBarcode(code);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a name');
      return;
    }
    try {
      await addItem({
        boxId,
        name: name.trim(),
        description: description.trim(),
        quantity: parseInt(quantity) || 1,
        location: location.trim(),
        category: category.trim(),
        barcode: barcode.trim(),
        imageUri,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save item');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Add Item</Text>
      {boxId ? <Text style={styles.sub}>Adding to box</Text> : null}
      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} multiline />
      <TextInput style={styles.input} placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Location" value={location} onChangeText={setLocation} />
      <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
      <Text style={styles.label}>Barcode</Text>
      <View style={styles.scanRow}>
        <TextInput
          style={[styles.input, styles.flex]}
          placeholder="Barcode / UPC"
          value={barcode}
          onChangeText={setBarcode}
          keyboardType="numeric"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => fillFromBarcode(barcode)}
        />
        <Button title="Scan" onPress={() => setScannerVisible(true)} />
      </View>
      <View style={styles.lookupRow}>
        <Button
          title={lookingUp ? 'Looking up...' : 'Look Up Barcode'}
          onPress={() => fillFromBarcode(barcode)}
          disabled={lookingUp || !barcode.trim()}
        />
      </View>
      {lookupStatus ? <Text style={styles.hint}>{lookupStatus}</Text> : null}
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}
      <View style={styles.row}>
        <Button title="Take Photo" onPress={takePhoto} />
        <Button title="Pick Image" onPress={pickImage} />
      </View>
      <Button title="Save" onPress={save} />
      <BarcodeScanner
        key={scannerVisible ? 'scanner-open' : 'scanner-closed'}
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  sub: { color: '#666', marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10, borderRadius: 4 },
  flex: { flex: 1, marginBottom: 0 },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  lookupRow: { marginBottom: 10 },
  hint: { color: '#666', marginBottom: 10 },
  image: { width: '100%', height: 200, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
});
