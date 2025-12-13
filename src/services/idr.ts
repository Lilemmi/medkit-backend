import axios from "axios";

const BASE_URL = "https://israeldrugs.health.gov.il/GovServiceList/IDRServer/";

class IDRService {
  private request = async (action: string, data: any = {}) => {
    try {
      const response = await axios.post(BASE_URL + action, data, {
        headers: { "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error: any) {
      console.log("IDR API ERROR:", error?.response || error);
      throw error;
    }
  };

  // 🔍 Поиск по штрих-коду
  searchByBarcode(barcode: string) {
    return this.request("SearchByBarcode", {
      barcode,
      prescription: false,
    });
  }

  // 🔍 Поиск по названию
  searchByName(
    query: string,
    prescription = false,
    healthServices = false,
    pageIndex = 0,
    orderBy = 0
  ) {
    return this.request("SearchByName", {
      val: query,
      prescription: prescription,
      healthServices: healthServices,
      pageIndex: pageIndex,
      orderBy: orderBy,
    });
  }

  // 🔍 Автокомплит
  autocomplete(query: string) {
    return this.request("SearchBoxAutocomplete", {
      val: query,
      isSearchTradeName: true,
      isSearchTradeMarkiv: false,
    });
  }

  // 🧬 Получить полную инструкцию препарата
  getSpecificDrug(registrationNumber: string) {
    return this.request("GetSpecificDrug", {
      dragRegNum: registrationNumber,
    });
  }

  // 🌡 Поиск по симптомам
  searchBySymptom(primary: number, secondary: number, pageIndex = 0) {
    return this.request("SearchBySymptom", {
      primarySymp: primary,
      secondarySymp: secondary,
      healthServices: false,
      pageIndex,
      prescription: true,
      orderBy: 0,
    });
  }

  // 📚 Категории
  getMatanList() {
    return this.request("GetMatanList");
  }

  getPackageList() {
    return this.request("GetPackageList");
  }

  getAtcList() {
    return this.request("GetAtcList");
  }

  // 🔍 Поиск дженериков
  searchGeneric(
    val = "",
    name = "",
    matanId = 0,
    packageId = 0,
    atcId = 0,
    pageIndex = 0,
    orderBy = 0
  ) {
    return this.request("SearchGeneric", {
      val,
      name,
      matanId,
      packageId,
      atcId,
      pageIndex,
      orderBy,
    });
  }
}

export const IDR = new IDRService();



