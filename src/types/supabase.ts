export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "accounts": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"name": string,"picture_url": string | null,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id": string,"name": string,"picture_url"?: string | null,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"picture_url"?: string | null,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"assets": {
                  Row: {
                    "byte_size": number,"cdn_url": string | null,"external_url": string | null,"hash": string,"id": string,"mime_type": string,"storage_key": string,"uploaded_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "byte_size": number,"cdn_url"?: string | null,"external_url"?: string | null,"hash": string,"id"?: string,"mime_type": string,"storage_key": string,"uploaded_at"?: string
                  }
                  Update: {
                    "byte_size"?: number,"cdn_url"?: string | null,"external_url"?: string | null,"hash"?: string,"id"?: string,"mime_type"?: string,"storage_key"?: string,"uploaded_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"business_profiles": {
                  Row: {
                    "account_id": string,"address": string,"business_name": string,"city": string,"created_at": string,"logo_url": string,"order_prefix": string,"pdf_footer": string,"phone": string,"state": string,"timezone": string,"updated_at": string,"zip_code": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"address"?: string,"business_name"?: string,"city"?: string,"created_at"?: string,"logo_url"?: string,"order_prefix"?: string,"pdf_footer"?: string,"phone"?: string,"state"?: string,"timezone"?: string,"updated_at"?: string,"zip_code"?: string
                  }
                  Update: {
                    "account_id"?: string,"address"?: string,"business_name"?: string,"city"?: string,"created_at"?: string,"logo_url"?: string,"order_prefix"?: string,"pdf_footer"?: string,"phone"?: string,"state"?: string,"timezone"?: string,"updated_at"?: string,"zip_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_profiles_account_id_fkey"
      columns: ["account_id"]
isOneToOne: true
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    }
                  ]
                },"configurator_types": {
                  Row: {
                    "id": number,"label": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"label": string,"slug": string
                  }
                  Update: {
                    "id"?: never,"label"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "account_id": string,"address": string,"city": string,"created_at": string,"id": string,"name": string,"phone": string,"phone_normalized": string,"state": string,"updated_at": string,"zip_code": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"address": string,"city": string,"created_at"?: string,"id"?: string,"name": string,"phone": string,"phone_normalized": string,"state": string,"updated_at"?: string,"zip_code": string
                  }
                  Update: {
                    "account_id"?: string,"address"?: string,"city"?: string,"created_at"?: string,"id"?: string,"name"?: string,"phone"?: string,"phone_normalized"?: string,"state"?: string,"updated_at"?: string,"zip_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    }
                  ]
                },"design_styles": {
                  Row: {
                    "id": string,"name": string,"range_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"name": string,"range_id": string,"sort_order"?: number
                  }
                  Update: {
                    "id"?: string,"name"?: string,"range_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "design_styles_range_id_fkey"
      columns: ["range_id"]
isOneToOne: false
      referencedRelation: "product_ranges"
      referencedColumns: ["id"]
    }
                  ]
                },"embed_widgets": {
                  Row: {
                    "account_id": string,"brand_background_color": string,"brand_logo_url": string,"brand_name": string,"brand_phone": string,"brand_primary_color": string,"brand_text_color": string,"configurator_type_id": number,"created_at": string,"enabled": boolean,"id": string,"name": string,"public_key": string,"updated_at": string,"website_url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"brand_background_color"?: string,"brand_logo_url"?: string,"brand_name"?: string,"brand_phone"?: string,"brand_primary_color"?: string,"brand_text_color"?: string,"configurator_type_id": number,"created_at"?: string,"enabled"?: boolean,"id"?: string,"name": string,"public_key"?: string,"updated_at"?: string,"website_url"?: string
                  }
                  Update: {
                    "account_id"?: string,"brand_background_color"?: string,"brand_logo_url"?: string,"brand_name"?: string,"brand_phone"?: string,"brand_primary_color"?: string,"brand_text_color"?: string,"configurator_type_id"?: number,"created_at"?: string,"enabled"?: boolean,"id"?: string,"name"?: string,"public_key"?: string,"updated_at"?: string,"website_url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "embed_widgets_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "embed_widgets_configurator_type_id_fkey"
      columns: ["configurator_type_id"]
isOneToOne: false
      referencedRelation: "configurator_types"
      referencedColumns: ["id"]
    }
                  ]
                },"layouts": {
                  Row: {
                    "active": boolean,"created_at": string,"external_id": string | null,"features": NonNullable<Json>,"id": string,"name": string,"range_id": string,"slug": string,"squares": number | null,"style_id": string | null,"view_box": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"external_id"?: string | null,"features"?: NonNullable<Json>,"id"?: string,"name": string,"range_id": string,"slug": string,"squares"?: number | null,"style_id"?: string | null,"view_box"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"external_id"?: string | null,"features"?: NonNullable<Json>,"id"?: string,"name"?: string,"range_id"?: string,"slug"?: string,"squares"?: number | null,"style_id"?: string | null,"view_box"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "layouts_range_id_fkey"
      columns: ["range_id"]
isOneToOne: false
      referencedRelation: "product_ranges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "layouts_style_id_fkey"
      columns: ["style_id"]
isOneToOne: false
      referencedRelation: "design_styles"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "account_id": string,"created_at": string,"email": string | null,"id": string,"layout_id": string | null,"name": string | null,"phone": string | null,"session_id": string | null,"source_url": string | null,"spec": NonNullable<Json>,"status": string,"updated_at": string,"widget_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"created_at"?: string,"email"?: string | null,"id"?: string,"layout_id"?: string | null,"name"?: string | null,"phone"?: string | null,"session_id"?: string | null,"source_url"?: string | null,"spec"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"widget_id"?: string | null
                  }
                  Update: {
                    "account_id"?: string,"created_at"?: string,"email"?: string | null,"id"?: string,"layout_id"?: string | null,"name"?: string | null,"phone"?: string | null,"session_id"?: string | null,"source_url"?: string | null,"spec"?: NonNullable<Json>,"status"?: string,"updated_at"?: string,"widget_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_layout_id_fkey"
      columns: ["layout_id"]
isOneToOne: false
      referencedRelation: "layouts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "leads_widget_owner_fkey"
      columns: ["widget_id","account_id"]
isOneToOne: false
      referencedRelation: "embed_widgets"
      referencedColumns: ["id","account_id"]
    }
                  ]
                },"options": {
                  Row: {
                    "created_at": string,"description": string,"external_id": string | null,"id": string,"is_default": boolean,"metadata": NonNullable<Json>,"question_id": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"external_id"?: string | null,"id"?: string,"is_default"?: boolean,"metadata"?: NonNullable<Json>,"question_id": string,"sort_order"?: number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"external_id"?: string | null,"id"?: string,"is_default"?: boolean,"metadata"?: NonNullable<Json>,"question_id"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "options_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"order_documents": {
                  Row: {
                    "account_id": string,"checksum": string,"created_at": string,"document_type": string,"generation_metadata": NonNullable<Json>,"id": string,"order_id": string,"revision": number,"storage_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"checksum": string,"created_at"?: string,"document_type": string,"generation_metadata"?: NonNullable<Json>,"id"?: string,"order_id": string,"revision": number,"storage_key": string
                  }
                  Update: {
                    "account_id"?: string,"checksum"?: string,"created_at"?: string,"document_type"?: string,"generation_metadata"?: NonNullable<Json>,"id"?: string,"order_id"?: string,"revision"?: number,"storage_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_documents_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_documents_order_id_account_id_fkey"
      columns: ["order_id","account_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","account_id"]
    }
                  ]
                },"order_events": {
                  Row: {
                    "account_id": string,"created_at": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"next_status": string | null,"order_id": string,"previous_status": string | null,"revision": number
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"created_at"?: string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"next_status"?: string | null,"order_id": string,"previous_status"?: string | null,"revision": number
                  }
                  Update: {
                    "account_id"?: string,"created_at"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"next_status"?: string | null,"order_id"?: string,"previous_status"?: string | null,"revision"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_events_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_events_order_id_account_id_fkey"
      columns: ["order_id","account_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","account_id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "account_id": string,"catalogue_snapshot": NonNullable<Json>,"configuration": NonNullable<Json>,"created_at": string,"height_mm": number,"id": string,"inside_drawing": string | null,"layout_id": string | null,"line_number": number,"location": string,"manufacturing_snapshot": Json | null,"order_id": string,"outside_drawing": string | null,"quantity": number,"system": string,"updated_at": string,"width_mm": number
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"catalogue_snapshot"?: NonNullable<Json>,"configuration"?: NonNullable<Json>,"created_at"?: string,"height_mm": number,"id"?: string,"inside_drawing"?: string | null,"layout_id"?: string | null,"line_number": number,"location"?: string,"manufacturing_snapshot"?: Json | null,"order_id": string,"outside_drawing"?: string | null,"quantity"?: number,"system"?: string,"updated_at"?: string,"width_mm": number
                  }
                  Update: {
                    "account_id"?: string,"catalogue_snapshot"?: NonNullable<Json>,"configuration"?: NonNullable<Json>,"created_at"?: string,"height_mm"?: number,"id"?: string,"inside_drawing"?: string | null,"layout_id"?: string | null,"line_number"?: number,"location"?: string,"manufacturing_snapshot"?: Json | null,"order_id"?: string,"outside_drawing"?: string | null,"quantity"?: number,"system"?: string,"updated_at"?: string,"width_mm"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_layout_id_fkey"
      columns: ["layout_id"]
isOneToOne: false
      referencedRelation: "layouts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_order_id_account_id_fkey"
      columns: ["order_id","account_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","account_id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "account_id": string,"cancelled_at": string | null,"completed_at": string | null,"confirmed_at": string | null,"created_at": string,"customer_id": string,"customer_snapshot": NonNullable<Json>,"delivery_date": string | null,"id": string,"issued_at": string | null,"note": string,"order_number": string,"production_at": string | null,"revision": number,"sequence_number": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"cancelled_at"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"customer_id": string,"customer_snapshot": NonNullable<Json>,"delivery_date"?: string | null,"id"?: string,"issued_at"?: string | null,"note"?: string,"order_number": string,"production_at"?: string | null,"revision"?: number,"sequence_number": number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string,"cancelled_at"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"customer_id"?: string,"customer_snapshot"?: NonNullable<Json>,"delivery_date"?: string | null,"id"?: string,"issued_at"?: string | null,"note"?: string,"order_number"?: string,"production_at"?: string | null,"revision"?: number,"sequence_number"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_customer_id_account_id_fkey"
      columns: ["customer_id","account_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","account_id"]
    }
                  ]
                },"product_ranges": {
                  Row: {
                    "active": boolean,"configurator_type_id": number,"created_at": string,"id": string,"name": string,"slug": string,"source_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"configurator_type_id": number,"created_at"?: string,"id"?: string,"name": string,"slug": string,"source_url"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"configurator_type_id"?: number,"created_at"?: string,"id"?: string,"name"?: string,"slug"?: string,"source_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_ranges_configurator_type_id_fkey"
      columns: ["configurator_type_id"]
isOneToOne: false
      referencedRelation: "configurator_types"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "active": boolean,"condition": Json | null,"created_at": string,"external_id": string | null,"has_text": boolean,"id": string,"name": string,"range_id": string | null,"section_scope": string,"sort_order": number,"validation": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"condition"?: Json | null,"created_at"?: string,"external_id"?: string | null,"has_text"?: boolean,"id"?: string,"name": string,"range_id"?: string | null,"section_scope"?: string,"sort_order"?: number,"validation"?: NonNullable<Json>
                  }
                  Update: {
                    "active"?: boolean,"condition"?: Json | null,"created_at"?: string,"external_id"?: string | null,"has_text"?: boolean,"id"?: string,"name"?: string,"range_id"?: string | null,"section_scope"?: string,"sort_order"?: number,"validation"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_range_id_fkey"
      columns: ["range_id"]
isOneToOne: false
      referencedRelation: "product_ranges"
      referencedColumns: ["id"]
    }
                  ]
                },"widget_views": {
                  Row: {
                    "account_id": string,"created_at": string,"id": string,"session_id": string,"widget_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"created_at"?: string,"id"?: string,"session_id": string,"widget_id": string
                  }
                  Update: {
                    "account_id"?: string,"created_at"?: string,"id"?: string,"session_id"?: string,"widget_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "widget_views_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "widget_views_widget_id_account_id_fkey"
      columns: ["widget_id","account_id"]
isOneToOne: false
      referencedRelation: "embed_widgets"
      referencedColumns: ["id","account_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_account":
{ Args: Record<PropertyKey, never>; Returns: {
              "created_at": string,
"email": string | null,
"id": string,
"name": string,
"picture_url": string | null,
"role": string,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "accounts"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"storage": {
          Tables: {
            "bucket_lifecycle_states": {
                  Row: {
                    "bucket_id": string,"claim_id": string | null,"claim_until": string | null,"continuation": Json | null,"failure_count": number,"generation": string | null,"last_completed_at": string | null,"last_error": Json | null,"last_result": Json | null,"last_started_at": string | null,"last_success_at": string | null,"next_run_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"claim_id"?: string | null,"claim_until"?: string | null,"continuation"?: Json | null,"failure_count"?: number,"generation"?: string | null,"last_completed_at"?: string | null,"last_error"?: Json | null,"last_result"?: Json | null,"last_started_at"?: string | null,"last_success_at"?: string | null,"next_run_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bucket_id"?: string,"claim_id"?: string | null,"claim_until"?: string | null,"continuation"?: Json | null,"failure_count"?: number,"generation"?: string | null,"last_completed_at"?: string | null,"last_error"?: Json | null,"last_result"?: Json | null,"last_started_at"?: string | null,"last_success_at"?: string | null,"next_run_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bucket_lifecycle_states_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: true
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    }
                  ]
                },"buckets": {
                  Row: {
                    "allowed_mime_types": (string)[] | null,"avif_autodetection": boolean | null,"created_at": string | null,"file_size_limit": number | null,"id": string,"lifecycle_configuration": Json | null,"lifecycle_configuration_generation": string | null,"name": string,"owner": string | null,"owner_id": string | null,"public": boolean | null,"type": Database["storage"]['Enums']["buckettype"],"updated_at": string | null,"versioning_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed_mime_types"?: (string)[] | null,"avif_autodetection"?: boolean | null,"created_at"?: string | null,"file_size_limit"?: number | null,"id": string,"lifecycle_configuration"?: Json | null,"lifecycle_configuration_generation"?: string | null,"name": string,"owner"?: string | null,"owner_id"?: string | null,"public"?: boolean | null,"type"?: Database["storage"]['Enums']["buckettype"],"updated_at"?: string | null,"versioning_status"?: string
                  }
                  Update: {
                    "allowed_mime_types"?: (string)[] | null,"avif_autodetection"?: boolean | null,"created_at"?: string | null,"file_size_limit"?: number | null,"id"?: string,"lifecycle_configuration"?: Json | null,"lifecycle_configuration_generation"?: string | null,"name"?: string,"owner"?: string | null,"owner_id"?: string | null,"public"?: boolean | null,"type"?: Database["storage"]['Enums']["buckettype"],"updated_at"?: string | null,"versioning_status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"buckets_analytics": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"format": string,"id": string,"name": string,"type": Database["storage"]['Enums']["buckettype"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"format"?: string,"id"?: string,"name": string,"type"?: Database["storage"]['Enums']["buckettype"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"format"?: string,"id"?: string,"name"?: string,"type"?: Database["storage"]['Enums']["buckettype"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"buckets_vectors": {
                  Row: {
                    "created_at": string,"id": string,"type": Database["storage"]['Enums']["buckettype"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"type"?: Database["storage"]['Enums']["buckettype"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"type"?: Database["storage"]['Enums']["buckettype"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"iceberg_namespaces": {
                  Row: {
                    "bucket_name": string,"catalog_id": string,"created_at": string,"id": string,"metadata": NonNullable<Json>,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_name": string,"catalog_id": string,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "bucket_name"?: string,"catalog_id"?: string,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
      columns: ["catalog_id"]
isOneToOne: false
      referencedRelation: "buckets_analytics"
      referencedColumns: ["id"]
    }
                  ]
                },"iceberg_tables": {
                  Row: {
                    "bucket_name": string,"catalog_id": string,"created_at": string,"id": string,"location": string,"name": string,"namespace_id": string,"remote_table_id": string | null,"shard_id": string | null,"shard_key": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_name": string,"catalog_id": string,"created_at"?: string,"id"?: string,"location": string,"name": string,"namespace_id": string,"remote_table_id"?: string | null,"shard_id"?: string | null,"shard_key"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "bucket_name"?: string,"catalog_id"?: string,"created_at"?: string,"id"?: string,"location"?: string,"name"?: string,"namespace_id"?: string,"remote_table_id"?: string | null,"shard_id"?: string | null,"shard_key"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "iceberg_tables_catalog_id_fkey"
      columns: ["catalog_id"]
isOneToOne: false
      referencedRelation: "buckets_analytics"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "iceberg_tables_namespace_id_fkey"
      columns: ["namespace_id"]
isOneToOne: false
      referencedRelation: "iceberg_namespaces"
      referencedColumns: ["id"]
    }
                  ]
                },"lifecycle_abandoned_artifacts": {
                  Row: {
                    "attempted_at": string,"bucket_id": string,"key": string,"name": string,"version": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"bucket_id": string,"key": string,"name": string,"version"?: string | null
                  }
                  Update: {
                    "attempted_at"?: string,"bucket_id"?: string,"key"?: string,"name"?: string,"version"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"migrations": {
                  Row: {
                    "executed_at": string | null,"hash": string,"id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "executed_at"?: string | null,"hash": string,"id": number,"name": string
                  }
                  Update: {
                    "executed_at"?: string | null,"hash"?: string,"id"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"objects": {
                  Row: {
                    "archived_at": string | null,"bucket_id": string | null,"created_at": string | null,"id": string,"is_delete_marker": boolean,"is_versioned": boolean,"last_accessed_at": string | null,"metadata": Json | null,"name": string | null,"owner": string | null,"owner_id": string | null,"path_tokens": (string)[] | null,"updated_at": string | null,"user_metadata": Json | null,"version": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"is_delete_marker"?: boolean,"is_versioned"?: boolean,"last_accessed_at"?: string | null,"metadata"?: Json | null,"name"?: string | null,"owner"?: string | null,"owner_id"?: string | null,"path_tokens"?: never,"updated_at"?: string | null,"user_metadata"?: Json | null,"version"?: string | null
                  }
                  Update: {
                    "archived_at"?: string | null,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"is_delete_marker"?: boolean,"is_versioned"?: boolean,"last_accessed_at"?: string | null,"metadata"?: Json | null,"name"?: string | null,"owner"?: string | null,"owner_id"?: string | null,"path_tokens"?: never,"updated_at"?: string | null,"user_metadata"?: Json | null,"version"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "objects_bucketId_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    }
                  ]
                },"s3_multipart_uploads": {
                  Row: {
                    "bucket_id": string,"created_at": string,"id": string,"in_progress_size": number,"key": string,"metadata": Json | null,"owner_id": string | null,"upload_signature": string,"user_metadata": Json | null,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"created_at"?: string,"id": string,"in_progress_size"?: number,"key": string,"metadata"?: Json | null,"owner_id"?: string | null,"upload_signature": string,"user_metadata"?: Json | null,"version": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string,"id"?: string,"in_progress_size"?: number,"key"?: string,"metadata"?: Json | null,"owner_id"?: string | null,"upload_signature"?: string,"user_metadata"?: Json | null,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    }
                  ]
                },"s3_multipart_uploads_parts": {
                  Row: {
                    "bucket_id": string,"created_at": string,"etag": string,"id": string,"key": string,"owner_id": string | null,"part_number": number,"size": number,"upload_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"created_at"?: string,"etag": string,"id"?: string,"key": string,"owner_id"?: string | null,"part_number": number,"size"?: number,"upload_id": string,"version": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string,"etag"?: string,"id"?: string,"key"?: string,"owner_id"?: string | null,"part_number"?: number,"size"?: number,"upload_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
      columns: ["upload_id"]
isOneToOne: false
      referencedRelation: "s3_multipart_uploads"
      referencedColumns: ["id"]
    }
                  ]
                },"vector_indexes": {
                  Row: {
                    "bucket_id": string,"created_at": string,"data_type": string,"dimension": number,"distance_metric": string,"id": string,"metadata_configuration": Json | null,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"created_at"?: string,"data_type": string,"dimension": number,"distance_metric": string,"id"?: string,"metadata_configuration"?: Json | null,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string,"data_type"?: string,"dimension"?: number,"distance_metric"?: string,"id"?: string,"metadata_configuration"?: Json | null,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vector_indexes_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets_vectors"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "allow_any_operation":
{ Args: { "expected_operations": (string)[] }; Returns: boolean
                           },
"allow_only_operation":
{ Args: { "expected_operation": string }; Returns: boolean
                           },
"can_insert_object":
{ Args: { "bucketid": string,"metadata": Json,"name": string,"owner": string }; Returns: undefined
                           },
"delete_lifecycle_objects":
{ Args: { "object_ids": (string)[] }; Returns: {
              "id": string,"is_delete_marker": boolean,"metadata": Json
            }[]
                           },
"extension":
{ Args: { "name": string }; Returns: string
                           },
"filename":
{ Args: { "name": string }; Returns: string
                           },
"foldername":
{ Args: { "name": string }; Returns: (string)[]
                           },
"get_common_prefix":
{ Args: { "p_delimiter": string,"p_key": string,"p_prefix": string }; Returns: string
                           },
"get_size_by_bucket":
{ Args: { "delete_markers"?: string,"noncurrent_versions"?: string }; Returns: {
              "bucket_id": string,"size": number
            }[]
                           },
"list_multipart_uploads_with_delimiter":
{ Args: { "bucket_id": string,"delimiter_param": string,"max_keys"?: number,"next_key_token"?: string,"next_upload_token"?: string,"prefix_param": string,"raw_prefix_param"?: string }; Returns: {
              "created_at": string,"id": string,"key": string
            }[]
                           },
"list_objects_with_delimiter":
{ Args: { "_bucket_id": string,"delete_markers"?: string,"delimiter_param": string,"max_keys"?: number,"next_token"?: string,"next_token_archived_at"?: string,"next_token_version"?: string,"noncurrent_versions"?: string,"prefix_param": string,"sort_order"?: string,"start_after"?: string }; Returns: {
              "archived_at": string,"created_at": string,"id": string,"is_delete_marker": boolean,"is_versioned": boolean,"last_accessed_at": string,"metadata": Json,"name": string,"updated_at": string,"version": string
            }[]
                           },
"operation":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"reconcile_lifecycle_state":
{ Args: { "policy_changed": boolean,"target_bucket_id": string }; Returns: undefined
                           },
"search":
{ Args: { "bucketname": string,"delete_markers"?: string,"levels"?: number,"limits"?: number,"noncurrent_versions"?: string,"offsets"?: number,"prefix": string,"search"?: string,"sortcolumn"?: string,"sortorder"?: string }; Returns: {
              "archived_at": string,"created_at": string,"id": string,"is_delete_marker": boolean,"is_versioned": boolean,"last_accessed_at": string,"metadata": Json,"name": string,"updated_at": string,"version": string
            }[]
                           },
"search_by_timestamp":
{ Args: { "delete_markers"?: string,"noncurrent_versions"?: string,"p_bucket_id": string,"p_level": number,"p_limit": number,"p_prefix": string,"p_sort_column": string,"p_sort_column_after": string,"p_sort_order": string,"p_start_after": string,"p_start_after_version"?: string }; Returns: {
              "archived_at": string,"created_at": string,"id": string,"is_delete_marker": boolean,"is_versioned": boolean,"key": string,"last_accessed_at": string,"metadata": Json,"name": string,"updated_at": string,"version": string
            }[]
                           },
"search_v2":
{ Args: { "bucket_name": string,"delete_markers"?: string,"levels"?: number,"limits"?: number,"noncurrent_versions"?: string,"prefix": string,"sort_column"?: string,"sort_column_after"?: string,"sort_order"?: string,"start_after"?: string,"start_after_archived_at"?: string,"start_after_is_continuation"?: boolean,"start_after_version"?: string }; Returns: {
              "archived_at": string,"created_at": string,"id": string,"is_delete_marker": boolean,"is_versioned": boolean,"key": string,"last_accessed_at": string,"metadata": Json,"name": string,"updated_at": string,"version": string
            }[]
                           }
          }
          Enums: {
            "buckettype": "STANDARD"|"ANALYTICS"|"VECTOR"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        },"storage": {
          Enums: {
            "buckettype": ["STANDARD", "ANALYTICS", "VECTOR"]
          }
        }
} as const
