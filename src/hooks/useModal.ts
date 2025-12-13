import { useState } from "react";

interface ModalState {
  visible: boolean;
  title: string;
  message: string;
  buttons?: {
    text: string;
    onPress: () => void;
    style?: "default" | "primary" | "cancel" | "destructive";
  }[];
}

export function useModal() {
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: "",
    message: "",
  });

  const showModal = (title: string, message: string, buttons?: ModalState["buttons"]) => {
    setModal({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const hideModal = () => {
    setModal({
      visible: false,
      title: "",
      message: "",
    });
  };

  return {
    modal,
    showModal,
    hideModal,
  };
}

