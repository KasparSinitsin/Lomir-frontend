import React, { createContext, useContext, useRef, useState } from "react";
import ScreenAlert from "../components/common/ScreenAlert";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null); // { message, id, type }
  const idRef = useRef(0);

  const showToast = (message, type = "success") => {
    setToast({ message, id: ++idRef.current, type });
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ScreenAlert
        alerts={[
          toast && {
            type: toast.type,
            message: toast.message,
            onClose: () => setToast(null),
            successId: toast.id,
          },
        ]}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
