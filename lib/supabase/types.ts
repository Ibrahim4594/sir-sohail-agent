// Stub type definitions matching supabase/migrations/*.sql.
// Regenerate with `pnpm db:types` once the Supabase CLI is installed and the DB is running.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'admin' | 'student' | 'guest';
export type MessageRole = 'user' | 'assistant' | 'system';
export type DocumentStatus = 'processing' | 'ready' | 'failed';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          role: Role;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: Role;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          filename: string;
          title: string | null;
          summary: string | null;
          storage_path: string;
          page_count: number | null;
          uploaded_by: string | null;
          uploaded_at: string;
          status: DocumentStatus;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          filename: string;
          title?: string | null;
          summary?: string | null;
          storage_path: string;
          page_count?: number | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
          status?: DocumentStatus;
          error_message?: string | null;
        };
        Update: Partial<Database['public']['Tables']['documents']['Insert']>;
        Relationships: [];
      };
      chunks: {
        Row: {
          id: string;
          document_id: string;
          page_number: number;
          chunk_index: number;
          content: string;
          embedding: string | null;
          token_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          page_number: number;
          chunk_index: number;
          content: string;
          embedding?: string | null;
          token_count?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chunks']['Insert']>;
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          citations: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: MessageRole;
          content: string;
          citations?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_chunks: {
        Args: {
          query_embedding: string;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          chunk_id: string;
          document_id: string;
          page_number: number;
          content: string;
          similarity: number;
          document_title: string;
          document_filename: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
