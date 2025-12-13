// Redirect to add screen with id parameter
import { Redirect, useLocalSearchParams } from "expo-router";

export default function EditDoctorScreen() {
  const params = useLocalSearchParams();
  return <Redirect href={`/(tabs)/more/doctors/add?id=${params.id}`} />;
}

