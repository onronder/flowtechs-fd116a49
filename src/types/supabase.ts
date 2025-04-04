export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id: string
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dataset_execution_results: {
        Row: {
          created_at: string | null
          execution_id: string
          id: string
          results: Json
        }
        Insert: {
          created_at?: string | null
          execution_id: string
          id?: string
          results: Json
        }
        Update: {
          created_at?: string | null
          execution_id?: string
          id?: string
          results?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dataset_execution_results_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dataset_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_executions: {
        Row: {
          api_call_count: number | null
          created_at: string | null
          data: Json | null
          dataset_id: string
          end_time: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          metadata: Json | null
          row_count: number | null
          start_time: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_call_count?: number | null
          created_at?: string | null
          data?: Json | null
          dataset_id: string
          end_time?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          row_count?: number | null
          start_time?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_call_count?: number | null
          created_at?: string | null
          data?: Json | null
          dataset_id?: string
          end_time?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          metadata?: Json | null
          row_count?: number | null
          start_time?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_executions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "user_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_job_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          dataset_id: string
          error_message: string | null
          id: string
          max_retries: number | null
          priority: number | null
          retry_count: number | null
          schedule_id: string | null
          scheduled_time: string
          started_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          dataset_id: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_time: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          dataset_id?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          priority?: number | null
          retry_count?: number | null
          schedule_id?: string | null
          scheduled_time?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_job_queue_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "user_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dataset_job_queue_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "dataset_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_schedules: {
        Row: {
          created_at: string | null
          cron_expression: string
          dataset_id: string
          id: string
          is_active: boolean | null
          next_run_time: string | null
          parameters: Json | null
          schedule_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cron_expression: string
          dataset_id: string
          id?: string
          is_active?: boolean | null
          next_run_time?: string | null
          parameters?: Json | null
          schedule_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cron_expression?: string
          dataset_id?: string
          id?: string
          is_active?: boolean | null
          next_run_time?: string | null
          parameters?: Json | null
          schedule_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_schedules_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "user_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dependent_query_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          id_path: string
          is_active: boolean | null
          merge_strategy: string
          name: string
          primary_query: string
          secondary_query: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          id_path: string
          is_active?: boolean | null
          merge_strategy: string
          name: string
          primary_query: string
          secondary_query: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          id_path?: string
          is_active?: boolean | null
          merge_strategy?: string
          name?: string
          primary_query?: string
          secondary_query?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      query_templates: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          field_list: Json | null
          id: string
          is_active: boolean | null
          name: string
          query_template: string
          resource_type: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          field_list?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          query_template: string
          resource_type: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          field_list?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          query_template?: string
          resource_type?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      source_schemas: {
        Row: {
          api_version: string
          created_at: string | null
          processed_schema: Json | null
          schema: Json
          source_id: string
        }
        Insert: {
          api_version: string
          created_at?: string | null
          processed_schema?: Json | null
          schema: Json
          source_id: string
        }
        Update: {
          api_version?: string
          created_at?: string | null
          processed_schema?: Json | null
          schema?: Json
          source_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_schemas_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          config: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_validated_at: string | null
          name: string
          source_type: Database["public"]["Enums"]["source_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_validated_at?: string | null
          name: string
          source_type: Database["public"]["Enums"]["source_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_validated_at?: string | null
          name?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_datasets: {
        Row: {
          created_at: string | null
          custom_fields: Json | null
          custom_query: string | null
          dataset_type: string
          description: string | null
          id: string
          name: string
          parameters: Json | null
          source_id: string
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_fields?: Json | null
          custom_query?: string | null
          dataset_type: string
          description?: string | null
          id?: string
          name: string
          parameters?: Json | null
          source_id: string
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          custom_fields?: Json | null
          custom_query?: string | null
          dataset_type?: string
          description?: string | null
          id?: string
          name?: string
          parameters?: Json | null
          source_id?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_datasets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      user_storage_exports: {
        Row: {
          created_at: string | null
          dataset_id: string | null
          execution_id: string
          file_name: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string | null
          format: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dataset_id?: string | null
          execution_id: string
          file_name?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          format: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          dataset_id?: string | null
          execution_id?: string
          file_name?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          format?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_storage_exports_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dataset_executions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_dataset_cascade: {
        Args: {
          p_dataset_id: string
        }
        Returns: boolean
      }
      get_execution_raw_data: {
        Args: {
          p_execution_id: string
          p_user_id: string
        }
        Returns: Json
      }
      insert_source: {
        Args: {
          p_name: string
          p_description: string
          p_source_type: string
          p_config: Json
        }
        Returns: Json
      }
      update_source: {
        Args: {
          p_id: string
          p_name: string
          p_description: string
          p_config: Json
        }
        Returns: Json
      }
    }
    Enums: {
      source_type: "shopify" | "woocommerce" | "ftp_sftp" | "custom_api"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
