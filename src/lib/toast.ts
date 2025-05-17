import toast from 'react-hot-toast';

export const showSuccessToast = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#4CAF50',
      color: '#fff',
    },
  });
};

export const showErrorToast = (message: string) => {
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#f44336',
      color: '#fff',
    },
  });
};

export const showLoadingToast = (message: string) => {
  return toast.loading(message, {
    position: 'top-right',
    style: {
      background: '#2196F3',
      color: '#fff',
    },
  });
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
}; 