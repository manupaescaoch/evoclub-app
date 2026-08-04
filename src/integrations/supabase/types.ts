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
      anamnesis: {
        Row: {
          client_id: number
          content: string | null
          created_at: string | null
          id: string
          type: string | null
        }
        Insert: {
          client_id: number
          content?: string | null
          created_at?: string | null
          id?: string
          type?: string | null
        }
        Update: {
          client_id?: number
          content?: string | null
          created_at?: string | null
          id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anamnesis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          metadata: Json
          unit_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
          unit_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          metadata?: Json
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
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      class_bookings: {
        Row: {
          booked_at: string | null
          checked_in_at: string | null
          class_id: string | null
          client_id: number | null
          id: string
          muscle_group: string | null
          status: string | null
          student_name: string | null
        }
        Insert: {
          booked_at?: string | null
          checked_in_at?: string | null
          class_id?: string | null
          client_id?: number | null
          id?: string
          muscle_group?: string | null
          status?: string | null
          student_name?: string | null
        }
        Update: {
          booked_at?: string | null
          checked_in_at?: string | null
          class_id?: string | null
          client_id?: number | null
          id?: string
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
      clients: {
        Row: {
          contract_end: string | null
          contract_start: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          gender: string | null
          id: number
          name: string
          observations: string | null
          phone: string | null
          plan: string | null
          plan_value: number | null
          status: string | null
          unit_id: string | null
          visit_type: string | null
        }
        Insert: {
          contract_end?: string | null
          contract_start?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: number
          name: string
          observations?: string | null
          phone?: string | null
          plan?: string | null
          plan_value?: number | null
          status?: string | null
          unit_id?: string | null
          visit_type?: string | null
        }
        Update: {
          contract_end?: string | null
          contract_start?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          gender?: string | null
          id?: number
          name?: string
          observations?: string | null
          phone?: string | null
          plan?: string | null
          plan_value?: number | null
          status?: string | null
          unit_id?: string | null
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborators: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          hired_at: string | null
          id: string
          internal_notes: string | null
          permission_profile_id: string | null
          phone: string | null
          photo_url: string | null
          role_title: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hired_at?: string | null
          id?: string
          internal_notes?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hired_at?: string | null
          id?: string
          internal_notes?: string | null
          permission_profile_id?: string | null
          phone?: string | null
          photo_url?: string | null
          role_title?: string | null
          status?: string
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
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          due_time: string | null
          id: string
          priority: string
          responsible_name: string | null
          responsible_phone: string | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          responsible_name?: string | null
          responsible_phone?: string | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          priority?: string
          responsible_name?: string | null
          responsible_phone?: string | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
          stress_level: number
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
          stress_level: number
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
          stress_level?: number
          student_name?: string
          updated_at?: string
        }
        Relationships: [
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
          video_url?: string | null
        }
        Relationships: []
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
          created_at: string
          description: string | null
          id: string
          is_global: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_global?: boolean
          name?: string
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
          created_at: string
          date: string
          description: string
          group_id: string | null
          id: string
          kind: string
          notes: string | null
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
          created_at?: string
          date?: string
          description: string
          group_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
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
          created_at?: string
          date?: string
          description?: string
          group_id?: string | null
          id?: string
          kind?: string
          notes?: string | null
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
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
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
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_training: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "coach" | "coordinator" | "student" | "viewer"
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
    },
  },
} as const
