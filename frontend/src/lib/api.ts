import axios from "axios";

// Backend API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies 
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor to handle 403 permission denied errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error || "Permission denied";
      
      // Show notification/toast (you can integrate with a toast library)
      if (typeof window !== "undefined") {
        // Optionally show a toast notification
        console.warn("Permission denied:", errorMessage);
        
        // You can dispatch a custom event or use a toast library here
        // For now, we'll just log it
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

