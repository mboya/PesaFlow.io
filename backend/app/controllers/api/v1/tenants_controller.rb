module Api
  module V1
    class TenantsController < ApplicationController
      before_action :authenticate_api_v1_user!
      before_action :set_tenant, only: [ :show, :update ]
      before_action :require_manage_tenants!, only: [ :create ]

      # GET /api/v1/tenants
      def index
        if can?(:view_all_tenants)
          @tenants = ActsAsTenant.without_tenant { Tenant.all }
        else
          @tenants = [ current_user.tenant ].compact
        end

        render_enveloped(
          resource: @tenants.map { |t| tenant_json(t) },
          status_code: 200,
          message: "Tenants retrieved successfully"
        )
      end

      # GET /api/v1/tenants/:id
      def show
        return unless authorize_tenant_access!(@tenant, allow_cross_tenant_permission: :view_all_tenants)

        render_enveloped(
          resource: tenant_json(@tenant),
          status_code: 200,
          message: "Tenant retrieved successfully"
        )
      end

      # POST /api/v1/tenants
      def create
        # Use without_tenant when creating Tenant model since Tenant itself is not tenant-scoped
        @tenant = ActsAsTenant.without_tenant { Tenant.new(tenant_params) }

        saved = ActsAsTenant.without_tenant { @tenant.save }
        if saved
          audit_action!(
            action: "tenant.created",
            auditable: @tenant,
            changeset: tenant_params.to_h,
            metadata: { tenant_id: @tenant.id }
          )
          render_enveloped(
            resource: tenant_json(@tenant),
            status_code: 201,
            message: "Tenant created successfully",
            http_status: :created
          )
        else
          audit_action!(
            action: "tenant.create_failed",
            status: "failure",
            metadata: { errors: @tenant.errors.full_messages }
          )
          render_enveloped(
            resource: { errors: @tenant.errors.full_messages },
            status_code: 422,
            message: "Tenant could not be created",
            error_code: "validation_error",
            http_status: :unprocessable_entity
          )
        end
      end

      # PATCH/PUT /api/v1/tenants/:id
      def update
        return unless authorize_tenant_access!(@tenant, allow_cross_tenant_permission: :manage_tenants)

        updated = ActsAsTenant.without_tenant { @tenant.update(tenant_params) }
        if updated
          audit_action!(
            action: "tenant.updated",
            auditable: @tenant,
            changeset: tenant_params.to_h,
            metadata: { tenant_id: @tenant.id }
          )
          render_enveloped(
            resource: tenant_json(@tenant),
            status_code: 200,
            message: "Tenant updated successfully"
          )
        else
          audit_action!(
            action: "tenant.update_failed",
            status: "failure",
            auditable: @tenant,
            metadata: { tenant_id: @tenant.id, errors: @tenant.errors.full_messages }
          )
          render_enveloped(
            resource: { errors: @tenant.errors.full_messages },
            status_code: 422,
            message: "Tenant could not be updated",
            error_code: "validation_error",
            http_status: :unprocessable_entity
          )
        end
      end

      # GET /api/v1/tenants/current
      def current
        @tenant = current_user.tenant
        unless @tenant
          render_enveloped_error(
            status_code: 404,
            message: "No tenant associated with user",
            error_code: "tenant_not_found",
            http_status: :not_found
          )
          return
        end

        render_enveloped(
          resource: tenant_json(@tenant),
          status_code: 200,
          message: "Tenant retrieved successfully"
        )
      end

      private

      def tenant_params
        params.require(:tenant).permit(:name, :subdomain, :domain, :status, settings: {})
      end

      def tenant_json(tenant)
        {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          domain: tenant.domain,
          status: tenant.status,
          settings: tenant.settings,
          created_at: tenant.created_at,
          updated_at: tenant.updated_at
        }
      end

      def set_tenant
        @tenant = ActsAsTenant.without_tenant { Tenant.find(params[:id]) }
      end

      def require_manage_tenants!
        authorize_permission!(:manage_tenants)
      end
    end
  end
end
