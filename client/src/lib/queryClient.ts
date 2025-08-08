import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const isFormData = data instanceof FormData;
  
  console.log('apiRequest called with:', { method, url, isFormData });
  
  try {
    const headers: Record<string, string> = {};
    if (!isFormData && data) {
      headers["Content-Type"] = "application/json";
    }
    
    const requestConfig: RequestInit = {
      method,
      headers,
      body: isFormData ? data : data ? JSON.stringify(data) : undefined,
      credentials: "include",
    };
    
    console.log('Making fetch request with config:', requestConfig);
    
    const res = await fetch(url, requestConfig);
    
    console.log('Fetch response received:', { status: res.status, ok: res.ok, statusText: res.statusText });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error('apiRequest error:', error);
    console.error('Error details:', (error as Error).message);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
