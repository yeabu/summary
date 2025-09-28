import useAuthStore from "@/auth/AuthStore";
import { API_URL } from "@/config";

function useApiClient() {
    const token  = useAuthStore().token; // Updated!
    const apiUrl = API_URL;
    const invokeMethod = async <T>(
        serviceName: string,
        methodName: string,
        params: any
    ): Promise<T> => {
        if (!token) {
            throw new Error('No authentication token found. User may not be logged in.');
        }

        const body = JSON.stringify({
            serviceName,
            methodName,
            parameters: Array.isArray(params) ? params : [params]
        });

        console.log('Calling API with body:', body);

        const response = await fetch(`${apiUrl}/api/ServiceInvoker/InvokeServiceMethod`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: body
        });

        if (!response.ok) {
            throw new Error(`Error with status code: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
    };

    return { invokeMethod };
}

export default useApiClient;
