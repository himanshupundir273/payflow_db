import { showErrorToast } from './toast';

export const checkNetworkConnection = async (): Promise<boolean> => {
  try {
    // const response = await fetch('https://www.google.com', { mode: 'no-cors' });
    return true;
  } catch (error) {
    showErrorToast('No internet connection. Please check your network and try again.');
    return false;
  }
};

export const withNetworkCheck = async <T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Operation failed due to network issues'
): Promise<T | null> => {
  if (!await checkNetworkConnection()) {
    return null;
  }
  
  try {
    return await operation();
  } catch (error) {
    showErrorToast(errorMessage);
    return null;
  }
}; 