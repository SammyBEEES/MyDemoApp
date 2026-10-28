import { useState } from 'react';
import { View, Text, TextInput, Button, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { addItem } from '../services/inventoryRepo';

export default function AddItemScreen({ route, navigation }) {
  const { boxId } = route.params || {};
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [imageUri, setImageUri] = useState(null);

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
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}
      <View style={styles.row}>
        <Button title="Take Photo" onPress={takePhoto} />
        <Button title="Pick Image" onPress={pickImage} />
      </View>
      <Button title="Save" onPress={save} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  sub: { color: '#666', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10, borderRadius: 4 },
  image: { width: '100%', height: 200, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 },
});
