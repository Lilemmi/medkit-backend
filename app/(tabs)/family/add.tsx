import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveFamilyMember } from "../../../src/services/family.service";
import { useColors } from "../../../src/theme/colors";
import { useLanguage } from "../../../src/context/LanguageContext";

export default function AddFamilyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [allergies, setAllergies] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert(t("common.error"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.7,
    });

       if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }
  
  

  async function save() {
    if (!name.trim()) {
      alert(t("common.error"));
      return;
    }

    await saveFamilyMember({
      name,
      role,
      birthdate,
      allergies,
      photoUri,
    });

    router.back();
  }

  const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      padding: 20, 
      backgroundColor: colors.background,
      paddingTop: insets.top + 20,
    },

    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 25,
      color: colors.text,
      alignSelf: "center",
    },

    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 17,
      marginBottom: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      color: colors.text,
    },

    photoBox: {
      width: 140,
      height: 140,
      backgroundColor: colors.surface,
      borderRadius: 70,
      alignSelf: "center",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 25,
      borderWidth: 3,
      borderColor: colors.primary,
    },

    photo: {
      width: 140,
      height: 140,
      borderRadius: 70,
    },

    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 10,
    },

    buttonText: {
      color: colors.white,
      fontSize: 19,
      fontWeight: "700",
    },
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{t("family.addMember")}</Text>

      <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{t("family.addPhoto")}</Text>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder={t("family.name")}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={name}
        onChangeText={setName}
      />

      <TextInput
        placeholder={t("family.role")}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={role}
        onChangeText={setRole}
      />

      <TextInput
        placeholder={t("family.birthdate")}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={birthdate}
        onChangeText={setBirthdate}
      />

      <TextInput
        placeholder={t("family.allergies")}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        value={allergies}
        onChangeText={setAllergies}
      />

      <TouchableOpacity style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>{t("family.save")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
