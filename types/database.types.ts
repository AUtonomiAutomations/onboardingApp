// ─── Primitive JSON type ──────────────────────────────────────────────────────
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "client" | "freelancer";
export type ClientStatus = "pending" | "in_progress" | "completed";
export type ProjectStatus = "active" | "on_hold" | "completed";
export type CredentialStatus = "draft" | "submitted";
export type FileType = "contract" | "quote" | "spec" | "invoice" | "other";

// ─── Credential field schema (stored in systems.credential_fields) ────────────
export interface CredentialField {
  name: string;
  label: string;
  type: "text" | "password" | "url" | "email" | "textarea" | "select";
  required: boolean;
  placeholder?: string;
  help_text?: string;
  options?: string[];
}

// ─── Database schema ──────────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          role?: UserRole;
          created_at?: string;
        };
        Relationships: [];
      };

      systems: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          description: string | null;
          credential_fields: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          description?: string | null;
          credential_fields?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          description?: string | null;
          credential_fields?: Json;
          created_at?: string;
        };
        Relationships: [];
      };

      clients: {
        Row: {
          id: string;
          user_id: string | null;
          company_name: string;
          monday_item_id: string | null;
          status: ClientStatus;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          company_name: string;
          monday_item_id?: string | null;
          status?: ClientStatus;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          company_name?: string;
          monday_item_id?: string | null;
          status?: ClientStatus;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };

      projects: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          monday_project_id: string | null;
          status: ProjectStatus;
          project_value: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          monday_project_id?: string | null;
          status?: ProjectStatus;
          project_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          name?: string;
          monday_project_id?: string | null;
          status?: ProjectStatus;
          project_value?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };

      project_systems: {
        Row: {
          id: string;
          project_id: string;
          system_id: string;
          display_order: number;
          is_required: boolean;
        };
        Insert: {
          id?: string;
          project_id: string;
          system_id: string;
          display_order?: number;
          is_required?: boolean;
        };
        Update: {
          id?: string;
          project_id?: string;
          system_id?: string;
          display_order?: number;
          is_required?: boolean;
        };
        Relationships: [];
      };

      freelancer_assignments: {
        Row: {
          id: string;
          project_id: string;
          freelancer_id: string;
          assigned_at: string;
          assigned_by: string | null;
          payment_amount: number | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          freelancer_id: string;
          assigned_at?: string;
          assigned_by?: string | null;
          payment_amount?: number | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          freelancer_id?: string;
          assigned_at?: string;
          assigned_by?: string | null;
          payment_amount?: number | null;
        };
        Relationships: [];
      };

      freelancer_files: {
        Row: {
          id: string;
          freelancer_id: string;
          file_name: string;
          storage_path: string;
          file_type: string;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          freelancer_id: string;
          file_name: string;
          storage_path: string;
          file_type?: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          freelancer_id?: string;
          file_name?: string;
          storage_path?: string;
          file_type?: string;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };

      credentials: {
        Row: {
          id: string;
          project_id: string;
          system_id: string;
          client_id: string;
          field_values: Json;
          status: CredentialStatus;
          submitted_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          system_id: string;
          client_id: string;
          field_values?: Json;
          status?: CredentialStatus;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          system_id?: string;
          client_id?: string;
          field_values?: Json;
          status?: CredentialStatus;
          submitted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };

      files: {
        Row: {
          id: string;
          client_id: string;
          project_id: string;
          file_name: string;
          storage_path: string;
          file_type: FileType;
          is_visible_to_freelancer: boolean;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id: string;
          file_name: string;
          storage_path: string;
          file_type?: FileType;
          is_visible_to_freelancer?: boolean;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string;
          file_name?: string;
          storage_path?: string;
          file_type?: FileType;
          is_visible_to_freelancer?: boolean;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
    };

    Views: {
      [_ in never]: never;
    };

    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_assigned_to_project: {
        Args: { p_project_id: string };
        Returns: boolean;
      };
      get_my_client_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };

    Enums: {
      user_role: UserRole;
      client_status: ClientStatus;
      project_status: ProjectStatus;
      credential_status: CredentialStatus;
      file_type: FileType;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ─── Convenience row types ─────────────────────────────────────────────────────
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type System = Database["public"]["Tables"]["systems"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectSystem = Database["public"]["Tables"]["project_systems"]["Row"];
export type FreelancerAssignment = Database["public"]["Tables"]["freelancer_assignments"]["Row"];
export type Credential = Database["public"]["Tables"]["credentials"]["Row"];
export type File = Database["public"]["Tables"]["files"]["Row"];
