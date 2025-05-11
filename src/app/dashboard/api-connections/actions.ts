
"use server";

import { saveApiConnection, getApiConnection } from "@/lib/firebase/firestore";
import type { ApiConnectionsFormValues } from "./schema";
import { apiConnectionsSchema } from "./schema";
import type { ApiConnection } from "@/lib/types";

export async function saveApiConnectionsAction(userId: string, values: ApiConnectionsFormValues) {
  if (!userId) {
    return { success: false, error: "User not authenticated." };
  }

  const validatedFields = apiConnectionsSchema.safeParse(values);
  if (!validatedFields.success) {
    return { 
      success: false, 
      error: "Invalid input.", 
      issues: validatedFields.error.flatten().fieldErrors 
    };
  }

  try {
    const dataToSave: Partial<ApiConnection> = {};
    for (const key in validatedFields.data) {
      const typedKey = key as keyof ApiConnectionsFormValues;
      if (validatedFields.data[typedKey] === "") {
        dataToSave[typedKey] = undefined; 
      } else if (validatedFields.data[typedKey] !== undefined) {
        dataToSave[typedKey] = validatedFields.data[typedKey];
      }
    }
    
    await saveApiConnection(userId, dataToSave);
    return { success: true, message: "API connections saved successfully." };
  } catch (error) {
    // The error object here is the one thrown by saveApiConnection,
    // which already contains a user-friendly message.
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while saving API connections.";
    // Log the error message that will be shown to the user for server-side tracking.
    console.error("Action error (to be shown in toast for API connections):", errorMessage); 
    return { success: false, error: errorMessage }; // Pass the refined message directly to the toast
  }
}

export async function getApiConnectionsAction(userId: string): Promise<{ data?: ApiConnection, error?: string, success: boolean }> {
  if (!userId) {
    return { error: "User not authenticated.", success: false };
  }
  try {
    const connections = await getApiConnection(userId);
    return { data: connections ?? undefined, success: true };
  } catch (error) {
    console.error("Error fetching API connections:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { error: `Failed to fetch API connections: ${errorMessage}`, success: false };
  }
}
