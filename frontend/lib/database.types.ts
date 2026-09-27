export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          deleted_at: string | null;
          email: string;
          google_id: string | null;
          id: string;
          is_related_party: boolean | null;
          name: string | null;
          quota_remaining: number | null;
          quota_reset_at: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: string | null;
          subscription_tier: string;
          updated_at: string | null;
          user_type: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email: string;
          google_id?: string | null;
          id?: string;
          is_related_party?: boolean | null;
          name?: string | null;
          quota_remaining?: number | null;
          quota_reset_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_tier?: string;
          updated_at?: string | null;
          user_type?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string;
          google_id?: string | null;
          id?: string;
          is_related_party?: boolean | null;
          name?: string | null;
          quota_remaining?: number | null;
          quota_reset_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: string | null;
          subscription_tier?: string;
          updated_at?: string | null;
          user_type?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          agent_used: string;
          completed_at: string | null;
          created_at: string | null;
          duration_ms: number | null;
          error_message: string | null;
          file_name: string | null;
          file_url: string | null;
          gemini_calls: number | null;
          id: string;
          input_text: string;
          output_text: string | null;
          status: string | null;
          task_type: string;
          tokens_input: number | null;
          tokens_output: number | null;
          user_id: string | null;
          user_type: string;
        };
        Insert: {
          agent_used: string;
          completed_at?: string | null;
          created_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          file_name?: string | null;
          file_url?: string | null;
          gemini_calls?: number | null;
          id?: string;
          input_text: string;
          output_text?: string | null;
          status?: string | null;
          task_type: string;
          tokens_input?: number | null;
          tokens_output?: number | null;
          user_id?: string | null;
          user_type: string;
        };
        Update: {
          agent_used?: string;
          completed_at?: string | null;
          created_at?: string | null;
          duration_ms?: number | null;
          error_message?: string | null;
          file_name?: string | null;
          file_url?: string | null;
          gemini_calls?: number | null;
          id?: string;
          input_text?: string;
          output_text?: string | null;
          status?: string | null;
          task_type?: string;
          tokens_input?: number | null;
          tokens_output?: number | null;
          user_id?: string | null;
          user_type?: string;
        };
        Relationships: [];
      };
      memory_items: {
        Row: {
          category: string;
          content: string;
          created_at: string | null;
          embedding: string | null;
          id: string;
          importance: number | null;
          source_task_id: string | null;
          summary: string;
          tags: string[] | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          importance?: number | null;
          source_task_id?: string | null;
          summary: string;
          tags?: string[] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          importance?: number | null;
          source_task_id?: string | null;
          summary?: string;
          tags?: string[] | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      revenue_records: {
        Row: {
          amount_usd: number;
          billing_period: string;
          calendar_month: string;
          created_at: string | null;
          id: string;
          is_related_party: boolean | null;
          plan_type: string;
          stripe_event_id: string;
          stripe_payment_id: string;
          user_id: string;
        };
        Insert: {
          amount_usd: number;
          billing_period: string;
          calendar_month: string;
          created_at?: string | null;
          id?: string;
          is_related_party?: boolean | null;
          plan_type: string;
          stripe_event_id: string;
          stripe_payment_id: string;
          user_id: string;
        };
        Update: {
          amount_usd?: number;
          billing_period?: string;
          calendar_month?: string;
          created_at?: string | null;
          id?: string;
          is_related_party?: boolean | null;
          plan_type?: string;
          stripe_event_id?: string;
          stripe_payment_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          event_id: string;
          event_type: string;
          id: string;
          processed_at: string | null;
          provider: string;
        };
        Insert: {
          event_id: string;
          event_type: string;
          id?: string;
          processed_at?: string | null;
          provider: string;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          id?: string;
          processed_at?: string | null;
          provider?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      complete_task: {
        Args: {
          p_agent_used: string;
          p_completed_at: string;
          p_duration_ms: number;
          p_file_url: string | null;
          p_input_text: string;
          p_output_text: string;
          p_status: string;
          p_task_id: string;
          p_task_type: string;
          p_user_id: string;
          p_user_type: string;
        };
        Returns: number | null;
      };
      process_checkout_completion: {
        Args: {
          p_amount_usd: number;
          p_billing_period: string;
          p_calendar_month: string;
          p_plan_type: string;
          p_stripe_customer_id: string | null;
          p_stripe_event_id: string;
          p_stripe_payment_id: string;
          p_stripe_subscription_id: string | null;
          p_user_id: string;
        };
        Returns: number | null;
      };
    };
  };
}
