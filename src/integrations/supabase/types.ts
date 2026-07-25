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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      applications: {
        Row: {
          boost_count: number
          cover_letter: string | null
          created_at: string
          id: string
          prestataire_id: string
          project_id: string
          refunded_at: string | null
          status: string
          token_cost: number
        }
        Insert: {
          boost_count?: number
          cover_letter?: string | null
          created_at?: string
          id?: string
          prestataire_id: string
          project_id: string
          refunded_at?: string | null
          status?: string
          token_cost?: number
        }
        Update: {
          boost_count?: number
          cover_letter?: string | null
          created_at?: string
          id?: string
          prestataire_id?: string
          project_id?: string
          refunded_at?: string | null
          status?: string
          token_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      diplomas: {
        Row: {
          badge_color: string
          created_at: string
          document_path: string | null
          document_url: string | null
          id: string
          institution: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          year: number | null
        }
        Insert: {
          badge_color?: string
          created_at?: string
          document_path?: string | null
          document_url?: string | null
          id?: string
          institution?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          year?: number | null
        }
        Update: {
          badge_color?: string
          created_at?: string
          document_path?: string | null
          document_url?: string | null
          id?: string
          institution?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          created_at: string
          document_path: string
          document_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_path: string
          document_url: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_path?: string
          document_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string | null
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id?: string | null
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_published: boolean
          kyc_status: string
          name: string
          phone: string | null
          provider_category: string | null
          published_at: string | null
          published_until: string | null
          suspended: boolean
          visibility_status: string
          visibility_until: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_published?: boolean
          kyc_status?: string
          name: string
          phone?: string | null
          provider_category?: string | null
          published_at?: string | null
          published_until?: string | null
          suspended?: boolean
          visibility_status?: string
          visibility_until?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_published?: boolean
          kyc_status?: string
          name?: string
          phone?: string | null
          provider_category?: string | null
          published_at?: string | null
          published_until?: string | null
          suspended?: boolean
          visibility_status?: string
          visibility_until?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          budget: number | null
          category: string | null
          city: string | null
          client_id: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          selected_at: string | null
          selected_provider_id: string | null
          status: string
          title: string
        }
        Insert: {
          budget?: number | null
          category?: string | null
          city?: string | null
          client_id: string
          created_at?: string
          description: string
          expires_at?: string | null
          id?: string
          selected_at?: string | null
          selected_provider_id?: string | null
          status?: string
          title: string
        }
        Update: {
          budget?: number | null
          category?: string | null
          city?: string | null
          client_id?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          selected_at?: string | null
          selected_provider_id?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          provider_id: string
          rating: number
          updated_at: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          price: number | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          price?: number | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      token_payments: {
        Row: {
          amount_xaf: number
          created_at: string
          credited_at: string | null
          external_id: string | null
          fapshi_payment_link: string | null
          fapshi_trans_id: string | null
          id: string
          provider_payload: Json | null
          status: string
          token_amount: number
          token_price_xaf: number
          updated_at: string
          user_id: string
          wallet_transaction_id: string | null
        }
        Insert: {
          amount_xaf: number
          created_at?: string
          credited_at?: string | null
          external_id?: string | null
          fapshi_payment_link?: string | null
          fapshi_trans_id?: string | null
          id?: string
          provider_payload?: Json | null
          status?: string
          token_amount: number
          token_price_xaf: number
          updated_at?: string
          user_id: string
          wallet_transaction_id?: string | null
        }
        Update: {
          amount_xaf?: number
          created_at?: string
          credited_at?: string | null
          external_id?: string | null
          fapshi_payment_link?: string | null
          fapshi_trans_id?: string | null
          id?: string
          provider_payload?: Json | null
          status?: string
          token_amount?: number
          token_price_xaf?: number
          updated_at?: string
          user_id?: string
          wallet_transaction_id?: string | null
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance_tokens: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_tokens?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_tokens?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          cover_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_published: boolean | null
          kyc_status: string | null
          name: string | null
          provider_category: string | null
          published_at: string | null
          published_until: string | null
          suspended: boolean | null
          visibility_status: string | null
          visibility_until: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_published?: boolean | null
          kyc_status?: string | null
          name?: string | null
          provider_category?: string | null
          published_at?: string | null
          published_until?: string | null
          suspended?: boolean | null
          visibility_status?: string | null
          visibility_until?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_published?: boolean | null
          kyc_status?: string | null
          name?: string | null
          provider_category?: string | null
          published_at?: string | null
          published_until?: string | null
          suspended?: boolean | null
          visibility_status?: string | null
          visibility_until?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_visibility: { Args: never; Returns: Json }
      apply_to_project: {
        Args: { _cover_letter: string; _project_id: string }
        Returns: Json
      }
      boost_application: { Args: { _application_id: string }; Returns: Json }
      can_message: { Args: { _a: string; _b: string }; Returns: boolean }
      cancel_project: { Args: { _project_id: string }; Returns: Json }
      complete_provider_onboarding: {
        Args: { _category: string }
        Returns: Json
      }
      contact_provider: {
        Args: { _message: string; _provider_id: string }
        Returns: Json
      }
      create_project: {
        Args: {
          _budget: number
          _category?: string
          _city: string
          _description: string
          _title: string
        }
        Returns: Json
      }
      credit_tokens_from_payment: {
        Args: { _fapshi_trans_id: string; _payload: Json; _payment_id: string }
        Returns: Json
      }
      get_marketplace_services: {
        Args: {
          _category?: string
          _max_price?: number
          _min_price?: number
          _min_rating?: number
          _q?: string
          _sort?: string
        }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          price: number
          provider_avatar: string
          provider_city: string
          provider_id: string
          provider_name: string
          provider_rating: number
          provider_reviews_count: number
          title: string
        }[]
      }
      get_my_conversations: {
        Args: never
        Returns: {
          avatar_url: string
          contact_id: string
          full_name: string
          is_admin: boolean
          name: string
        }[]
      }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_published: boolean
          kyc_status: string
          name: string
          phone: string | null
          provider_category: string | null
          published_at: string | null
          published_until: string | null
          suspended: boolean
          visibility_status: string
          visibility_until: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_project_applications: {
        Args: { _project_id: string }
        Returns: {
          boost_count: number
          cover_letter: string
          created_at: string
          id: string
          prestataire_id: string
          project_id: string
          provider_avatar: string
          provider_category: string
          provider_city: string
          provider_name: string
          provider_rating: number
          provider_reviews: number
          rank: number
          status: string
        }[]
      }
      get_open_projects: {
        Args: never
        Returns: {
          application_count: number
          budget: number
          category: string
          city: string
          client_avatar: string
          client_id: string
          client_name: string
          created_at: string
          description: string
          expires_at: string
          has_applied: boolean
          id: string
          max_applications: number
          my_rank: number
          title: string
        }[]
      }
      get_project_application_stats: {
        Args: never
        Returns: {
          my_position: number
          project_id: string
          total_count: number
        }[]
      }
      get_provider_profile: {
        Args: { _id: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          cover_url: string
          created_at: string
          full_name: string
          id: string
          is_published: boolean
          kyc_status: string
          name: string
          provider_category: string
          published_at: string
          published_until: string
          suspended: boolean
          visibility_status: string
          visibility_until: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      mark_payment_status: {
        Args: { _payload: Json; _payment_id: string; _status: string }
        Returns: Json
      }
      provider_is_visible: { Args: { _id: string }; Returns: boolean }
      publish_profile: { Args: never; Returns: Json }
      recharge_wallet: { Args: { _amount: number }; Returns: Json }
      refund_selection: { Args: { _project_id: string }; Returns: Json }
      review_diploma: {
        Args: { _diploma_id: string; _notes: string; _status: string }
        Returns: Json
      }
      review_portfolio: {
        Args: { _notes: string; _portfolio_id: string; _status: string }
        Returns: Json
      }
      select_provider: {
        Args: { _application_id: string; _project_id: string }
        Returns: Json
      }
      send_message: {
        Args: { _content: string; _receiver_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "client" | "provider" | "admin"
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
      app_role: ["client", "provider", "admin"],
    },
  },
} as const
