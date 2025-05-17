import { toast as reactToast } from 'react-toastify';

export const toast = {
  success: (message: string) => {
    reactToast.success(message);
  },
  error: (message: string) => {
    reactToast.error(message);
  },
  info: (message: string) => {
    reactToast.info(message);
  },
  warning: (message: string) => {
    reactToast.warning(message);
  },
}; 