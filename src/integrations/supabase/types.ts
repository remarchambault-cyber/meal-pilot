export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      manual_calorie_logs: {
        Row: {
          burned_extra_kcal: number
          consumed_manual_kcal: number
          date: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          burned_extra_kcal?: number
          consumed_manual_kcal?: number
          date: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          burned_extra_kcal?: number
          consumed_manual_kcal?: number
          date?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_calorie_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_meals: {
        Row: {
          adjusted_calories: number | null
          adjusted_carbs_g: number | null
          adjusted_fats_g: number | null
          adjusted_protein_g: number | null
          batch_group_id: string | null
          created_at: string
          date: string
          id: string
          is_batch: boolean
          is_consumed: boolean
          meal_type: string
          portions: number
          profile_id: string
          recipe_id: string
          scaling_factor: number
          updated_at: string
        }
        Insert: {
          adjusted_calories?: number | null
          adjusted_carbs_g?: number | null
          adjusted_fats_g?: number | null
          adjusted_protein_g?: number | null
          batch_group_id?: string | null
          created_at?: string
          date: string
          id?: string
          is_batch?: boolean
          is_consumed?: boolean
          meal_type?: string
          portions?: number
          profile_id: string
          recipe_id: string
          scaling_factor?: number
          updated_at?: string
        }
        Update: {
          adjusted_calories?: number | null
          adjusted_carbs_g?: number | null
          adjusted_fats_g?: number | null
          adjusted_protein_g?: number | null
          batch_group_id?: string | null
          created_at?: string
          date?: string
          id?: string
          is_batch?: boolean
          is_consumed?: boolean
          meal_type?: string
          portions?: number
          profile_id?: string
          recipe_id?: string
          scaling_factor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_meals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_meals_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: string
          age: number
          created_at: string
          current_weight_kg: number
          diet_preference: string
          extra_calories_burned: number
          first_name: string
          goal_type: string
          height_cm: number
          id: string
          preferences_json: Json | null
          sex: string
          target_calories: number | null
          target_rate: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_level?: string
          age?: number
          created_at?: string
          current_weight_kg?: number
          diet_preference?: string
          extra_calories_burned?: number
          first_name?: string
          goal_type?: string
          height_cm?: number
          id?: string
          preferences_json?: Json | null
          sex?: string
          target_calories?: number | null
          target_rate?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_level?: string
          age?: number
          created_at?: string
          current_weight_kg?: number
          diet_preference?: string
          extra_calories_burned?: number
          first_name?: string
          goal_type?: string
          height_cm?: number
          id?: string
          preferences_json?: Json | null
          sex?: string
          target_calories?: number | null
          target_rate?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          category: string
          id: string
          ingredient_name: string
          ingredient_normalized_name: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          category?: string
          id?: string
          ingredient_name: string
          ingredient_normalized_name?: string
          quantity?: number
          recipe_id: string
          unit?: string
        }
        Update: {
          category?: string
          id?: string
          ingredient_name?: string
          ingredient_normalized_name?: string
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_steps: {
        Row: {
          id: string
          recipe_id: string
          step_order: number
          step_text: string
        }
        Insert: {
          id?: string
          recipe_id: string
          step_order?: number
          step_text?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          step_order?: number
          step_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_steps_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          base_calories: number
          base_carbs_g: number
          base_fats_g: number
          base_protein_g: number
          created_at: string
          description: string
          diet_tags: string[]
          id: string
          is_system_recipe: boolean
          meal_type: string
          owner_profile_id: string | null
          photo_uri: string | null
          prep_time_min: number
          title: string
          updated_at: string
        }
        Insert: {
          base_calories?: number
          base_carbs_g?: number
          base_fats_g?: number
          base_protein_g?: number
          created_at?: string
          description?: string
          diet_tags?: string[]
          id?: string
          is_system_recipe?: boolean
          meal_type?: string
          owner_profile_id?: string | null
          photo_uri?: string | null
          prep_time_min?: number
          title: string
          updated_at?: string
        }
        Update: {
          base_calories?: number
          base_carbs_g?: number
          base_fats_g?: number
          base_protein_g?: number
          created_at?: string
          description?: string
          diet_tags?: string[]
          id?: string
          is_system_recipe?: boolean
          meal_type?: string
          owner_profile_id?: string | null
          photo_uri?: string | null
          prep_time_min?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          date: string
          id: string
          profile_id: string
          updated_at: string
          weight_kg: number
        }
        Insert: {
          date: string
          id?: string
          profile_id: string
          updated_at?: string
          weight_kg: number
        }
        Update: {
          date?: string
          id?: string
          profile_id?: string
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
