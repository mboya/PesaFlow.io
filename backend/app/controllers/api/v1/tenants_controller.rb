module Api
  module V1
    class TenantsController < ApplicationController
      before_action :authenticate_api_v1_user!
      before_action :authorize_admin, only: [ :create, :update, :destroy ]

      # GET /api/v1/tenants
      def index
        # Only admins can list all tenants
        # Regular users can only see their own tenant
        # Use without_tenant when querying Tenant model since Tenant itself is not tenant-scoped
        if current_user.admin?
          @tenants = ActsAsTenant.without_tenant { Tenant.all }
        else
          @tenants = [ current_user.tenant ].compact
        end

        render json: @tenants.map { |t| tenant_json(t) }
      end

      # GET /api/v1/tenants/:id
      def show
        @tenant = ActsAsTenant.without_tenant { Tenant.find(params[:id]) }

        # Users can only view their own tenant unless they're admin
        unless current_user.admin? || current_user.tenant == @tenant
          return render json: { error: "Unauthorized" }, status: :unauthorized
        end

        render json: tenant_json(@tenant)
      end

      # POST /api/v1/tenants
      def create
        # Use without_tenant when creating Tenant model since Tenant itself is not tenant-scoped
        @tenant = ActsAsTenant.without_tenant { Tenant.new(tenant_params) }

        if @tenant.save
          render json: tenant_json(@tenant), status: :created
        else
          render json: { errors: @tenant.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /api/v1/tenants/:id
      def update
        @tenant = ActsAsTenant.without_tenant { Tenant.find(params[:id]) }

        # Users can only update their own tenant unless they're admin
        unless current_user.admin? || current_user.tenant == @tenant
          return render json: { error: "Unauthorized" }, status: :unauthorized
        end

        if @tenant.update(tenant_params)
          render json: tenant_json(@tenant)
        else
          render json: { errors: @tenant.errors.full_messages }, status: :unprocessable_entity
        end
      end

      # GET /api/v1/tenants/current
      def current
        @tenant = current_user.tenant
        return render json: { error: "No tenant associated with user" }, status: :not_found unless @tenant

        render json: tenant_json(@tenant)
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

      def authorize_admin
        unless current_user.admin?
          render json: { error: "Admin access required" }, status: :forbidden
        end
      end
    end
  end
end
