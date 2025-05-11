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
    // Filter out empty strings to effectively "delete" them if desired, or store them as is
    // Firestore `merge: true` with `undefined` value for a field will remove it.
    // If we want to store empty strings, then no transformation is needed here.
    // For API keys, an empty string usually means "not set" or "remove existing".
    // Let's ensure `undefined` is passed if a field is truly empty, so `merge` works as expected for removal.
    const dataToSave: Partial<ApiConnection> = {};
    for (const key in validatedFields.data) {
      const typedKey = key as keyof ApiConnectionsFormValues;
      if (validatedFields.data[typedKey] === "") {
        dataToSave[typedKey] = undefined; // This will remove the field if using merge:true
      } else if (validatedFields.data[typedKey] !== undefined) {
        dataToSave[typedKey] = validatedFields.data[typedKey];
      }
    }
    
    await saveApiConnection(userId, dataToSave);
    return { success: true, message: "API connections saved successfully." };
  } catch (error) {
    console.error("Error saving API connections:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { success: false, error: `Failed to save API connections: ${errorMessage}` };
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
