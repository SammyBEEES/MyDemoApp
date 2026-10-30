import { useMemo, useState } from 'react';
import { View, Text, TextInput, Button, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addItem, addPurchase } from '../services/inventoryRepo';
import { lookupProduct } from '../services/barcodeLookup';
import BarcodeScanner from '../components/BarcodeScanner';
import { useTheme } from '../theme/ThemeProvider';

export default function AddItemScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [shippingStatus, setShippingStatus] = useState('pending');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState('1');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');

  const SHIPPING_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
  ];

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

  const save = async (stay = false) => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a name');
      return;
    }
    try {
      const itemId = await addItem({
        boxId,
        name: name.trim(),
        description: description.trim(),
        quantity: parseInt(quantity) || 1,
        location: location.trim(),
        category: category.trim(),
        barcode: barcode.trim(),
        imageUri,
        shippingStatus,
      });

      const cost = parseFloat(purchaseCost);
      if (!isNaN(cost) && cost > 0) {
        await addPurchase({
          itemId,
          cost,
          quantity: parseInt(purchaseQuantity) || 1,
          purchaseDate: purchaseDate || Date.now(),
          supplier: supplier.trim() || null,
          notes: purchaseNotes.trim() || null,
        });
      }

      if (stay) {
        resetForm();
        return;
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setQuantity('1');
    setLocation('');
    setCategory('');
    setBarcode('');
    setImageUri(null);
    setShippingStatus('pending');
    setLookupStatus('');
    setPurchaseCost('');
    setPurchaseQuantity('1');
    setSupplier('');
    setPurchaseDate('');
    setPurchaseNotes('');
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Add Item</Text>
      {boxId ? <Text style={styles.sub}>Adding to box</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Name"
        placeholderTextColor={colors.muted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Description"
        placeholderTextColor={colors.muted}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Quantity"
        placeholderTextColor={colors.muted}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Location"
        placeholderTextColor={colors.muted}
        value={location}
        onChangeText={setLocation}
      />
      <TextInput
        style={styles.input}
        placeholder="Category"
        placeholderTextColor={colors.muted}
        value={category}
        onChangeText={setCategory}
      />
      <Text style={styles.label}>Shipping Status</Text>
      <View style={styles.statusRow}>
        {SHIPPING_STATUSES.map((s) => (
          <Button
            key={s.value}
            title={s.label}
            onPress={() => setShippingStatus(s.value)}
            color={shippingStatus === s.value ? colors.primary : undefined}
          />
        ))}
      </View>
      <Text style={styles.label}>Purchase Cost (total)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 2000"
        placeholderTextColor={colors.muted}
        value={purchaseCost}
        onChangeText={setPurchaseCost}
        keyboardType="numeric"
      />
      <Text style={styles.label}>Purchase Quantity (units)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 50"
        placeholderTextColor={colors.muted}
        value={purchaseQuantity}
        onChangeText={setPurchaseQuantity}
        keyboardType="numeric"
      />
      <Text style={styles.label}>Supplier</Text>
      <TextInput
        style={styles.input}
        placeholder="Supplier (optional)"
        placeholderTextColor={colors.muted}
        value={supplier}
        onChangeText={setSupplier}
      />
      <Text style={styles.label}>Purchase Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD (optional)"
        placeholderTextColor={colors.muted}
        value={purchaseDate}
        onChangeText={setPurchaseDate}
      />
      <Text style={styles.label}>Purchase Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.muted}
        value={purchaseNotes}
        onChangeText={setPurchaseNotes}
        multiline
      />
      <Text style={styles.label}>Barcode</Text>
      <View style={styles.scanRow}>
        <TextInput
          style={[styles.input, styles.flex, styles.scanInput]}
          placeholder="Barcode / UPC"
          placeholderTextColor={colors.muted}
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
      <View style={styles.saveRow}>
        <Button title="Save" onPress={() => save(false)} />
        <Button title="Save & Add Another" onPress={() => save(true)} />
      </View>
      <BarcodeScanner
        key={scannerVisible ? 'scanner-open' : 'scanner-closed'}
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleScanned}
      />
    </ScrollView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { padding: 16, backgroundColor: colors.background },
    title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 },
    sub: { color: colors.muted, marginBottom: 12 },
    label: { fontWeight: '600', color: colors.text, marginBottom: 6 },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      padding: 10,
      marginBottom: 10,
      borderRadius: 8,
    },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    flex: { flex: 1, marginBottom: 0 },
    scanRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    scanInput: { marginRight: 0 },
    lookupRow: { marginBottom: 10 },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    hint: { color: colors.muted, marginBottom: 10 },
    image: { width: '100%', height: 200, marginBottom: 10, borderRadius: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
    saveRow: { marginTop: 8 },
  });
