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
      accounts_payable: {
        Row: {
          amount: number
          attachment_url: string | null
          category_id: string | null
          category_name: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          priority: string | null
          recurrence: string | null
          status: string
          supplier_id: string | null
          supplier_name: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          priority?: string | null
          recurrence?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          priority?: string | null
          recurrence?: string | null
          status?: string
          supplier_id?: string | null
          supplier_name?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          active: boolean
          category: string
          code: string
          created_at: string
          description: string | null
          icon: string
          id: string
          metric: string
          name: string
          sort_order: number
          threshold: number
          updated_at: string
          xp_bonus: number
        }
        Insert: {
          active?: boolean
          category?: string
          code: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          metric: string
          name: string
          sort_order?: number
          threshold?: number
          updated_at?: string
          xp_bonus?: number
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          metric?: string
          name?: string
          sort_order?: number
          threshold?: number
          updated_at?: string
          xp_bonus?: number
        }
        Relationships: []
      }
      anamnesis: {
        Row: {
          client_id: number | null
          content: string | null
          created_at: string | null
          id: string
          injuries: string | null
          lead_name: string | null
          limitations: string | null
          link_id: string | null
          objective: string | null
          pain: string | null
          phone: string | null
          restrictions: string | null
          routine: string | null
          sleep: string | null
          stress: string | null
          training_history: string | null
          type: string | null
          unit_id: string | null
        }
        Insert: {
          client_id?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          injuries?: string | null
          lead_name?: string | null
          limitations?: string | null
          link_id?: string | null
          objective?: string | null
          pain?: string | null
          phone?: string | null
          restrictions?: string | null
          routine?: string | null
          sleep?: string | null
          stress?: string | null
          training_history?: string | null
          type?: string | null
          unit_id?: string | null
        }
        Update: {
          client_id?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          injuries?: string | null
          lead_name?: string | null
          limitations?: string | null
          link_id?: string | null
          objective?: string | null
          pain?: string | null
          phone?: string | null
          restrictions?: string | null
          routine?: string | null
          sleep?: string | null
          stress?: string | null
          training_history?: string | null
          type?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "form_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anamnesis_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      assessment_bioimpedance: {
        Row: {
          assessment_id: string
          basal_metabolism: number | null
          bmi: number | null
          body_fat_pct: number | null
          body_water: number | null
          created_at: string
          fat_mass: number | null
          id: string
          lean_mass: number | null
          muscle_mass: number | null
          origin: string
          updated_at: string
          visceral_fat: number | null
          weight: number | null
        }
        Insert: {
          assessment_id: string
          basal_metabolism?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          body_water?: number | null
          created_at?: string
          fat_mass?: number | null
          id?: string
          lean_mass?: number | null
          muscle_mass?: number | null
          origin?: string
          updated_at?: string
          visceral_fat?: number | null
          weight?: number | null
        }
        Update: {
          assessment_id?: string
          basal_metabolism?: number | null
          bmi?: number | null
          body_fat_pct?: number | null
          body_water?: number | null
          created_at?: string
          fat_mass?: number | null
          id?: string
          lean_mass?: number | null
          muscle_mass?: number | null
          origin?: string
          updated_at?: string
          visceral_fat?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_bioimpedance_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "physical_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_measures: {
        Row: {
          assessment_id: string
          id: string
          measure_key: string
          value: number | null
        }
        Insert: {
          assessment_id: string
          id?: string
          measure_key: string
          value?: number | null
        }
        Update: {
          assessment_id?: string
          id?: string
          measure_key?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_measures_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "physical_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_revisions: {
        Row: {
          after_data: Json | null
          assessment_id: string
          before_data: Json | null
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          id: string
          reason: string
        }
        Insert: {
          after_data?: Json | null
          assessment_id: string
          before_data?: Json | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          reason: string
        }
        Update: {
          after_data?: Json | null
          assessment_id?: string
          before_data?: Json | null
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_revisions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "physical_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          description: string
          device: string | null
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          metadata: Json
          module: string | null
          unit_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          description: string
          device?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          module?: string | null
          unit_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          description?: string
          device?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          module?: string | null
          unit_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      automations: {
        Row: {
          active: boolean | null
          id: string
          name: string
          segment: string | null
          trigger_rule: string | null
          unit_id: string | null
        }
        Insert: {
          active?: boolean | null
          id?: string
          name: string
          segment?: string | null
          trigger_rule?: string | null
          unit_id?: string | null
        }
        Update: {
          active?: boolean | null
          id?: string
          name?: string
          segment?: string | null
          trigger_rule?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          agency: string | null
          bank_code: string | null
          bank_name: string | null
          created_at: string
          currency: string
          id: string
          last_sync_at: string | null
          name: string
          opening_balance: number
          provider: string
          provider_account_id: string | null
          provider_status: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          last_sync_at?: string | null
          name: string
          opening_balance?: number
          provider?: string
          provider_account_id?: string | null
          provider_status?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          agency?: string | null
          bank_code?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          opening_balance?: number
          provider?: string
          provider_account_id?: string | null
          provider_status?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_import_batches: {
        Row: {
          auto_matched: number
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          duplicate_rows: number
          file_name: string | null
          id: string
          imported_rows: number
          source: string
          total_rows: number
          unit_id: string | null
        }
        Insert: {
          auto_matched?: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          duplicate_rows?: number
          file_name?: string | null
          id?: string
          imported_rows?: number
          source?: string
          total_rows?: number
          unit_id?: string | null
        }
        Update: {
          auto_matched?: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          duplicate_rows?: number
          file_name?: string | null
          id?: string
          imported_rows?: number
          source?: string
          total_rows?: number
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_import_batches_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_import_batches_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          bank_ref: string | null
          batch_id: string | null
          created_at: string
          description: string | null
          direction: string
          id: string
          match_client_id: number | null
          match_confidence: number | null
          match_id: string | null
          match_type: string | null
          matched_at: string | null
          matched_by: string | null
          matched_by_name: string | null
          memo: string | null
          notes: string | null
          parent_id: string | null
          payment_method: string | null
          posted_at: string
          raw: Json | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          bank_ref?: string | null
          batch_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          match_client_id?: number | null
          match_confidence?: number | null
          match_id?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          matched_by_name?: string | null
          memo?: string | null
          notes?: string | null
          parent_id?: string | null
          payment_method?: string | null
          posted_at: string
          raw?: Json | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          bank_ref?: string | null
          batch_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          match_client_id?: number | null
          match_confidence?: number | null
          match_id?: string | null
          match_type?: string | null
          matched_at?: string | null
          matched_by?: string | null
          matched_by_name?: string | null
          memo?: string | null
          notes?: string | null
          parent_id?: string | null
          payment_method?: string | null
          posted_at?: string
          raw?: Json | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "bank_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "bank_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellations: {
        Row: {
          cancelled_at: string | null
          client_id: number | null
          id: string
          reason: string | null
          unit_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          client_id?: number | null
          id?: string
          reason?: string | null
          unit_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          client_id?: number | null
          id?: string
          reason?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          checked_at: string | null
          client_id: number
          id: string
        }
        Insert: {
          checked_at?: string | null
          client_id: number
          id?: string
        }
        Update: {
          checked_at?: string | null
          client_id?: number
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      class_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          booking_id: string
          class_date: string
          class_id: string
          collaborator_id: string
          id: string
          locked: boolean
          started_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          booking_id: string
          class_date: string
          class_id: string
          collaborator_id: string
          id?: string
          locked?: boolean
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          booking_id?: string
          class_date?: string
          class_id?: string
          collaborator_id?: string
          id?: string
          locked?: boolean
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "class_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_assignments_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          attendance_marked_at: string | null
          attendance_marked_by: string | null
          attendance_status: string
          booked_at: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          class_date: string | null
          class_id: string | null
          client_id: number | null
          id: string
          kind: string
          muscle_group: string | null
          status: string | null
          student_name: string | null
        }
        Insert: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string
          booked_at?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          class_date?: string | null
          class_id?: string | null
          client_id?: number | null
          id?: string
          kind?: string
          muscle_group?: string | null
          status?: string | null
          student_name?: string | null
        }
        Update: {
          attendance_marked_at?: string | null
          attendance_marked_by?: string | null
          attendance_status?: string
          booked_at?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          class_date?: string | null
          class_id?: string | null
          client_id?: number | null
          id?: string
          kind?: string
          muscle_group?: string | null
          status?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      class_slot_overrides: {
        Row: {
          blocked: boolean
          capacity_override: number | null
          class_date: string
          class_id: string
          created_at: string
          created_by: string | null
          id: string
          reason: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          capacity_override?: number | null
          class_date: string
          class_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          capacity_override?: number | null
          class_date?: string
          class_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          reason?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_slot_overrides_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_waitlist: {
        Row: {
          class_date: string
          class_id: string
          client_id: number
          created_at: string
          id: string
          muscle_group: string | null
          position: number
          status: string
        }
        Insert: {
          class_date: string
          class_id: string
          client_id: number
          created_at?: string
          id?: string
          muscle_group?: string | null
          position?: number
          status?: string
        }
        Update: {
          class_date?: string
          class_id?: string
          client_id?: number
          created_at?: string
          id?: string
          muscle_group?: string | null
          position?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_waitlist_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          day_of_week: number | null
          end_time: string
          id: string
          max_slots: number | null
          name: string | null
          start_time: string
          trainer: string | null
          unit_id: string | null
        }
        Insert: {
          day_of_week?: number | null
          end_time: string
          id?: string
          max_slots?: number | null
          name?: string | null
          start_time: string
          trainer?: string | null
          unit_id?: string | null
        }
        Update: {
          day_of_week?: number | null
          end_time?: string
          id?: string
          max_slots?: number | null
          name?: string | null
          start_time?: string
          trainer?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      client_achievements: {
        Row: {
          achievement_code: string
          client_id: number
          created_at: string
          id: string
          seen: boolean
          unlocked_at: string
        }
        Insert: {
          achievement_code: string
          client_id: number
          created_at?: string
          id?: string
          seen?: boolean
          unlocked_at?: string
        }
        Update: {
          achievement_code?: string
          client_id?: number
          created_at?: string
          id?: string
          seen?: boolean
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_achievements_achievement_code_fkey"
            columns: ["achievement_code"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "client_achievements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_achievements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contracts: {
        Row: {
          body: string | null
          channel: string | null
          client_id: number
          contract_id: string | null
          created_at: string
          ends_at: string | null
          evidence: Json
          expires_at: string | null
          id: string
          plan: string | null
          plan_value: number | null
          renewal_id: string | null
          sent_at: string | null
          sent_by: string | null
          sent_by_name: string | null
          signature_cpf: string | null
          signature_hash: string | null
          signature_name: string | null
          signed_at: string | null
          starts_at: string | null
          status: string
          supersedes_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
          version: number
          viewed_at: string | null
        }
        Insert: {
          body?: string | null
          channel?: string | null
          client_id: number
          contract_id?: string | null
          created_at?: string
          ends_at?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          plan?: string | null
          plan_value?: number | null
          renewal_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          signature_cpf?: string | null
          signature_hash?: string | null
          signature_name?: string | null
          signed_at?: string | null
          starts_at?: string | null
          status?: string
          supersedes_id?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          version?: number
          viewed_at?: string | null
        }
        Update: {
          body?: string | null
          channel?: string | null
          client_id?: number
          contract_id?: string | null
          created_at?: string
          ends_at?: string | null
          evidence?: Json
          expires_at?: string | null
          id?: string
          plan?: string | null
          plan_value?: number | null
          renewal_id?: string | null
          sent_at?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          signature_cpf?: string | null
          signature_hash?: string | null
          signature_name?: string | null
          signed_at?: string | null
          starts_at?: string | null
          status?: string
          supersedes_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          version?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewal_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contracts_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          birth_date: string | null
          contract_end: string | null
          contract_start: string | null
          cpf: string | null
          created_at: string | null
          crm_owner_id: string | null
          email: string | null
          gender: string | null
          id: number
          limitations: string | null
          name: string
          objective: string | null
          observations: string | null
          onboarding_completed: boolean
          phone: string | null
          plan: string | null
          plan_value: number | null
          post_blocked_until: string | null
          status: string | null
          unit_id: string | null
          visit_type: string | null
          weekly_goal: number | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          contract_end?: string | null
          contract_start?: string | null
          cpf?: string | null
          created_at?: string | null
          crm_owner_id?: string | null
          email?: string | null
          gender?: string | null
          id?: number
          limitations?: string | null
          name: string
          objective?: string | null
          observations?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string | null
          plan_value?: number | null
          post_blocked_until?: string | null
          status?: string | null
          unit_id?: string | null
          visit_type?: string | null
          weekly_goal?: number | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          contract_end?: string | null
          contract_start?: string | null
          cpf?: string | null
          created_at?: string | null
          crm_owner_id?: string | null
          email?: string | null
          gender?: string | null
          id?: number
          limitations?: string | null
          name?: string
          objective?: string | null
          observations?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          plan?: string | null
          plan_value?: number | null
          post_blocked_until?: string | null
          status?: string | null
          unit_id?: string | null
          visit_type?: string | null
          weekly_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_crm_owner_id_fkey"
            columns: ["crm_owner_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          created_at: string
          member_code: string
          name: string | null
          student_id: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          member_code: string
          name?: string | null
          student_id: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          member_code?: string
          name?: string | null
          student_id?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      club_redemptions: {
        Row: {
          amount_saved: number | null
          benefit_id: string | null
          benefit_label: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          partner_id: string | null
          purchase_amount: number | null
          redeemed_at: string
          source: string
          status: string
          student_id: string
          unit_id: string | null
          updated_at: string
          validated_by: string | null
        }
        Insert: {
          amount_saved?: number | null
          benefit_id?: string | null
          benefit_label?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          partner_id?: string | null
          purchase_amount?: number | null
          redeemed_at?: string
          source?: string
          status?: string
          student_id: string
          unit_id?: string | null
          updated_at?: string
          validated_by?: string | null
        }
        Update: {
          amount_saved?: number | null
          benefit_id?: string | null
          benefit_label?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          partner_id?: string | null
          purchase_amount?: number | null
          redeemed_at?: string
          source?: string
          status?: string
          student_id?: string
          unit_id?: string | null
          updated_at?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_redemptions_benefit_id_fkey"
            columns: ["benefit_id"]
            isOneToOne: false
            referencedRelation: "partner_benefits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_redemptions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_redemptions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_units: {
        Row: {
          collaborator_id: string
          created_at: string
          id: string
          unit_id: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          id?: string
          unit_id: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_units_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborator_units_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          allow_consolidated: boolean
          auth_user_id: string | null
          cpf: string | null
          created_at: string
          email: string | null
          financial_release: boolean
          full_name: string
          hired_at: string | null
          id: string
          internal_notes: string | null
          permission_profile_id: string | null
          phone: string | null
          photo_url: string | null
          role_title: string | null
          shift_break_minutes: number | null
          shift_end: string | null
          shift_start: string | null
          shift_weekdays: number[] | null
          status: string
          supervisor_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          allow_consolidated?: boolean
          auth_user_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          financial_release?: boolean
          full_name: string
          hired_at?: string | null
          id?: string
          internal_notes?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          shift_break_minutes?: number | null
          shift_end?: string | null
          shift_start?: string | null
          shift_weekdays?: number[] | null
          status?: string
          supervisor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          allow_consolidated?: boolean
          auth_user_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          financial_release?: boolean
          full_name?: string
          hired_at?: string | null
          id?: string
          internal_notes?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          shift_break_minutes?: number | null
          shift_end?: string | null
          shift_start?: string | null
          shift_weekdays?: number[] | null
          status?: string
          supervisor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_permission_profile_id_fkey"
            columns: ["permission_profile_id"]
            isOneToOne: false
            referencedRelation: "permission_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborators_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_entries: {
        Row: {
          amount: number
          base_value: number
          collaborator_id: string | null
          conversion_id: string
          created_at: string
          id: string
          rate: number | null
          reference_date: string
          role: string
          rule: string
          unit_id: string | null
        }
        Insert: {
          amount?: number
          base_value?: number
          collaborator_id?: string | null
          conversion_id: string
          created_at?: string
          id?: string
          rate?: number | null
          reference_date?: string
          role: string
          rule: string
          unit_id?: string | null
        }
        Update: {
          amount?: number
          base_value?: number
          collaborator_id?: string | null
          conversion_id?: string
          created_at?: string
          id?: string
          rate?: number | null
          reference_date?: string
          role?: string
          rule?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_entries_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_entries_conversion_id_fkey"
            columns: ["conversion_id"]
            isOneToOne: false
            referencedRelation: "enrollment_conversions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          pinned: boolean
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      community_post_likes: {
        Row: {
          client_id: number
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          client_id: number
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_likes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_name: string | null
          client_id: number | null
          content: string | null
          created_at: string
          edited_at: string | null
          hidden: boolean
          hidden_reason: string | null
          id: string
          image_url: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          client_id?: number | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          image_url?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          client_id?: number | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          image_url?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          client_id: number | null
          created_at: string
          id: string
          post_id: string
          reason: string | null
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          id?: string
          post_id: string
          reason?: string | null
        }
        Update: {
          client_id?: number | null
          created_at?: string
          id?: string
          post_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_devices: {
        Row: {
          active: boolean
          client_id: number
          created_at: string
          id: string
          label: string | null
          last_sync_at: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: number
          created_at?: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: number
          created_at?: string
          id?: string
          label?: string | null
          last_sync_at?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_devices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connected_devices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          body: string | null
          cancellation_rules: string | null
          contract_type: string | null
          created_at: string
          id: string
          linked_plan: string | null
          name: string
          penalty_value: number | null
          renewal_rules: string | null
          status: string
          unit_id: string | null
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          body?: string | null
          cancellation_rules?: string | null
          contract_type?: string | null
          created_at?: string
          id?: string
          linked_plan?: string | null
          name: string
          penalty_value?: number | null
          renewal_rules?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          body?: string | null
          cancellation_rules?: string | null
          contract_type?: string | null
          created_at?: string
          id?: string
          linked_plan?: string | null
          name?: string
          penalty_value?: number | null
          renewal_rules?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: []
      }
      cost_allocation_rules: {
        Row: {
          created_at: string
          id: string
          pct: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pct?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pct?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_allocation_rules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_centers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          kind: string
          name: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          kind?: string
          name?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_attendance_alerts: {
        Row: {
          client_id: number
          created_at: string
          days_without: number
          id: string
          last_activity: string | null
          notes: string | null
          resolved_at: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: number
          created_at?: string
          days_without?: number
          id?: string
          last_activity?: string | null
          notes?: string | null
          resolved_at?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: number
          created_at?: string
          days_without?: number
          id?: string
          last_activity?: string | null
          notes?: string | null
          resolved_at?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_attendance_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attendance_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_attendance_alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_indications: {
        Row: {
          affected_monthly_value: number | null
          created_at: string
          discount_applied: boolean
          discount_percent: number
          enrollment_date: string | null
          id: string
          indicated_lead_id: string | null
          indicated_name: string
          indicated_phone: string | null
          indicated_student_id: number | null
          indicator_name: string
          indicator_student_id: number | null
          notes: string | null
          origin: string | null
          plan_contracted: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          affected_monthly_value?: number | null
          created_at?: string
          discount_applied?: boolean
          discount_percent?: number
          enrollment_date?: string | null
          id?: string
          indicated_lead_id?: string | null
          indicated_name: string
          indicated_phone?: string | null
          indicated_student_id?: number | null
          indicator_name: string
          indicator_student_id?: number | null
          notes?: string | null
          origin?: string | null
          plan_contracted?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          affected_monthly_value?: number | null
          created_at?: string
          discount_applied?: boolean
          discount_percent?: number
          enrollment_date?: string | null
          id?: string
          indicated_lead_id?: string | null
          indicated_name?: string
          indicated_phone?: string | null
          indicated_student_id?: number | null
          indicator_name?: string
          indicator_student_id?: number | null
          notes?: string | null
          origin?: string | null
          plan_contracted?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_task_checklist_items: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          task_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          task_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          task_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_task_checklist_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "crm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_task_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          task_id: string
          user_name: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          task_id: string
          user_name?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          task_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "crm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          archived: boolean
          attachment_url: string | null
          category: string | null
          created_at: string
          created_by: string | null
          deadline_at: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          notes: string | null
          notified_assign: boolean
          notified_before: boolean
          notified_due: boolean
          notified_late: boolean
          priority: string
          recurrence: string | null
          responsible_id: string | null
          responsible_name: string | null
          responsible_phone: string | null
          sector: string | null
          source: string | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          notified_assign?: boolean
          notified_before?: boolean
          notified_due?: boolean
          notified_late?: boolean
          priority?: string
          recurrence?: string | null
          responsible_id?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          sector?: string | null
          source?: string | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          attachment_url?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          deadline_at?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          notified_assign?: boolean
          notified_before?: boolean
          notified_due?: boolean
          notified_late?: boolean
          priority?: string
          recurrence?: string | null
          responsible_id?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          sector?: string | null
          source?: string | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkin_skips: {
        Row: {
          client_id: number
          created_at: string
          id: string
          skip_date: string
        }
        Insert: {
          client_id: number
          created_at?: string
          id?: string
          skip_date: string
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: string
          skip_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkin_skips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checkin_skips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          client_id: number | null
          created_at: string
          energy: number
          id: string
          mood: number
          sleep_hours: number
          sleep_quality: number
          stress_level: number | null
          student_name: string
          updated_at: string
        }
        Insert: {
          checkin_date?: string
          client_id?: number | null
          created_at?: string
          energy: number
          id?: string
          mood: number
          sleep_hours: number
          sleep_quality: number
          stress_level?: number | null
          student_name: string
          updated_at?: string
        }
        Update: {
          checkin_date?: string
          client_id?: number | null
          created_at?: string
          energy?: number
          id?: string
          mood?: number
          sleep_hours?: number
          sleep_quality?: number
          stress_level?: number | null
          student_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_checkins_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          code: string
          coupon_type: string | null
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          linked_plan: string | null
          linked_service_id: string | null
          name: string
          notes: string | null
          quantity_available: number | null
          quantity_used: number
          status: string
          unit_id: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          code: string
          coupon_type?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          linked_plan?: string | null
          linked_service_id?: string | null
          name: string
          notes?: string | null
          quantity_available?: number | null
          quantity_used?: number
          status?: string
          unit_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          code?: string
          coupon_type?: string | null
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          linked_plan?: string | null
          linked_service_id?: string | null
          name?: string
          notes?: string | null
          quantity_available?: number | null
          quantity_used?: number
          status?: string
          unit_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_coupons_linked_service_id_fkey"
            columns: ["linked_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_conversions: {
        Row: {
          client_id: number
          created_at: string
          created_by: string | null
          enrollment_date: string
          first_monthly_value: number
          id: string
          notes: string | null
          registrar_id: string | null
          sale_id: string | null
          seller_id: string | null
          trial_booking_id: string | null
          trial_professor_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: number
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          first_monthly_value?: number
          id?: string
          notes?: string | null
          registrar_id?: string | null
          sale_id?: string | null
          seller_id?: string | null
          trial_booking_id?: string | null
          trial_professor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: number
          created_at?: string
          created_by?: string | null
          enrollment_date?: string
          first_monthly_value?: number
          id?: string
          notes?: string | null
          registrar_id?: string | null
          sale_id?: string | null
          seller_id?: string | null
          trial_booking_id?: string | null
          trial_professor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_conversions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_conversions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_conversions_registrar_id_fkey"
            columns: ["registrar_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_conversions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_conversions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_conversions_trial_booking_id_fkey"
            columns: ["trial_booking_id"]
            isOneToOne: false
            referencedRelation: "class_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_conversions_trial_professor_id_fkey"
            columns: ["trial_professor_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      evo_cycles: {
        Row: {
          client_id: number
          completed_at: string | null
          created_at: string
          cycle_end: string
          cycle_start: string | null
          id: string
          stats: Json
          updated_at: string
        }
        Insert: {
          client_id: number
          completed_at?: string | null
          created_at?: string
          cycle_end: string
          cycle_start?: string | null
          id?: string
          stats?: Json
          updated_at?: string
        }
        Update: {
          client_id?: number
          completed_at?: string | null
          created_at?: string
          cycle_end?: string
          cycle_start?: string | null
          id?: string
          stats?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evo_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evo_cycles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      evolution_photos: {
        Row: {
          client_id: number
          created_at: string
          id: string
          pose: string
          storage_path: string
          taken_at: string
        }
        Insert: {
          client_id: number
          created_at?: string
          id?: string
          pose: string
          storage_path: string
          taken_at?: string
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: string
          pose?: string
          storage_path?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evolution_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evolution_photos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_library: {
        Row: {
          created_at: string
          equipment: string | null
          id: string
          instructions: string | null
          is_global: boolean
          muscle_group: string | null
          name: string
          secondary_muscle: string | null
          secondary_muscle_2: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_global?: boolean
          muscle_group?: string | null
          name: string
          secondary_muscle?: string | null
          secondary_muscle_2?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_global?: boolean
          muscle_group?: string | null
          name?: string
          secondary_muscle?: string | null
          secondary_muscle_2?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      financial_adjustments: {
        Row: {
          amount: number
          client_id: number | null
          client_name: string | null
          coupon: string | null
          created_at: string
          created_by: string | null
          created_by_name: string | null
          id: string
          kind: string
          reason: string | null
          status: string
          transaction_id: string | null
          unit_id: string | null
        }
        Insert: {
          amount?: number
          client_id?: number | null
          client_name?: string | null
          coupon?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          kind?: string
          reason?: string | null
          status?: string
          transaction_id?: string | null
          unit_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: number | null
          client_name?: string | null
          coupon?: string | null
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          id?: string
          kind?: string
          reason?: string | null
          status?: string
          transaction_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_adjustments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_categories: {
        Row: {
          color: string | null
          created_at: string
          group_id: string | null
          id: string
          kind: string
          name: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          name: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          name?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_categories_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_closings: {
        Row: {
          closed_at: string
          closed_by: string | null
          closed_by_name: string | null
          created_at: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          reopened_at: string | null
          reopened_by_name: string | null
          status: string
          totals: Json
          unit_id: string | null
        }
        Insert: {
          closed_at?: string
          closed_by?: string | null
          closed_by_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          reopened_at?: string | null
          reopened_by_name?: string | null
          status?: string
          totals?: Json
          unit_id?: string | null
        }
        Update: {
          closed_at?: string
          closed_by?: string | null
          closed_by_name?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          reopened_at?: string | null
          reopened_by_name?: string | null
          status?: string
          totals?: Json
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_closings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_groups: {
        Row: {
          color: string | null
          created_at: string
          id: string
          kind: string
          name: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          kind?: string
          name?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      forecast_scenarios: {
        Row: {
          base_revenue: number
          churn_pct: number
          created_at: string
          created_by_name: string | null
          fixed_cost: number
          growth_pct: number
          id: string
          name: string
          notes: string | null
          tax_pct: number
          ticket: number
          unit_id: string | null
          updated_at: string
          variable_cost_pct: number
          year: number
        }
        Insert: {
          base_revenue?: number
          churn_pct?: number
          created_at?: string
          created_by_name?: string | null
          fixed_cost?: number
          growth_pct?: number
          id?: string
          name: string
          notes?: string | null
          tax_pct?: number
          ticket?: number
          unit_id?: string | null
          updated_at?: string
          variable_cost_pct?: number
          year: number
        }
        Update: {
          base_revenue?: number
          churn_pct?: number
          created_at?: string
          created_by_name?: string | null
          fixed_cost?: number
          growth_pct?: number
          id?: string
          name?: string
          notes?: string | null
          tax_pct?: number
          ticket?: number
          unit_id?: string | null
          updated_at?: string
          variable_cost_pct?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "forecast_scenarios_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_snapshots: {
        Row: {
          accuracy_pct: number | null
          at_risk: number
          closed_at: string | null
          contracted: number
          created_at: string
          created_by: string | null
          created_by_name: string | null
          horizon_days: number
          id: string
          period_end: string
          period_start: string
          predicted_expense: number
          predicted_income: number
          probable: number
          realized_expense: number | null
          realized_income: number | null
          scenario: string
          unit_id: string | null
        }
        Insert: {
          accuracy_pct?: number | null
          at_risk?: number
          closed_at?: string | null
          contracted?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          horizon_days?: number
          id?: string
          period_end: string
          period_start: string
          predicted_expense?: number
          predicted_income?: number
          probable?: number
          realized_expense?: number | null
          realized_income?: number | null
          scenario?: string
          unit_id?: string | null
        }
        Update: {
          accuracy_pct?: number | null
          at_risk?: number
          closed_at?: string | null
          contracted?: number
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          horizon_days?: number
          id?: string
          period_end?: string
          period_start?: string
          predicted_expense?: number
          predicted_income?: number
          probable?: number
          realized_expense?: number | null
          realized_income?: number | null
          scenario?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forecast_snapshots_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      form_links: {
        Row: {
          answered_at: string | null
          client_id: number | null
          contract_id: string | null
          created_at: string
          created_by: string | null
          form_id: string | null
          id: string
          kind: string
          lead_name: string | null
          phone: string | null
          renewal_id: string | null
          response: Json | null
          sent_at: string
          status: string
          token: string
          unit_id: string | null
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          answered_at?: string | null
          client_id?: number | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          kind?: string
          lead_name?: string | null
          phone?: string | null
          renewal_id?: string | null
          response?: Json | null
          sent_at?: string
          status?: string
          token?: string
          unit_id?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          answered_at?: string | null
          client_id?: number | null
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          id?: string
          kind?: string
          lead_name?: string | null
          phone?: string | null
          renewal_id?: string | null
          response?: Json | null
          sent_at?: string
          status?: string
          token?: string
          unit_id?: string | null
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_links_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_links_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "operational_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_links_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewal_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_links_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_activities: {
        Row: {
          activity_group: string | null
          allow_booking: boolean
          color: string | null
          created_at: string
          description: string | null
          duration_min: number | null
          id: string
          internal_notes: string | null
          max_capacity: number | null
          name: string
          status: string
          unit_id: string | null
          updated_at: string
          visible_to_student: boolean
        }
        Insert: {
          activity_group?: string | null
          allow_booking?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          internal_notes?: string | null
          max_capacity?: number | null
          name: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          visible_to_student?: boolean
        }
        Update: {
          activity_group?: string | null
          allow_booking?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number | null
          id?: string
          internal_notes?: string | null
          max_capacity?: number | null
          name?: string
          status?: string
          unit_id?: string | null
          updated_at?: string
          visible_to_student?: boolean
        }
        Relationships: []
      }
      health_blood_pressure: {
        Row: {
          client_id: number
          created_at: string
          diastolic: number
          id: string
          measured_at: string
          recorded_by: string | null
          source: string
          systolic: number
          updated_at: string
        }
        Insert: {
          client_id: number
          created_at?: string
          diastolic: number
          id?: string
          measured_at?: string
          recorded_by?: string | null
          source?: string
          systolic: number
          updated_at?: string
        }
        Update: {
          client_id?: number
          created_at?: string
          diastolic?: number
          id?: string
          measured_at?: string
          recorded_by?: string | null
          source?: string
          systolic?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_blood_pressure_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_blood_pressure_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      health_metrics: {
        Row: {
          client_id: number
          created_at: string
          id: string
          measured_at: string
          metric: string
          source: string
          value: number
        }
        Insert: {
          client_id: number
          created_at?: string
          id?: string
          measured_at?: string
          metric: string
          source?: string
          value: number
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: string
          measured_at?: string
          metric?: string
          source?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_metrics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      health_weight_edits: {
        Row: {
          changed_by: string | null
          client_id: number
          created_at: string
          id: string
          new_value: number | null
          old_value: number | null
          weight_id: string
        }
        Insert: {
          changed_by?: string | null
          client_id: number
          created_at?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          weight_id: string
        }
        Update: {
          changed_by?: string | null
          client_id?: number
          created_at?: string
          id?: string
          new_value?: number | null
          old_value?: number | null
          weight_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_weight_edits_weight_id_fkey"
            columns: ["weight_id"]
            isOneToOne: false
            referencedRelation: "health_weights"
            referencedColumns: ["id"]
          },
        ]
      }
      health_weights: {
        Row: {
          client_id: number
          created_at: string
          id: string
          measured_at: string
          recorded_by: string | null
          source: string
          updated_at: string
          value: number
        }
        Insert: {
          client_id: number
          created_at?: string
          id?: string
          measured_at?: string
          recorded_by?: string | null
          source?: string
          updated_at?: string
          value: number
        }
        Update: {
          client_id?: number
          created_at?: string
          id?: string
          measured_at?: string
          recorded_by?: string | null
          source?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_weights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_weights_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      interacoes: {
        Row: {
          agendou_experimental: boolean
          atendido_por: string | null
          cadastrado_por: string | null
          compareceu: boolean | null
          created_at: string
          created_by: string | null
          data_experimental: string | null
          data_fechamento: string | null
          descricao: string | null
          fechou_matricula: boolean
          hora_experimental: string | null
          id: string
          lead_id: string
          plano_escolhido: string | null
          quem_agendou: string | null
          tipo: string
          unidade_id: string
          updated_at: string
          valor_plano: number | null
        }
        Insert: {
          agendou_experimental?: boolean
          atendido_por?: string | null
          cadastrado_por?: string | null
          compareceu?: boolean | null
          created_at?: string
          created_by?: string | null
          data_experimental?: string | null
          data_fechamento?: string | null
          descricao?: string | null
          fechou_matricula?: boolean
          hora_experimental?: string | null
          id?: string
          lead_id: string
          plano_escolhido?: string | null
          quem_agendou?: string | null
          tipo?: string
          unidade_id: string
          updated_at?: string
          valor_plano?: number | null
        }
        Update: {
          agendou_experimental?: boolean
          atendido_por?: string | null
          cadastrado_por?: string | null
          compareceu?: boolean | null
          created_at?: string
          created_by?: string | null
          data_experimental?: string | null
          data_fechamento?: string | null
          descricao?: string | null
          fechou_matricula?: boolean
          hora_experimental?: string | null
          id?: string
          lead_id?: string
          plano_escolhido?: string | null
          quem_agendou?: string | null
          tipo?: string
          unidade_id?: string
          updated_at?: string
          valor_plano?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          atendido_por: string | null
          ativo: boolean
          cadastrado_por: string | null
          created_at: string
          created_by: string | null
          data_aula_experimental: string | null
          email: string | null
          hora_aula_experimental: string | null
          id: string
          nivel_interesse:
            | Database["public"]["Enums"]["lead_nivel_interesse"]
            | null
          nome: string
          observacoes: string | null
          origem: string | null
          status_funil: Database["public"]["Enums"]["lead_status_funil"]
          status_taxa_experimental:
            | Database["public"]["Enums"]["lead_taxa_status"]
            | null
          telefone: string | null
          telefone_normalizado: string | null
          unidade_id: string
          updated_at: string
        }
        Insert: {
          atendido_por?: string | null
          ativo?: boolean
          cadastrado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_aula_experimental?: string | null
          email?: string | null
          hora_aula_experimental?: string | null
          id?: string
          nivel_interesse?:
            | Database["public"]["Enums"]["lead_nivel_interesse"]
            | null
          nome: string
          observacoes?: string | null
          origem?: string | null
          status_funil?: Database["public"]["Enums"]["lead_status_funil"]
          status_taxa_experimental?:
            | Database["public"]["Enums"]["lead_taxa_status"]
            | null
          telefone?: string | null
          telefone_normalizado?: string | null
          unidade_id: string
          updated_at?: string
        }
        Update: {
          atendido_por?: string | null
          ativo?: boolean
          cadastrado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_aula_experimental?: string | null
          email?: string | null
          hora_aula_experimental?: string | null
          id?: string
          nivel_interesse?:
            | Database["public"]["Enums"]["lead_nivel_interesse"]
            | null
          nome?: string
          observacoes?: string | null
          origem?: string | null
          status_funil?: Database["public"]["Enums"]["lead_status_funil"]
          status_taxa_experimental?:
            | Database["public"]["Enums"]["lead_taxa_status"]
            | null
          telefone?: string | null
          telefone_normalizado?: string | null
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      limitation_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          client_id: number
          created_at: string
          created_by: string | null
          id: string
          new_value: string | null
          old_value: string | null
          source: string
          unit_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          client_id: number
          created_at?: string
          created_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          unit_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          client_id?: number
          created_at?: string
          created_by?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          source?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "limitation_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "limitation_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      metas: {
        Row: {
          alunos_ativos: number
          created_at: string
          id: string
          mes_referencia: string
          meta_experimentais: number
          meta_matriculas: number
          unidade_id: string
          updated_at: string
        }
        Insert: {
          alunos_ativos?: number
          created_at?: string
          id?: string
          mes_referencia: string
          meta_experimentais?: number
          meta_matriculas?: number
          unidade_id: string
          updated_at?: string
        }
        Update: {
          alunos_ativos?: number
          created_at?: string
          id?: string
          mes_referencia?: string
          meta_experimentais?: number
          meta_matriculas?: number
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_rules: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          event_key: string
          id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          enabled?: boolean
          event_key: string
          id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          event_key?: string
          id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          active: boolean
          body: string
          channel: string
          created_at: string
          event_key: string
          id: string
          name: string
          title: string | null
          updated_at: string
          variables: string[]
        }
        Insert: {
          active?: boolean
          body?: string
          channel?: string
          created_at?: string
          event_key: string
          id?: string
          name: string
          title?: string | null
          updated_at?: string
          variables?: string[]
        }
        Update: {
          active?: boolean
          body?: string
          channel?: string
          created_at?: string
          event_key?: string
          id?: string
          name?: string
          title?: string | null
          updated_at?: string
          variables?: string[]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          client_id: number
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          client_id: number
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          client_id?: number
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          classification: string | null
          client_id: number | null
          comment: string | null
          created_at: string
          id: string
          lead_name: string | null
          link_id: string | null
          score: number
          source: string
          unit_id: string | null
        }
        Insert: {
          classification?: string | null
          client_id?: number | null
          comment?: string | null
          created_at?: string
          id?: string
          lead_name?: string | null
          link_id?: string | null
          score: number
          source?: string
          unit_id?: string | null
        }
        Update: {
          classification?: string | null
          client_id?: number | null
          comment?: string | null
          created_at?: string
          id?: string
          lead_name?: string | null
          link_id?: string | null
          score?: number
          source?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "form_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrences: {
        Row: {
          client_id: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          owner_id: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_id: string | null
          source_table: string | null
          status: string
          title: string
          type: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          client_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          owner_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          title: string
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          owner_id?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_id?: string | null
          source_table?: string | null
          status?: string
          title?: string
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_form_submissions: {
        Row: {
          answers: Json
          attachments: Json | null
          created_at: string
          form_id: string
          id: string
          notes: string | null
          responsible_name: string | null
          status: string
          submitted_at: string
          unit_id: string | null
        }
        Insert: {
          answers?: Json
          attachments?: Json | null
          created_at?: string
          form_id: string
          id?: string
          notes?: string | null
          responsible_name?: string | null
          status?: string
          submitted_at?: string
          unit_id?: string | null
        }
        Update: {
          answers?: Json
          attachments?: Json | null
          created_at?: string
          form_id?: string
          id?: string
          notes?: string | null
          responsible_name?: string | null
          status?: string
          submitted_at?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "operational_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_forms: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          fields: Json
          id: string
          name: string
          type: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          name: string
          type?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          name?: string
          type?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      operational_routines: {
        Row: {
          checklist_form_id: string | null
          created_at: string
          created_by: string | null
          date: string | null
          day_of_week: number | null
          description: string | null
          id: string
          kind: string
          message_template: string | null
          notes: string | null
          recurrence: string | null
          responsible_name: string | null
          responsible_phone: string | null
          routine_type: string | null
          status: string
          time: string | null
          title: string
          unit_id: string | null
          updated_at: string
          whatsapp_group_link: string | null
        }
        Insert: {
          checklist_form_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          day_of_week?: number | null
          description?: string | null
          id?: string
          kind?: string
          message_template?: string | null
          notes?: string | null
          recurrence?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          routine_type?: string | null
          status?: string
          time?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Update: {
          checklist_form_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string | null
          day_of_week?: number | null
          description?: string | null
          id?: string
          kind?: string
          message_template?: string | null
          notes?: string | null
          recurrence?: string | null
          responsible_name?: string | null
          responsible_phone?: string | null
          routine_type?: string | null
          status?: string
          time?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
          whatsapp_group_link?: string | null
        }
        Relationships: []
      }
      pain_reports: {
        Row: {
          client_id: number
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          note: string | null
          status: string
          updated_at: string
          workout_log_id: string | null
        }
        Insert: {
          client_id: number
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          workout_log_id?: string | null
        }
        Update: {
          client_id?: number
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          note?: string | null
          status?: string
          updated_at?: string
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pain_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pain_reports_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_benefits: {
        Row: {
          active: boolean
          benefit_type: string
          created_at: string
          id: string
          label: string
          limit_period: string
          partner_id: string
          rules: string | null
          updated_at: string
          usage_limit: number | null
          valid_from: string | null
          valid_until: string | null
          value: number | null
        }
        Insert: {
          active?: boolean
          benefit_type?: string
          created_at?: string
          id?: string
          label: string
          limit_period?: string
          partner_id: string
          rules?: string | null
          updated_at?: string
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
        }
        Update: {
          active?: boolean
          benefit_type?: string
          created_at?: string
          id?: string
          label?: string
          limit_period?: string
          partner_id?: string
          rules?: string | null
          updated_at?: string
          usage_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_benefits_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          category: string
          code: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contract_ends_at: string | null
          contract_starts_at: string | null
          created_at: string
          description: string | null
          discount_label: string | null
          id: string
          image_url: string | null
          location: string | null
          name: string
          notes: string | null
          portal_last_seen_at: string | null
          portal_token: string | null
          portal_token_at: string | null
          redeem_instructions: string | null
          tag: string | null
          unit_ids: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_ends_at?: string | null
          contract_starts_at?: string | null
          created_at?: string
          description?: string | null
          discount_label?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name: string
          notes?: string | null
          portal_last_seen_at?: string | null
          portal_token?: string | null
          portal_token_at?: string | null
          redeem_instructions?: string | null
          tag?: string | null
          unit_ids?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contract_ends_at?: string | null
          contract_starts_at?: string | null
          created_at?: string
          description?: string | null
          discount_label?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          portal_last_seen_at?: string | null
          portal_token?: string | null
          portal_token_at?: string | null
          redeem_instructions?: string | null
          tag?: string | null
          unit_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      payroll_items: {
        Row: {
          advances: number | null
          bank_info: string | null
          bonus: number | null
          collaborator_id: string | null
          commission: number | null
          contract_type: string | null
          cpf: string | null
          created_at: string
          discounts: number | null
          id: string
          name: string
          net_value: number | null
          payment_method: string | null
          pix_key: string | null
          run_id: string
          salary: number | null
          status: string
          updated_at: string
        }
        Insert: {
          advances?: number | null
          bank_info?: string | null
          bonus?: number | null
          collaborator_id?: string | null
          commission?: number | null
          contract_type?: string | null
          cpf?: string | null
          created_at?: string
          discounts?: number | null
          id?: string
          name: string
          net_value?: number | null
          payment_method?: string | null
          pix_key?: string | null
          run_id: string
          salary?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          advances?: number | null
          bank_info?: string | null
          bonus?: number | null
          collaborator_id?: string | null
          commission?: number | null
          contract_type?: string | null
          cpf?: string | null
          created_at?: string
          discounts?: number | null
          id?: string
          name?: string
          net_value?: number | null
          payment_method?: string | null
          pix_key?: string | null
          run_id?: string
          salary?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          month: number
          notes: string | null
          status: string
          total_gross: number | null
          total_net: number | null
          unit_id: string | null
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          status?: string
          total_gross?: number | null
          total_net?: number | null
          unit_id?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          status?: string
          total_gross?: number | null
          total_net?: number | null
          unit_id?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      permission_overrides: {
        Row: {
          actions: string[]
          collaborator_id: string
          created_at: string
          id: string
          mode: string
          module: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          actions?: string[]
          collaborator_id: string
          created_at?: string
          id?: string
          mode?: string
          module: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          actions?: string[]
          collaborator_id?: string
          created_at?: string
          id?: string
          mode?: string
          module?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_overrides_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          modules: Json
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          modules?: Json
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          modules?: Json
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      physical_assessments: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: number
          created_at: string
          id: string
          next_due_at: string | null
          notes: string | null
          origin: string | null
          performed_at: string | null
          professional_id: string | null
          professional_name: string | null
          published_at: string | null
          rescheduled_from: string | null
          scheduled_at: string | null
          scheduled_by: string | null
          status: string
          student_rated_at: string | null
          student_rating: number | null
          student_rating_note: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: number
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          origin?: string | null
          performed_at?: string | null
          professional_id?: string | null
          professional_name?: string | null
          published_at?: string | null
          rescheduled_from?: string | null
          scheduled_at?: string | null
          scheduled_by?: string | null
          status?: string
          student_rated_at?: string | null
          student_rating?: number | null
          student_rating_note?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: number
          created_at?: string
          id?: string
          next_due_at?: string | null
          notes?: string | null
          origin?: string | null
          performed_at?: string | null
          professional_id?: string | null
          professional_name?: string | null
          published_at?: string | null
          rescheduled_from?: string | null
          scheduled_at?: string | null
          scheduled_by?: string | null
          status?: string
          student_rated_at?: string | null
          student_rating?: number | null
          student_rating_note?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "physical_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_assessments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          allowed_days: number[]
          allowed_end: string | null
          allowed_start: string | null
          billing_cycle: string
          created_at: string
          duration_months: number
          id: string
          name: string
          notes: string | null
          payment_tolerance_days: number
          restrict_hours: boolean
          service_id: string | null
          status: string
          unit_ids: string[]
          updated_at: string
          usage_rules: string | null
          value: number
          weekly_frequency: number | null
        }
        Insert: {
          allowed_days?: number[]
          allowed_end?: string | null
          allowed_start?: string | null
          billing_cycle?: string
          created_at?: string
          duration_months?: number
          id?: string
          name: string
          notes?: string | null
          payment_tolerance_days?: number
          restrict_hours?: boolean
          service_id?: string | null
          status?: string
          unit_ids?: string[]
          updated_at?: string
          usage_rules?: string | null
          value?: number
          weekly_frequency?: number | null
        }
        Update: {
          allowed_days?: number[]
          allowed_end?: string | null
          allowed_start?: string | null
          billing_cycle?: string
          created_at?: string
          duration_months?: number
          id?: string
          name?: string
          notes?: string | null
          payment_tolerance_days?: number
          restrict_hours?: boolean
          service_id?: string | null
          status?: string
          unit_ids?: string[]
          updated_at?: string
          usage_rules?: string | null
          value?: number
          weekly_frequency?: number | null
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          body: string | null
          booking_id: string | null
          client_id: number | null
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          kind: string
          sent_count: number
          target: string
          title: string
          unit_id: string | null
          url: string | null
        }
        Insert: {
          body?: string | null
          booking_id?: string | null
          client_id?: number | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          kind?: string
          sent_count?: number
          target?: string
          title: string
          unit_id?: string | null
          url?: string | null
        }
        Update: {
          body?: string | null
          booking_id?: string | null
          client_id?: number | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          kind?: string
          sent_count?: number
          target?: string
          title?: string
          unit_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "class_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_notifications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          active: boolean
          auth: string
          client_id: number | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          auth: string
          client_id?: number | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          auth?: string
          client_id?: number | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_benefits: {
        Row: {
          client_id: number
          created_at: string
          delivered_at: string | null
          description: string | null
          id: string
          notes: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id: number
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: number
          created_at?: string
          delivered_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_benefits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_benefits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          note: string | null
          renewal_id: string
          status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          renewal_id: string
          status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          note?: string | null
          renewal_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renewal_events_renewal_id_fkey"
            columns: ["renewal_id"]
            isOneToOne: false
            referencedRelation: "renewal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_reminders: {
        Row: {
          client_id: number
          created_at: string
          cycle_end: string
          id: string
          milestone: number
        }
        Insert: {
          client_id: number
          created_at?: string
          cycle_end: string
          id?: string
          milestone: number
        }
        Update: {
          client_id?: number
          created_at?: string
          cycle_end?: string
          id?: string
          milestone?: number
        }
        Relationships: [
          {
            foreignKeyName: "renewal_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      renewal_requests: {
        Row: {
          assigned_to: string | null
          client_id: number
          closed_at: string | null
          contract_id: string | null
          created_at: string
          current_plan: string | null
          current_value: number | null
          cycle_end: string | null
          desired_plan: string | null
          first_action_at: string | null
          id: string
          next_cycle_end: string | null
          next_cycle_start: string | null
          notes: string | null
          payment_method: string | null
          proposal_link_id: string | null
          proposal_plan: string | null
          proposal_value: number | null
          retro_link_id: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: number
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          current_plan?: string | null
          current_value?: number | null
          cycle_end?: string | null
          desired_plan?: string | null
          first_action_at?: string | null
          id?: string
          next_cycle_end?: string | null
          next_cycle_start?: string | null
          notes?: string | null
          payment_method?: string | null
          proposal_link_id?: string | null
          proposal_plan?: string | null
          proposal_value?: number | null
          retro_link_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: number
          closed_at?: string | null
          contract_id?: string | null
          created_at?: string
          current_plan?: string | null
          current_value?: number | null
          cycle_end?: string | null
          desired_plan?: string | null
          first_action_at?: string | null
          id?: string
          next_cycle_end?: string | null
          next_cycle_start?: string | null
          notes?: string | null
          payment_method?: string | null
          proposal_link_id?: string | null
          proposal_plan?: string | null
          proposal_value?: number | null
          retro_link_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "client_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_proposal_link_id_fkey"
            columns: ["proposal_link_id"]
            isOneToOne: false
            referencedRelation: "form_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewal_requests_retro_link_id_fkey"
            columns: ["retro_link_id"]
            isOneToOne: false
            referencedRelation: "form_links"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: number | null
          created_at: string | null
          id: string
          installments: number | null
          payment_method: string | null
          type: string | null
          unit_id: string | null
          value: number
        }
        Insert: {
          client_id?: number | null
          created_at?: string | null
          id?: string
          installments?: number | null
          payment_method?: string | null
          type?: string | null
          unit_id?: string | null
          value: number
        }
        Update: {
          client_id?: number | null
          created_at?: string | null
          id?: string
          installments?: number | null
          payment_method?: string | null
          type?: string | null
          unit_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          accounting_code: string | null
          category: string | null
          created_at: string
          default_value: number | null
          description: string
          financial_nature: string | null
          id: string
          notes: string | null
          receipt_only: boolean
          revenue_center: string | null
          show_on_receipt: boolean
          status: string
          tax_type: string | null
          updated_at: string
        }
        Insert: {
          accounting_code?: string | null
          category?: string | null
          created_at?: string
          default_value?: number | null
          description: string
          financial_nature?: string | null
          id?: string
          notes?: string | null
          receipt_only?: boolean
          revenue_center?: string | null
          show_on_receipt?: boolean
          status?: string
          tax_type?: string | null
          updated_at?: string
        }
        Update: {
          accounting_code?: string | null
          category?: string | null
          created_at?: string
          default_value?: number | null
          description?: string
          financial_nature?: string | null
          id?: string
          notes?: string | null
          receipt_only?: boolean
          revenue_center?: string | null
          show_on_receipt?: boolean
          status?: string
          tax_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shift_closures: {
        Row: {
          answers: Json
          collaborator_id: string | null
          collaborator_name: string | null
          created_at: string
          date: string
          id: string
          sector: string
          shift: string
          started_at: string
          status: string
          submitted_at: string | null
          summary: string | null
          system_data: Json
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          collaborator_id?: string | null
          collaborator_name?: string | null
          created_at?: string
          date?: string
          id?: string
          sector: string
          shift?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          summary?: string | null
          system_data?: Json
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          collaborator_id?: string | null
          collaborator_name?: string | null
          created_at?: string
          date?: string
          id?: string
          sector?: string
          shift?: string
          started_at?: string
          status?: string
          submitted_at?: string | null
          summary?: string | null
          system_data?: Json
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_closures_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_closures_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handover_reads: {
        Row: {
          closure_id: string
          collaborator_id: string | null
          collaborator_name: string | null
          created_at: string
          id: string
          read_at: string
        }
        Insert: {
          closure_id: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          created_at?: string
          id?: string
          read_at?: string
        }
        Update: {
          closure_id?: string
          collaborator_id?: string | null
          collaborator_name?: string | null
          created_at?: string
          id?: string
          read_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_handover_reads_closure_id_fkey"
            columns: ["closure_id"]
            isOneToOne: false
            referencedRelation: "shift_closures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handover_reads_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_schedules: {
        Row: {
          break_minutes: number | null
          collaborator_id: string
          created_at: string
          day_type: string
          end_time: string | null
          id: string
          notes: string | null
          published_at: string | null
          published_by: string | null
          role_title: string | null
          schedule_date: string
          start_time: string | null
          status: string
          supervisor_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          break_minutes?: number | null
          collaborator_id: string
          created_at?: string
          day_type?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          role_title?: string | null
          schedule_date: string
          start_time?: string | null
          status?: string
          supervisor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          break_minutes?: number | null
          collaborator_id?: string
          created_at?: string
          day_type?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          role_title?: string | null
          schedule_date?: string
          start_time?: string | null
          status?: string
          supervisor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_schedules_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_schedules_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_swap_requests: {
        Row: {
          accepted_at: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          reason: string | null
          requester_id: string
          schedule_id: string
          status: string
          target_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string | null
          requester_id: string
          schedule_id: string
          status?: string
          target_id: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          reason?: string | null
          requester_id?: string
          schedule_id?: string
          status?: string
          target_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "shift_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_swap_requests_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_notifications: {
        Row: {
          body: string | null
          collaborator_id: string
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          collaborator_id: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          collaborator_id?: string
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_notifications_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          cleaning_hours: string | null
          cleaning_name: string | null
          created_at: string
          date_label: string | null
          id: string
          is_holiday: boolean
          month: number
          notes: string | null
          reception_hours: string | null
          reception_name: string | null
          schedule_date: string | null
          security_hours: string | null
          security_name: string | null
          trainer_hours: string | null
          trainer_name: string | null
          unit_id: string | null
          updated_at: string
          weekend_number: number | null
          year: number
        }
        Insert: {
          cleaning_hours?: string | null
          cleaning_name?: string | null
          created_at?: string
          date_label?: string | null
          id?: string
          is_holiday?: boolean
          month: number
          notes?: string | null
          reception_hours?: string | null
          reception_name?: string | null
          schedule_date?: string | null
          security_hours?: string | null
          security_name?: string | null
          trainer_hours?: string | null
          trainer_name?: string | null
          unit_id?: string | null
          updated_at?: string
          weekend_number?: number | null
          year: number
        }
        Update: {
          cleaning_hours?: string | null
          cleaning_name?: string | null
          created_at?: string
          date_label?: string | null
          id?: string
          is_holiday?: boolean
          month?: number
          notes?: string | null
          reception_hours?: string | null
          reception_name?: string | null
          schedule_date?: string | null
          security_hours?: string | null
          security_name?: string | null
          trainer_hours?: string | null
          trainer_name?: string | null
          unit_id?: string | null
          updated_at?: string
          weekend_number?: number | null
          year?: number
        }
        Relationships: []
      }
      student_preferences: {
        Row: {
          client_id: number
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          client_id: number
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          client_id?: number
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "student_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_preferences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank: string | null
          bank_account: string | null
          bank_agency: string | null
          category: string | null
          city: string | null
          cnpj: string | null
          commission: number | null
          complement: string | null
          created_at: string
          email: string | null
          id: string
          min_delivery_days: number | null
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          phone: string | null
          pix_key: string | null
          responsible: string | null
          state: string | null
          status: string
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          bank?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          category?: string | null
          city?: string | null
          cnpj?: string | null
          commission?: number | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          min_delivery_days?: number | null
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          pix_key?: string | null
          responsible?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          bank?: string | null
          bank_account?: string | null
          bank_agency?: string | null
          category?: string | null
          city?: string | null
          cnpj?: string | null
          commission?: number | null
          complement?: string | null
          created_at?: string
          email?: string | null
          id?: string
          min_delivery_days?: number | null
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          phone?: string | null
          pix_key?: string | null
          responsible?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      template_exercises: {
        Row: {
          id: string
          load: string | null
          name: string
          notes: string | null
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          sort_order: number | null
          template_session_id: string
        }
        Insert: {
          id?: string
          load?: string | null
          name: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number | null
          template_session_id: string
        }
        Update: {
          id?: string
          load?: string | null
          name?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          sort_order?: number | null
          template_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_template_session_id_fkey"
            columns: ["template_session_id"]
            isOneToOne: false
            referencedRelation: "template_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sessions: {
        Row: {
          day_label: string | null
          duration_min: number | null
          id: string
          name: string | null
          notes: string | null
          sort_order: number | null
          template_id: string
        }
        Insert: {
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          sort_order?: number | null
          template_id: string
        }
        Update: {
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string | null
          notes?: string | null
          sort_order?: number | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          adjust_reason: string | null
          adjusted_at: string | null
          adjusted_by: string | null
          collaborator_id: string
          created_at: string
          device: string | null
          distance_m: number | null
          entry_date: string
          id: string
          kind: string
          latitude: number | null
          longitude: number | null
          photo_url: string | null
          recorded_at: string
          request_reason: string | null
          status: string
          unit_id: string | null
          updated_at: string
          within_radius: boolean
        }
        Insert: {
          adjust_reason?: string | null
          adjusted_at?: string | null
          adjusted_by?: string | null
          collaborator_id: string
          created_at?: string
          device?: string | null
          distance_m?: number | null
          entry_date?: string
          id?: string
          kind: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          recorded_at?: string
          request_reason?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          within_radius?: boolean
        }
        Update: {
          adjust_reason?: string | null
          adjusted_at?: string | null
          adjusted_by?: string | null
          collaborator_id?: string
          created_at?: string
          device?: string | null
          distance_m?: number | null
          entry_date?: string
          id?: string
          kind?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string | null
          recorded_at?: string
          request_reason?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          within_radius?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      training_exercise_sets: {
        Row: {
          cadence: string | null
          created_at: string
          distance_km: number | null
          id: string
          incline: string | null
          load: string | null
          method_id: string | null
          notes: string | null
          order_index: number
          pace: string | null
          reps: string | null
          rest_seconds: number | null
          session_exercise_id: string
          set_type: string
          sets: number
          time_seconds: number | null
        }
        Insert: {
          cadence?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          incline?: string | null
          load?: string | null
          method_id?: string | null
          notes?: string | null
          order_index?: number
          pace?: string | null
          reps?: string | null
          rest_seconds?: number | null
          session_exercise_id: string
          set_type?: string
          sets?: number
          time_seconds?: number | null
        }
        Update: {
          cadence?: string | null
          created_at?: string
          distance_km?: number | null
          id?: string
          incline?: string | null
          load?: string | null
          method_id?: string | null
          notes?: string | null
          order_index?: number
          pace?: string | null
          reps?: string | null
          rest_seconds?: number | null
          session_exercise_id?: string
          set_type?: string
          sets?: number
          time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_exercise_sets_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "training_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_exercise_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "training_session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      training_methods: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_template: string | null
          id: string
          is_global: boolean
          name: string
          params: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_template?: string | null
          id?: string
          is_global?: boolean
          name: string
          params?: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_template?: string | null
          id?: string
          is_global?: boolean
          name?: string
          params?: Json
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          coach_id: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          frequency: string | null
          goal: string | null
          id: string
          is_active: boolean
          level: string | null
          name: string
          organization_type: string
          starts_at: string | null
          status: string
          student_id: number
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          frequency?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name: string
          organization_type?: string
          starts_at?: string | null
          status?: string
          student_id: number
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          frequency?: string | null
          goal?: string | null
          id?: string
          is_active?: boolean
          level?: string | null
          name?: string
          organization_type?: string
          starts_at?: string | null
          status?: string
          student_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      training_session_exercises: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          order_index: number
          training_session_id: string
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          order_index?: number
          training_session_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          order_index?: number
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_exercises_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          created_at: string
          day_of_week: string | null
          id: string
          name: string
          notes: string | null
          order_index: number
          session_number: number | null
          training_week_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: string | null
          id?: string
          name: string
          notes?: string | null
          order_index?: number
          session_number?: number | null
          training_week_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: string | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          session_number?: number | null
          training_week_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_training_week_id_fkey"
            columns: ["training_week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_set_presets: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          set_type: string
          sets: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          set_type?: string
          sets?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          set_type?: string
          sets?: Json
          updated_at?: string
        }
        Relationships: []
      }
      training_weeks: {
        Row: {
          created_at: string
          id: string
          name: string | null
          training_plan_id: string
          week_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          training_plan_id: string
          week_number: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          training_plan_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_weeks_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          category_name: string | null
          client_id: number | null
          cost_center: string | null
          created_at: string
          date: string
          description: string
          due_date: string | null
          group_id: string | null
          id: string
          kind: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          reference: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category_id?: string | null
          category_name?: string | null
          client_id?: number | null
          cost_center?: string | null
          created_at?: string
          date?: string
          description: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          category_name?: string | null
          client_id?: number | null
          cost_center?: string | null
          created_at?: string
          date?: string
          description?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "financial_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          default_capacity: number
          default_weekly_goal: number
          email: string | null
          fiscal_address: string | null
          id: string
          latitude: number | null
          legal_name: string | null
          longitude: number | null
          municipal_registration: string | null
          name: string
          opening_hours: Json
          phone: string | null
          state_registration: string | null
          status: string
          timeclock_radius_m: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          default_capacity?: number
          default_weekly_goal?: number
          email?: string | null
          fiscal_address?: string | null
          id?: string
          latitude?: number | null
          legal_name?: string | null
          longitude?: number | null
          municipal_registration?: string | null
          name: string
          opening_hours?: Json
          phone?: string | null
          state_registration?: string | null
          status?: string
          timeclock_radius_m?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string | null
          default_capacity?: number
          default_weekly_goal?: number
          email?: string | null
          fiscal_address?: string | null
          id?: string
          latitude?: number | null
          legal_name?: string | null
          longitude?: number | null
          municipal_registration?: string | null
          name?: string
          opening_hours?: Json
          phone?: string | null
          state_registration?: string | null
          status?: string
          timeclock_radius_m?: number
          updated_at?: string
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
      weight_goals: {
        Row: {
          achieved_at: string | null
          active: boolean
          client_id: number
          created_at: string
          id: string
          start_value: number | null
          target: number
        }
        Insert: {
          achieved_at?: string | null
          active?: boolean
          client_id: number
          created_at?: string
          id?: string
          start_value?: number | null
          target: number
        }
        Update: {
          achieved_at?: string | null
          active?: boolean
          client_id?: number
          created_at?: string
          id?: string
          start_value?: number | null
          target?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weight_goals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          day_label: string | null
          id: string
          load: string | null
          name: string
          notes: string | null
          reps: string | null
          rest_seconds: number | null
          session_id: string | null
          sets: number | null
          sort_order: number | null
          workout_id: string
        }
        Insert: {
          day_label?: string | null
          id?: string
          load?: string | null
          name: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          session_id?: string | null
          sets?: number | null
          sort_order?: number | null
          workout_id: string
        }
        Update: {
          day_label?: string | null
          id?: string
          load?: string | null
          name?: string
          notes?: string | null
          reps?: string | null
          rest_seconds?: number | null
          session_id?: string | null
          sets?: number | null
          sort_order?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_log_sets: {
        Row: {
          completed: boolean
          created_at: string
          exercise_name: string
          exercise_order: number
          id: string
          order_index: number
          performed_calories: number | null
          performed_distance_km: number | null
          performed_incline: string | null
          performed_load: string | null
          performed_reps: string | null
          performed_sets: number | null
          performed_speed: number | null
          performed_time_seconds: number | null
          prescribed_load: string | null
          prescribed_reps: string | null
          prescribed_set_id: string | null
          prescribed_sets: number | null
          session_exercise_id: string | null
          set_type: string | null
          updated_at: string
          workout_log_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          exercise_name: string
          exercise_order?: number
          id?: string
          order_index?: number
          performed_calories?: number | null
          performed_distance_km?: number | null
          performed_incline?: string | null
          performed_load?: string | null
          performed_reps?: string | null
          performed_sets?: number | null
          performed_speed?: number | null
          performed_time_seconds?: number | null
          prescribed_load?: string | null
          prescribed_reps?: string | null
          prescribed_set_id?: string | null
          prescribed_sets?: number | null
          session_exercise_id?: string | null
          set_type?: string | null
          updated_at?: string
          workout_log_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          exercise_name?: string
          exercise_order?: number
          id?: string
          order_index?: number
          performed_calories?: number | null
          performed_distance_km?: number | null
          performed_incline?: string | null
          performed_load?: string | null
          performed_reps?: string | null
          performed_sets?: number | null
          performed_speed?: number | null
          performed_time_seconds?: number | null
          prescribed_load?: string | null
          prescribed_reps?: string | null
          prescribed_set_id?: string | null
          prescribed_sets?: number | null
          session_exercise_id?: string | null
          set_type?: string | null
          updated_at?: string
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_log_sets_prescribed_set_id_fkey"
            columns: ["prescribed_set_id"]
            isOneToOne: false
            referencedRelation: "training_exercise_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_log_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "training_session_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_log_sets_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          client_id: number
          created_at: string
          finished_at: string | null
          followup_note: string | null
          followup_stars: number | null
          id: string
          pain: boolean | null
          pain_note: string | null
          rpe: number | null
          session_name: string | null
          started_at: string
          status: string
          student_notes: string | null
          training_plan_id: string | null
          training_session_id: string | null
          updated_at: string
          workout_date: string
        }
        Insert: {
          client_id: number
          created_at?: string
          finished_at?: string | null
          followup_note?: string | null
          followup_stars?: number | null
          id?: string
          pain?: boolean | null
          pain_note?: string | null
          rpe?: number | null
          session_name?: string | null
          started_at?: string
          status?: string
          student_notes?: string | null
          training_plan_id?: string | null
          training_session_id?: string | null
          updated_at?: string
          workout_date?: string
        }
        Update: {
          client_id?: number
          created_at?: string
          finished_at?: string | null
          followup_note?: string | null
          followup_stars?: number | null
          id?: string
          pain?: boolean | null
          pain_note?: string | null
          rpe?: number | null
          session_name?: string | null
          started_at?: string
          status?: string
          student_notes?: string | null
          training_plan_id?: string | null
          training_session_id?: string | null
          updated_at?: string
          workout_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          created_at: string
          day_label: string | null
          duration_min: number | null
          id: string
          name: string
          notes: string | null
          sort_order: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string
          notes?: string | null
          sort_order?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          day_label?: string | null
          duration_min?: number | null
          id?: string
          name?: string
          notes?: string | null
          sort_order?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          client_id: number | null
          created_at: string | null
          description: string | null
          expires_at: string | null
          id: string
          name: string
          starts_at: string | null
          status: string | null
          updated_at: string | null
          week: number | null
        }
        Insert: {
          client_id?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          week?: number | null
        }
        Update: {
          client_id?: number | null
          created_at?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          name?: string
          starts_at?: string | null
          status?: string | null
          updated_at?: string | null
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "client_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          key: string
          label: string
          points: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          key: string
          label: string
          points?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          key?: string
          label?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      client_overview: {
        Row: {
          assessment_overdue: boolean | null
          auth_user_id: string | null
          avatar_url: string | null
          contract_end: string | null
          contract_start: string | null
          cpf: string | null
          created_at: string | null
          crm_owner_id: string | null
          crm_owner_name: string | null
          days_since_activity: number | null
          email: string | null
          financial_state: string | null
          id: number | null
          last_activity: string | null
          last_assessment: string | null
          limitations: string | null
          name: string | null
          objective: string | null
          open_alerts: number | null
          open_occurrences: number | null
          pending_renewals: number | null
          phone: string | null
          plan: string | null
          plan_expires_at: string | null
          plan_value: number | null
          status: string | null
          training_overdue: boolean | null
          unit_id: string | null
          visit_type: string | null
          weekly_goal: number | null
          workouts_30d: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_crm_owner_id_fkey"
            columns: ["crm_owner_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ack_limitation_alert: { Args: { _alert_id: string }; Returns: Json }
      allowed_unit_ids: { Args: { _user_id: string }; Returns: string[] }
      assessment_cancel: {
        Args: { _id: string; _reason?: string }
        Returns: Json
      }
      assessment_dashboard: {
        Args: { _from?: string; _to?: string; _unit_id?: string }
        Returns: Json
      }
      assessment_list: {
        Args: { _from?: string; _to?: string; _unit_id?: string }
        Returns: {
          client_id: number
          client_name: string
          created_at: string
          id: string
          next_due_at: string
          origin: string
          performed_at: string
          professional_id: string
          professional_name: string
          published_at: string
          revisions: number
          scheduled_at: string
          status: string
          student_rating: number
          unit_id: string
        }[]
      }
      assessment_publish: {
        Args: {
          _bio: Json
          _id: string
          _measures: Json
          _next_due?: string
          _notes?: string
          _origin: string
          _reason?: string
        }
        Returns: Json
      }
      assessment_rate: {
        Args: { _id: string; _note?: string; _rating: number }
        Returns: Json
      }
      assessment_reschedule: {
        Args: { _at: string; _id: string; _professional_id?: string }
        Returns: Json
      }
      assessment_schedule: {
        Args: {
          _at: string
          _client_id: number
          _notes?: string
          _professional_id?: string
        }
        Returns: Json
      }
      assessment_set_status: {
        Args: { _id: string; _status: string }
        Returns: Json
      }
      assign_professor: {
        Args: { _booking_id: string; _collaborator_id: string }
        Returns: Json
      }
      bank_auto_match: {
        Args: { _bank_account_id: string; _batch_id?: string }
        Returns: Json
      }
      bank_create_entry: {
        Args: {
          _category_name: string
          _client_id?: number
          _cost_center?: string
          _description?: string
          _movement_id: string
        }
        Returns: Json
      }
      bank_match_candidates: {
        Args: { _movement_id: string }
        Returns: {
          amount: number
          client_id: number
          confidence: number
          due_date: string
          exact: boolean
          label: string
          target_id: string
          target_type: string
        }[]
      }
      bank_reconcile: {
        Args: { _movement_id: string; _target_id: string; _target_type: string }
        Returns: Json
      }
      bank_set_status: {
        Args: { _movement_id: string; _notes?: string; _status: string }
        Returns: undefined
      }
      bank_split: {
        Args: { _movement_id: string; _parts: number[] }
        Returns: Json
      }
      book_class: {
        Args: { _class_date: string; _class_id: string; _muscle_group: string }
        Returns: Json
      }
      br_now: { Args: never; Returns: string }
      can_consolidated: { Args: { _user_id: string }; Returns: boolean }
      can_manage_training: { Args: { _user_id: string }; Returns: boolean }
      can_module: {
        Args: { _action: string; _module: string; _user_id: string }
        Returns: boolean
      }
      cancel_booking: { Args: { _booking_id: string }; Returns: Json }
      cfg_bool: {
        Args: { _default: boolean; _field: string; _key: string }
        Returns: boolean
      }
      cfg_num: {
        Args: { _default: number; _field: string; _key: string }
        Returns: number
      }
      class_booking_counts: {
        Args: { _day: number }
        Returns: {
          class_id: string
          total: number
        }[]
      }
      class_day_status: {
        Args: { _class_date: string }
        Returns: {
          booked: number
          class_id: string
          my_booking_id: string
          my_muscle_group: string
          my_waitlist_position: number
          waiting: number
        }[]
      }
      clear_slot_override: {
        Args: { _class_date: string; _class_id: string }
        Returns: Json
      }
      client_attendance_stats: { Args: { _client_id: number }; Returns: Json }
      client_grace_days: { Args: { _client: number }; Returns: number }
      client_health_overview: { Args: { _client_id: number }; Returns: Json }
      client_timeline: {
        Args: {
          _client_id: number
          _kinds?: string[]
          _limit?: number
          _offset?: number
        }
        Returns: {
          detail: string
          kind: string
          meta: Json
          occurred_at: string
          title: string
        }[]
      }
      club_alerts: {
        Args: { _days?: number }
        Returns: {
          benefit_id: string
          days_left: number
          expires_at: string
          kind: string
          label: string
          partner_id: string
          partner_name: string
        }[]
      }
      club_benefit_check: {
        Args: { _benefit_id: string; _student_id: string }
        Returns: Json
      }
      club_dashboard: {
        Args: { _from?: string; _to?: string; _unit_id?: string }
        Returns: Json
      }
      club_estimate_saving: {
        Args: { _purchase: number; _type: string; _value: number }
        Returns: number
      }
      club_limit_window_start: {
        Args: { _period: string; _ref: string }
        Returns: string
      }
      club_redeem: {
        Args: {
          _benefit_id: string
          _confirmed_by?: string
          _purchase_amount?: number
          _source?: string
          _student_id: string
          _unit_id?: string
        }
        Returns: Json
      }
      collaborator_scores: {
        Args: { _from: string; _to: string; _unit_id: string }
        Returns: {
          assessments: number
          avg_stars: number
          breakdown: Json
          collaborator_id: string
          conversions: number
          full_name: string
          plans_updated: number
          rank: number
          role_title: string
          score: number
          sessions_done: number
          trials: number
          unique_students: number
          unit_id: string
        }[]
      }
      commission_report: {
        Args: { _from: string; _to: string; _unit_id?: string }
        Returns: {
          amount: number
          base_value: number
          client_id: number
          client_name: string
          collaborator_id: string
          collaborator_name: string
          conversion_id: string
          entry_id: string
          reference_date: string
          role: string
          rule: string
          unit_id: string
        }[]
      }
      complete_evo_cycle: { Args: { _stats?: Json }; Returns: Json }
      confirm_waitlist: { Args: { _waitlist_id: string }; Returns: Json }
      contract_new_version: {
        Args: { _body?: string; _contract: string; _title?: string }
        Returns: string
      }
      contract_send_link: {
        Args: { _channel?: string; _contract: string; _days?: number }
        Returns: Json
      }
      contract_sign_link: {
        Args: { p_cpf?: string; p_name: string; p_token: string }
        Returns: Json
      }
      contract_sign_public: {
        Args: {
          p_agent?: string
          p_cpf?: string
          p_name: string
          p_token: string
        }
        Returns: Json
      }
      contracts_expire_overdue: { Args: never; Returns: number }
      create_indication: {
        Args: { _name: string; _phone: string }
        Returns: Json
      }
      current_client_id: { Args: never; Returns: number }
      current_collaborator_id: { Args: never; Returns: string }
      effective_capacity: {
        Args: { _class_date: string; _class_id: string }
        Returns: number
      }
      evo_cycle_state: { Args: never; Returns: Json }
      fin_adjust: {
        Args: {
          _amount: number
          _coupon?: string
          _kind: string
          _reason?: string
          _transaction_id: string
        }
        Returns: string
      }
      fin_close_period: {
        Args: { _end: string; _notes?: string; _start: string; _unit: string }
        Returns: string
      }
      fin_delinquency: {
        Args: { _ref?: string; _unit?: string }
        Returns: {
          amount: number
          bucket: string
          client_id: number
          client_name: string
          days_late: number
          description: string
          due_date: string
          id: string
          phone: string
          status: string
          unit_id: string
          unit_name: string
        }[]
      }
      fin_dre: {
        Args: {
          _allocate?: boolean
          _end?: string
          _start?: string
          _unit?: string
        }
        Returns: {
          allocated: number
          amount: number
          category_name: string
          cost_center: string
          group_name: string
          kind: string
          month: number
          unit_id: string
          unit_name: string
        }[]
      }
      fin_forecast: {
        Args: { _from: string; _to: string; _unit_id: string }
        Returns: Json
      }
      fin_reopen_period: {
        Args: { _id: string; _reason?: string }
        Returns: undefined
      }
      forecast_settle: { Args: { _snapshot_id: string }; Returns: Json }
      form_link_open: { Args: { p_token: string }; Returns: Json }
      form_link_submit: {
        Args: { p_payload: Json; p_token: string }
        Returns: Json
      }
      gamification_state: { Args: never; Returns: Json }
      geo_distance_m: {
        Args: { _lat1: number; _lat2: number; _lng1: number; _lng2: number }
        Returns: number
      }
      grade_day_roster: {
        Args: { _class_date: string; _unit_id?: string }
        Returns: {
          attendance_status: string
          avatar_url: string
          booking_id: string
          class_id: string
          client_id: number
          collaborator_id: string
          is_trial: boolean
          kind: string
          locked: boolean
          muscle_group: string
          professor_name: string
          started_at: string
          student_name: string
          waitlist_position: number
          waitlisted: boolean
        }[]
      }
      grade_day_slots: {
        Args: { _class_date: string; _unit_id?: string }
        Returns: {
          absent: number
          blocked: boolean
          booked: number
          capacity: number
          capacity_override: number
          class_id: string
          end_time: string
          name: string
          present: number
          reason: string
          start_time: string
          trainer: string
          trials: number
          unit_id: string
          waiting: number
        }[]
      }
      handover_ack: { Args: { _closure_id: string }; Returns: Json }
      has_financial_release: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      health_correct_bp: {
        Args: {
          _diastolic: number
          _id: string
          _reason: string
          _systolic: number
        }
        Returns: Json
      }
      health_correct_weight: {
        Args: { _id: string; _reason: string; _value: number }
        Returns: Json
      }
      health_record_bp: {
        Args: {
          _client_id: number
          _diastolic: number
          _measured_at?: string
          _systolic: number
        }
        Returns: Json
      }
      health_record_weight: {
        Args: { _client_id: number; _measured_at?: string; _value: number }
        Returns: Json
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_top_management: { Args: { _user_id: string }; Returns: boolean }
      join_waitlist: {
        Args: { _class_date: string; _class_id: string; _muscle_group: string }
        Returns: Json
      }
      leave_waitlist: {
        Args: { _class_date: string; _class_id: string }
        Returns: Json
      }
      link_client_by_email: { Args: { _email: string }; Returns: Json }
      module_actions: {
        Args: { _module: string; _user_id: string }
        Returns: string[]
      }
      my_admin_access: { Args: never; Returns: Json }
      occurrence_assign: {
        Args: { _collaborator_id: string; _id: string }
        Returns: Json
      }
      occurrence_list: {
        Args: { _from?: string; _to?: string; _unit_id?: string }
        Returns: {
          client_id: number
          client_name: string
          created_at: string
          description: string
          id: string
          owner_id: string
          owner_name: string
          resolution_note: string
          resolved_at: string
          severity: string
          source_table: string
          status: string
          title: string
          type: string
          unit_id: string
        }[]
      }
      occurrence_set_status: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: Json
      }
      operational_dashboard: {
        Args: { _from: string; _to: string; _unit_id: string }
        Returns: Json
      }
      operational_ruler: { Args: never; Returns: Json }
      partner_portal_open: { Args: { p_token: string }; Returns: Json }
      partner_portal_rotate: { Args: { _partner_id: string }; Returns: string }
      plan_blocked: { Args: { _client: number }; Returns: boolean }
      plan_state: { Args: never; Returns: Json }
      post_likers: {
        Args: { _post_id: string }
        Returns: {
          client_id: number
          name: string
        }[]
      }
      punch_clock: {
        Args: {
          _device?: string
          _kind: string
          _latitude: number
          _longitude: number
          _photo_url: string
          _reason?: string
          _unit_id?: string
        }
        Returns: Json
      }
      purge_old_notifications: { Args: never; Returns: undefined }
      ranking_scores: {
        Args: { _from?: string; _unit_id?: string }
        Returns: {
          class_checkins: number
          client_id: number
          daily_checkins: number
          name: string
          points: number
          posts: number
          streak: number
          unit_id: string
          workouts: number
        }[]
      }
      refresh_attendance_alerts: { Args: never; Returns: number }
      register_conversion: {
        Args: {
          _client_id: number
          _enrollment_date?: string
          _first_monthly_value: number
          _notes?: string
          _registrar_id?: string
          _seller_id?: string
          _trial_booking_id?: string
          _trial_professor_id?: string
          _unit_id?: string
        }
        Returns: Json
      }
      renewal_assign: {
        Args: { _collaborator: string; _id: string; _note?: string }
        Returns: Json
      }
      renewal_dashboard: {
        Args: { _from?: string; _to?: string; _unit?: string }
        Returns: Json
      }
      renewal_link: { Args: { _id: string; _kind: string }; Returns: Json }
      renewal_link_open: { Args: { p_token: string }; Returns: Json }
      renewal_ruler: { Args: never; Returns: Json }
      renewal_set_status: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: Json
      }
      schedule_copy_previous: {
        Args: { _from_date: string; _to_date: string; _unit_id: string }
        Returns: Json
      }
      schedule_publish: { Args: { _ids: string[] }; Returns: Json }
      set_attendance: {
        Args: { _booking_id: string; _status: string }
        Returns: Json
      }
      set_slot_override: {
        Args: {
          _blocked: boolean
          _capacity: number
          _class_date: string
          _class_id: string
          _reason: string
        }
        Returns: Json
      }
      shift_closure_prefill: {
        Args: { _date: string; _sector: string; _unit_id: string }
        Returns: Json
      }
      shift_closure_submit: {
        Args: { _id: string; _summary: string }
        Returns: Json
      }
      sign_contract: {
        Args: { _contract: string; _cpf: string; _name: string }
        Returns: Json
      }
      slot_blocked: {
        Args: { _class_date: string; _class_id: string }
        Returns: boolean
      }
      start_assigned_session: { Args: { _booking_id: string }; Returns: Json }
      student_quick_summary: { Args: { _client_id: number }; Returns: Json }
      student_xp: {
        Args: { _client_id: number; _from?: string; _to?: string }
        Returns: {
          key: string
          label: string
          occurrences: number
          points: number
          total: number
        }[]
      }
      swap_decide: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: Json
      }
      swap_request: {
        Args: { _reason: string; _schedule_id: string; _target_id: string }
        Returns: Json
      }
      swap_respond: { Args: { _accept: boolean; _id: string }; Returns: Json }
      sync_achievements: { Args: never; Returns: Json }
      time_entry_adjust: {
        Args: {
          _approve?: boolean
          _id: string
          _kind: string
          _reason: string
          _recorded_at: string
        }
        Returns: Json
      }
      timeclock_report: {
        Args: {
          _collaborator_id?: string
          _from: string
          _to: string
          _unit_id: string
        }
        Returns: {
          adjust_reason: string
          adjusted_at: string
          collaborator_id: string
          collaborator_name: string
          device: string
          distance_m: number
          entry_date: string
          expected_end: string
          expected_start: string
          id: string
          kind: string
          latitude: number
          longitude: number
          photo_url: string
          radius_m: number
          recorded_at: string
          request_reason: string
          status: string
          unit_id: string
          unit_name: string
          within_radius: boolean
        }[]
      }
      unassign_professor: { Args: { _booking_id: string }; Returns: Json }
      update_limitations: {
        Args: { _client_id: number; _limitations: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "coordinator" | "student" | "viewer"
      lead_nivel_interesse: "alto" | "medio" | "baixo"
      lead_status_funil:
        | "novo"
        | "contato_inicial"
        | "aula_agendada"
        | "aula_realizada"
        | "follow_up"
        | "negociacao"
        | "convertido"
        | "perdido"
      lead_taxa_status: "pendente" | "pago" | "isento"
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
      app_role: ["admin", "coach", "coordinator", "student", "viewer"],
      lead_nivel_interesse: ["alto", "medio", "baixo"],
      lead_status_funil: [
        "novo",
        "contato_inicial",
        "aula_agendada",
        "aula_realizada",
        "follow_up",
        "negociacao",
        "convertido",
        "perdido",
      ],
      lead_taxa_status: ["pendente", "pago", "isento"],
    },
  },
} as const
