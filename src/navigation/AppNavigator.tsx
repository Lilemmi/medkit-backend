import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../modules/inventory/HomeScreen";
import AddMedicineScreen from "../modules/inventory/AddMedicineScreen";
import ScanScreen from "../modules/camera/ScanScreen";
import MedicineDetailsScreen from "../modules/inventory/MedicineDetailsScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">

        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Семейная аптечка" }}
        />

        <Stack.Screen
          name="Add"
          component={AddMedicineScreen}
          options={{ title: "Добавить лекарство" }}
        />

        <Stack.Screen
          name="Scan"
          component={ScanScreen}
          options={{ title: "Сканирование" }}
        />

        <Stack.Screen
          name="Details"
          component={MedicineDetailsScreen}
          options={{ title: "Лекарство" }}
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}
