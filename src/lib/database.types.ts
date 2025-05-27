export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      music_analyses: {
        Row: {
          id: string
          created_at: string | null
          tempo: number
          key: string
          time_signature: string
          notes: Json
          user_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string | null
          tempo: number
          key: string
          time_signature: string
          notes: Json
          user_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string | null
          tempo?: number
          key?: string
          time_signature?: string
          notes?: Json
          user_id?: string | null
        }
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
  }
}