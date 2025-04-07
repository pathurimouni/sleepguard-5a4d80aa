export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_models: {
        Row: {
          accuracy: number
          architecture: string
          created_at: string
          description: string | null
          file_path: string
          file_size: number
          id: string
          is_active: boolean
          model_type: string
          name: string
          parameters: number
          status: string
          trained_by: string
          training_dataset_id: string | null
          training_time: number | null
          validation_results: Json | null
        }
        Insert: {
          accuracy: number
          architecture: string
          created_at?: string
          description?: string | null
          file_path: string
          file_size: number
          id?: string
          is_active?: boolean
          model_type: string
          name: string
          parameters: number
          status: string
          trained_by: string
          training_dataset_id?: string | null
          training_time?: number | null
          validation_results?: Json | null
        }
        Update: {
          accuracy?: number
          architecture?: string
          created_at?: string
          description?: string | null
          file_path?: string
          file_size?: number
          id?: string
          is_active?: boolean
          model_type?: string
          name?: string
          parameters?: number
          status?: string
          trained_by?: string
          training_dataset_id?: string | null
          training_time?: number | null
          validation_results?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_training_dataset_id_fkey"
            columns: ["training_dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      apnea_analysis: {
        Row: {
          analysis_date: string
          confidence: number
          events_per_hour: number | null
          id: string
          is_apnea: boolean
          recording_id: string
          severity: string | null
        }
        Insert: {
          analysis_date?: string
          confidence: number
          events_per_hour?: number | null
          id?: string
          is_apnea: boolean
          recording_id: string
          severity?: string | null
        }
        Update: {
          analysis_date?: string
          confidence?: number
          events_per_hour?: number | null
          id?: string
          is_apnea?: boolean
          recording_id?: string
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apnea_analysis_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "breathing_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      breathing_recordings: {
        Row: {
          analysis_complete: boolean
          duration: number
          id: string
          recording_date: string
          recording_file_path: string
          user_id: string
        }
        Insert: {
          analysis_complete?: boolean
          duration: number
          id?: string
          recording_date?: string
          recording_file_path: string
          user_id: string
        }
        Update: {
          analysis_complete?: boolean
          duration?: number
          id?: string
          recording_date?: string
          recording_file_path?: string
          user_id?: string
        }
        Relationships: []
      }
      detection_events: {
        Row: {
          confidence: number
          duration: number
          feature_data: Json | null
          id: string
          label: string
          session_id: string
          timestamp: string
        }
        Insert: {
          confidence: number
          duration?: number
          feature_data?: Json | null
          id?: string
          label: string
          session_id: string
          timestamp?: string
        }
        Update: {
          confidence?: number
          duration?: number
          feature_data?: Json | null
          id?: string
          label?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "detection_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "detection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_sessions: {
        Row: {
          apnea_count: number
          average_confidence: number
          duration: number | null
          end_time: string | null
          id: string
          normal_count: number
          notes: string | null
          severity_score: number
          start_time: string
          user_id: string
        }
        Insert: {
          apnea_count?: number
          average_confidence?: number
          duration?: number | null
          end_time?: string | null
          id?: string
          normal_count?: number
          notes?: string | null
          severity_score?: number
          start_time?: string
          user_id: string
        }
        Update: {
          apnea_count?: number
          average_confidence?: number
          duration?: number | null
          end_time?: string | null
          id?: string
          normal_count?: number
          notes?: string | null
          severity_score?: number
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      training_datasets: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_public: boolean
          labels: Json
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_public?: boolean
          labels?: Json
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_public?: boolean
          labels?: Json
          name?: string
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
        Args: { user_id: string; role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
