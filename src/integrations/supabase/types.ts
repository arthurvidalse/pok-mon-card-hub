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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          card_number: string | null
          card_type: string | null
          collection_group_id: string | null
          collection_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_target: boolean
          notes: string | null
          pokemon_id: string
          status: Database["public"]["Enums"]["card_status"]
          updated_at: string
        }
        Insert: {
          card_number?: string | null
          card_type?: string | null
          collection_group_id?: string | null
          collection_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_target?: boolean
          notes?: string | null
          pokemon_id: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
        }
        Update: {
          card_number?: string | null
          card_type?: string | null
          collection_group_id?: string | null
          collection_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_target?: boolean
          notes?: string | null
          pokemon_id?: string
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_collection_group_id_fkey"
            columns: ["collection_group_id"]
            isOneToOne: false
            referencedRelation: "collection_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pokemon_id_fkey"
            columns: ["pokemon_id"]
            isOneToOne: false
            referencedRelation: "pokemons"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_groups: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          owned_count: number
          slug: string
          sort_order: number
          total_expected: number
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          owned_count?: number
          slug: string
          sort_order?: number
          total_expected?: number
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          owned_count?: number
          slug?: string
          sort_order?: number
          total_expected?: number
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          code: string | null
          created_at: string
          id: string
          language: string
          name: string
          release_year: number | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          language?: string
          name: string
          release_year?: number | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          language?: string
          name?: string
          release_year?: number | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          card_id: string | null
          id: string
          intent: string | null
          pokemon_id: string | null
          reference_label: string | null
          sent_at: string
          visitor_name: string | null
        }
        Insert: {
          card_id?: string | null
          id?: string
          intent?: string | null
          pokemon_id?: string | null
          reference_label?: string | null
          sent_at?: string
          visitor_name?: string | null
        }
        Update: {
          card_id?: string | null
          id?: string
          intent?: string | null
          pokemon_id?: string | null
          reference_label?: string | null
          sent_at?: string
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_pokemon_id_fkey"
            columns: ["pokemon_id"]
            isOneToOne: false
            referencedRelation: "pokemons"
            referencedColumns: ["id"]
          },
        ]
      }
      pokemons: {
        Row: {
          created_at: string
          dex_number: number
          generation: number | null
          id: string
          name: string
          sprite_url: string | null
        }
        Insert: {
          created_at?: string
          dex_number: number
          generation?: number | null
          id?: string
          name: string
          sprite_url?: string | null
        }
        Update: {
          created_at?: string
          dex_number?: number
          generation?: number | null
          id?: string
          name?: string
          sprite_url?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      card_status: "tenho_full_art" | "tenho_comum" | "nao_tenho"
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
    Enums: {
      app_role: ["admin", "user"],
      card_status: ["tenho_full_art", "tenho_comum", "nao_tenho"],
    },
  },
} as const
